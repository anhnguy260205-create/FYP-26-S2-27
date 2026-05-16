from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
import json
import asyncio
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from dotenv import load_dotenv
from typing import Dict, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

connected_clients: Dict[WebSocket, asyncio.Lock] = {}
clients_lock = asyncio.Lock()
finnhub_task: Optional[asyncio.Task] = None

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

# Get the market status 
def get_market_status():
    eastern = ZoneInfo("America/New_York")
    now = datetime.now(eastern)
    current_time = now.time()
    market_open = current_time >= datetime.strptime("09:30", "%H:%M").time()
    market_close = current_time <= datetime.strptime("16:00", "%H:%M").time()
    weekday = now.weekday() < 5
    if weekday and market_open and market_close:
        return "OPEN"

    return "CLOSED"

# Get historical data 
def get_candles(symbol: str, resolution="5", days=1):
    import time
    now = int(time.time())
    from_ts = now - (60 * 60 * 8)  # last 8 hours
    
    query = urlencode({
        "symbol": symbol,
        "resolution": resolution,  # 5min candles
        "from": from_ts,
        "to": now,
        "token": FINNHUB_API_KEY
    })
    url = f"https://finnhub.io/api/v1/stock/candle?{query}"
    with urlopen(url, timeout=10) as r:
        data = json.loads(r.read().decode())
    
    if data.get("s") != "ok":
        return []
    
    return [
        {"time": t, "open": o, "high": h, "low": l, "close": c, "volume": v}
        for t, o, h, l, c, v in zip(
            data["t"], data["o"], data["h"], data["l"], data["c"], data["v"]
        )
    ]

async def send_closing_prices(websocket: WebSocket):
    quotes = await asyncio.gather(
        *[
            asyncio.to_thread(get_stock_quote, symbol)
            for symbol in stock_pool
        ]
    )
    
    candles = await asyncio.gather(*[
        asyncio.to_thread(get_candles, s) for s in stock_pool
    ])

    await send_json_to_client(websocket, {
        "type": "snapshot",
        "data": quotes,
        "candles": { stock_pool[i]: candles[i] for i in range(len(stock_pool)) }
    })

async def register_client(websocket: WebSocket):
    async with clients_lock:
        connected_clients[websocket] = asyncio.Lock()

async def unregister_client(websocket: WebSocket):
    global finnhub_task

    async with clients_lock:
        connected_clients.pop(websocket, None)

        if not connected_clients and finnhub_task:
            finnhub_task.cancel()
            finnhub_task = None

async def send_to_client(websocket: WebSocket, message: str):
    async with clients_lock:
        send_lock = connected_clients.get(websocket)

    if not send_lock:
        return

    async with send_lock:
        await websocket.send_text(message)

async def send_json_to_client(websocket: WebSocket, message: dict):
    async with clients_lock:
        send_lock = connected_clients.get(websocket)

    if not send_lock:
        return

    async with send_lock:
        await websocket.send_json(message)

async def broadcast_to_clients(message: str):
    async with clients_lock:
        clients = list(connected_clients.keys())

    disconnected_clients = []

    for websocket in clients:
        try:
            await send_to_client(websocket, message)
        except Exception:
            disconnected_clients.append(websocket)

    for websocket in disconnected_clients:
        await unregister_client(websocket)

async def run_finnhub_connection():
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
                for symbol in stock_pool:
                    subscribe_message = {
                        "type": "subscribe",
                        "symbol": symbol
                    }
                    await finnhub_ws.send(
                        json.dumps(subscribe_message)
                    )
                while True:
                    async with clients_lock:
                        has_clients = bool(connected_clients)

                    if not has_clients:
                        return

                    data = await finnhub_ws.recv()

                    print(data)

                    await broadcast_to_clients(data)

        except asyncio.CancelledError:
            print("Finnhub websocket stopped")
            raise

        except Exception as e:
            print("Finnhub Error:", e)

            await broadcast_to_clients(json.dumps({
                "type": "error",
                "message": str(e)
            }))

            await asyncio.sleep(5)

async def ensure_finnhub_connection():
    global finnhub_task

    async with clients_lock:
        if not finnhub_task or finnhub_task.done():
            finnhub_task = asyncio.create_task(run_finnhub_connection())


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

    await register_client(websocket)

    try:
        await send_closing_prices(websocket)
        await send_json_to_client(websocket, {
          "type": "market_status",
          "status": get_market_status()
        })
        await ensure_finnhub_connection()

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        print("Frontend websocket disconnected")

    finally:
        await unregister_client(websocket)
