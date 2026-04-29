import json
import logging
import threading
import time
from collections import deque
from typing import Deque, Dict, List, Optional

import serial

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_HISTORY_SIZE = 100


class ArduinoSerialReader:
    def __init__(self, port: str = "COM7", baudrate: int = 115200, history_size: int = DEFAULT_HISTORY_SIZE):
        self.port = port
        self.baudrate = baudrate
        self.history_size = history_size
        self.serial = None
        self.thread = None
        self.running = False
        self.is_connected = False
        self._latest: Optional[Dict] = None
        self._history: Deque[Dict] = deque(maxlen=history_size)
        self._lock = threading.Lock()

    def start(self):
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        logger.info("Iniciando lectura de Arduino en %s @%d", self.port, self.baudrate)

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)
        if self.serial and self.serial.is_open:
            self.serial.close()
        logger.info("Lectura de Arduino detenida")

    def _open_serial(self):
        try:
            self.serial = serial.Serial(self.port, self.baudrate, timeout=1)
            self.is_connected = True
            logger.info("Conectado a %s", self.port)
        except Exception as exc:
            self.is_connected = False
            self.serial = None
            logger.warning("No se pudo conectar a %s: %s", self.port, exc)

    def _read_loop(self):
        self._open_serial()
        while self.running:
            if not self.serial or not self.serial.is_open:
                time.sleep(1)
                self._open_serial()
                continue

            try:
                raw_line = self.serial.readline().decode("utf-8", errors="ignore").strip()
                if not raw_line:
                    continue

                parsed = self._parse_line(raw_line)
                entry = {
                    "timestamp": time.time(),
                    "raw": raw_line,
                    "parsed": parsed,
                }

                with self._lock:
                    self._latest = entry
                    self._history.appendleft(entry)

            except Exception as exc:
                logger.warning("Error leyendo serial: %s", exc)
                self.is_connected = False
                if self.serial:
                    try:
                        self.serial.close()
                    except Exception:
                        pass
                time.sleep(1)

    def _parse_line(self, line: str) -> Dict[str, object]:
        if line.startswith("{") and line.endswith("}"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                logger.debug("No se pudo parsear JSON: %s", line)

        if "," in line:
            values = [item.strip() for item in line.split(",")]
            return {f"field_{i+1}": self._parse_value(value) for i, value in enumerate(values)}

        return {"value": self._parse_value(line)}

    @staticmethod
    def _parse_value(value: str):
        if value.isdigit():
            return int(value)
        try:
            return float(value)
        except ValueError:
            return value

    def get_latest(self) -> Optional[Dict]:
        with self._lock:
            return self._latest.copy() if self._latest else None

    def get_history(self, limit: int = 20) -> List[Dict]:
        with self._lock:
            return list(self._history)[:limit]
