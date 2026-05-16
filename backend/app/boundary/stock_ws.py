from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
import json
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

stock_pool = [
    "AAPL",
    "TSLA",
    "NVDA",
    "MSFT",
    "GOOGL",
    "AMZN",
    "META",
    "AMD",
    "NFLX",
    "INTC"
]

@router.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):

    await websocket.accept()

    if not FINNHUB_API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "Missing FINNHUB_API_KEY in backend .env"
        })
        await websocket.close()
        return

    while True:

        try:

            finnhub_url = (
                f"wss://ws.finnhub.io?token={FINNHUB_API_KEY}"
            )

            async with websockets.connect(
                finnhub_url,
                ping_interval=20,
                ping_timeout=20
            ) as finnhub_ws:

                print("Connected to Finnhub")

                # Subscribe to stocks
                for symbol in stock_pool:

                    subscribe_message = {
                        "type": "subscribe",
                        "symbol": symbol
                    }

                    await finnhub_ws.send(
                        json.dumps(subscribe_message)
                    )

                # Receive live data
                while True:

                    data = await finnhub_ws.recv()

                    print(data)

                    await websocket.send_text(data)

        except WebSocketDisconnect:
            print("Frontend websocket disconnected")
            break

        except Exception as e:

            print("Finnhub Error:", e)

            try:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
            except RuntimeError:
                break

            # reconnect delay
            await asyncio.sleep(5)
