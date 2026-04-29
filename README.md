# arduinoXp

Servidor JSON para Arduino Esplora

Este repositorio contiene un servidor HTTP en Python que lee datos desde un Arduino Esplora conectado en el puerto serie `COM7` y expone los valores en formato JSON.

## Archivos principales

- `app.py`: servidor FastAPI que ofrece las rutas `/health`, `/data` y `/history`.
- `serial_reader.py`: lector de datos serie en segundo plano.
- `allData2Serial.ino`: ejemplo de sketch Arduino que envía datos del Esplora en formato JSON.
- `requirements.txt`: dependencias Python.

## Instalación

1. Crear un entorno virtual:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Instalar dependencias:

```bash
pip install -r requirements.txt
```

## Ejecución

Por defecto el servidor intenta conectar con `COM7`.

```bash
python app.py
```

Si trabajas en Linux o tu puerto es distinto, puedes usar la variable de entorno `SERIAL_PORT`:

```bash
SERIAL_PORT=/dev/ttyUSB0 python app.py
```

También puedes ajustar la velocidad de baudios:

```bash
SERIAL_BAUD=115200 python app.py
```

## Endpoints disponibles

- `GET /health`: devuelve estado del servidor y puerto serie.
- `GET /data`: devuelve el último registro leído.
- `GET /history?limit=20`: devuelve historial de lecturas recientes.

## Uso desde apps externas

Tu aplicación puede consumir la API con peticiones HTTP y procesar la respuesta JSON.

Ejemplo:

```bash
curl http://localhost:8000/data
```

## Arduino

El sketch `allData2Serial.ino` envía datos en formato JSON por el puerto serie. Compílalo y súbelo al Arduino Esplora para que el servidor pueda leer los valores.
