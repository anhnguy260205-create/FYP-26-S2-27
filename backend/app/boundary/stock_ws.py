from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
import json
import asyncio
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
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

def get_stock_quote(symbol: str):
    query = urlencode({
        "symbol": symbol,
        "token": FINNHUB_API_KEY
    })
    url = f"https://finnhub.io/api/v1/quote?{query}"

    with urlopen(url, timeout=10) as response:
        quote = json.loads(response.read().decode("utf-8"))

    return {
        "s": symbol,
        "p": quote.get("c"),
        "close": quote.get("c"),
        "previousClose": quote.get("pc"),
        "open": quote.get("o"),
        "high": quote.get("h"),
        "low": quote.get("l"),
        "volume": None
    }

async def send_closing_prices(websocket: WebSocket):
    quotes = await asyncio.gather(
        *[
            asyncio.to_thread(get_stock_quote, symbol)
            for symbol in stock_pool
        ]
    )

    await websocket.send_json({
        "type": "snapshot",
        "data": quotes
    })

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

            await send_closing_prices(websocket)

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
