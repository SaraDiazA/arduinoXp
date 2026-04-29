import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from serial_reader import ArduinoSerialReader

SERIAL_PORT = os.getenv("SERIAL_PORT", "COM7")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "115200"))

reader = ArduinoSerialReader(port=SERIAL_PORT, baudrate=SERIAL_BAUD)

app = FastAPI(
    title="Arduino Esplora JSON API",
    description="Servidor que expone datos del Arduino Esplora vía JSON sobre HTTP.",
    version="1.0.0",
)


@app.on_event("startup")
def startup_event():
    reader.start()


@app.on_event("shutdown")
def shutdown_event():
    reader.stop()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "serial_port": SERIAL_PORT,
        "serial_baud": SERIAL_BAUD,
        "connected": reader.is_connected,
    }


@app.get("/data")
def data():
    latest = reader.get_latest()
    if latest is None:
        raise HTTPException(status_code=503, detail="No hay datos disponibles todavía")
    return latest


@app.get("/history")
def history(limit: int = 20):
    history_data = reader.get_history(limit)
    return {
        "count": len(history_data),
        "limit": limit,
        "history": history_data,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info")
