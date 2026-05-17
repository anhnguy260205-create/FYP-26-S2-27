from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
import json
import asyncio
import os
from pathlib import Path
from urllib.request import urlopen, Request
from dotenv import load_dotenv
from typing import Dict, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter()

ALPACA_API_KEY    = os.getenv("ALPACA_API_KEY")
ALPACA_API_SECRET = os.getenv("ALPACA_API_SECRET")

# Alpaca endpoints
ALPACA_DATA_REST_URL = "https://data.alpaca.markets/v2/stocks"
ALPACA_DATA_WS_URL   = "wss://stream.data.alpaca.markets/v2/iex"  # free tier (IEX feed)
# Paid SIP feed: wss://stream.data.alpaca.markets/v2/sip

connected_clients: Dict[WebSocket, asyncio.Lock] = {}
clients_lock = asyncio.Lock()
alpaca_task: Optional[asyncio.Task] = None

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


def get_stock_snapshot(symbol: str) -> dict:
    """
    Fetch latest snapshot for a symbol via Alpaca REST API.
    Returns OHLCV + previous close — same shape as the old Finnhub quote.
    """
    url = f"{ALPACA_DATA_REST_URL}/{symbol}/snapshot?feed=iex"
    req = Request(url, headers={
        "APCA-API-KEY-ID":     ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
    })
    with urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))

    # Alpaca snapshot structure
    daily_bar  = data.get("dailyBar")  or {}
    prev_bar   = data.get("prevDailyBar") or {}
    latest_trade = data.get("latestTrade") or {}

    return {
        "s":             symbol,
        "p":             latest_trade.get("p"),        # latest trade price
        "close":         daily_bar.get("c"),            # today's close / latest close
        "previousClose": prev_bar.get("c"),             # previous day close
        "open":          daily_bar.get("o"),
        "high":          daily_bar.get("h"),
        "low":           daily_bar.get("l"),
        "volume":        daily_bar.get("v"),
    }


def get_market_status() -> str:
    eastern = ZoneInfo("America/New_York")
    now = datetime.now(eastern)
    current_time = now.time()
    market_open  = current_time >= datetime.strptime("09:30", "%H:%M").time()
    market_close = current_time <= datetime.strptime("16:00", "%H:%M").time()
    weekday = now.weekday() < 5
    if weekday and market_open and market_close:
        return "OPEN"
    return "CLOSED"


# ── Client management ────────────────────────────────────────────────────────

async def register_client(websocket: WebSocket):
    async with clients_lock:
        connected_clients[websocket] = asyncio.Lock()

async def unregister_client(websocket: WebSocket):
    global alpaca_task
    async with clients_lock:
        connected_clients.pop(websocket, None)
        if not connected_clients and alpaca_task:
            alpaca_task.cancel()
            alpaca_task = None

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

    disconnected = []
    for websocket in clients:
        try:
            await send_to_client(websocket, message)
        except Exception:
            disconnected.append(websocket)

    for websocket in disconnected:
        await unregister_client(websocket)


# ── Snapshot on connect ───────────────────────────────────────────────────────

async def send_snapshot_prices(websocket: WebSocket):
    """Fetch REST snapshots for all symbols and send as initial payload."""
    quotes = await asyncio.gather(
        *[asyncio.to_thread(get_stock_snapshot, symbol) for symbol in stock_pool]
    )
    await send_json_to_client(websocket, {
        "type": "snapshot",
        "data": quotes
    })


# ── Alpaca WebSocket streaming ────────────────────────────────────────────────

async def run_alpaca_connection():
    """
    Maintain a persistent connection to Alpaca's data stream.
    Authenticates, subscribes to trades + bars for every symbol in stock_pool,
    then relays incoming messages to all connected frontend clients.

    Alpaca message types:
      T="t"  → trade tick  { S, p, s, t, ... }
      T="b"  → minute bar  { S, o, h, l, c, v, t }
      T="q"  → quote       { S, bp, ap, bs, as, t }
    """
    while True:
        try:
            async with websockets.connect(
                ALPACA_DATA_WS_URL,
                ping_interval=20,
                ping_timeout=20,
            ) as alpaca_ws:
                print("Connected to Alpaca data stream")

                # 1. Authenticate
                await alpaca_ws.send(json.dumps({
                    "action": "auth",
                    "key":    ALPACA_API_KEY,
                    "secret": ALPACA_API_SECRET,
                }))
                auth_resp = await alpaca_ws.recv()
                print("Alpaca auth response:", auth_resp)

                # 2. Subscribe to trades + minute bars for all symbols
                await alpaca_ws.send(json.dumps({
                    "action": "subscribe",
                    "trades": stock_pool,
                    "bars":   stock_pool,   # real-time minute bars (OHLCV)
                }))
                sub_resp = await alpaca_ws.recv()
                print("Alpaca subscription response:", sub_resp)

                # 3. Stream messages to frontend clients
                while True:
                    async with clients_lock:
                        has_clients = bool(connected_clients)
                    if not has_clients:
                        return

                    raw = await alpaca_ws.recv()
                    messages = json.loads(raw)   # Alpaca sends a JSON array

                    for msg in messages:
                        msg_type = msg.get("T")

                        if msg_type == "t":
                            # Real-time trade tick — map to frontend-friendly shape
                            outbound = {
                                "type": "trade",
                                "data": {
                                    "s": msg.get("S"),
                                    "p": msg.get("p"),   # price
                                    "v": msg.get("s"),   # size/volume
                                    "t": msg.get("t"),   # timestamp
                                }
                            }
                            await broadcast_to_clients(json.dumps(outbound))

                        elif msg_type == "b":
                            # Minute bar — full OHLCV candle for charting
                            outbound = {
                                "type": "bar",
                                "data": {
                                    "s":      msg.get("S"),
                                    "open":   msg.get("o"),
                                    "high":   msg.get("h"),
                                    "low":    msg.get("l"),
                                    "close":  msg.get("c"),
                                    "volume": msg.get("v"),
                                    "t":      msg.get("t"),
                                }
                            }
                            await broadcast_to_clients(json.dumps(outbound))

                        elif msg_type == "error":
                            print("Alpaca stream error:", msg)
                            await broadcast_to_clients(json.dumps({
                                "type":    "error",
                                "message": msg.get("msg", "Unknown Alpaca error"),
                            }))

        except asyncio.CancelledError:
            print("Alpaca WebSocket task cancelled")
            raise

        except Exception as e:
            print("Alpaca connection error:", e)
            await broadcast_to_clients(json.dumps({
                "type":    "error",
                "message": str(e),
            }))
            await asyncio.sleep(5)   # back-off before reconnect


async def ensure_alpaca_connection():
    global alpaca_task
    async with clients_lock:
        if not alpaca_task or alpaca_task.done():
            alpaca_task = asyncio.create_task(run_alpaca_connection())


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/stocks")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    if not ALPACA_API_KEY or not ALPACA_API_SECRET:
        await websocket.send_json({
            "type":    "error",
            "message": "Missing ALPACA_API_KEY or ALPACA_API_SECRET in backend .env",
        })
        await websocket.close()
        return

    await register_client(websocket)

    try:
        # Send REST snapshot immediately so the chart loads without waiting
        await send_snapshot_prices(websocket)

        # Inform frontend of current market status
        await send_json_to_client(websocket, {
            "type":   "market_status",
            "status": get_market_status(),
        })

        # Start (or reuse) the shared Alpaca stream
        await ensure_alpaca_connection()

        # Keep connection alive — frontend can send pings or control messages here
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        print("Frontend WebSocket disconnected")

    finally:
        await unregister_client(websocket)
