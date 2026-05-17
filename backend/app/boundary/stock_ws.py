from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
import json
import asyncio
import os
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from dotenv import load_dotenv
from typing import Dict, Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import yfinance as yf
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter()

ALPACA_API_KEY    = os.getenv("ALPACA_API_KEY")
ALPACA_API_SECRET = os.getenv("ALPACA_API_SECRET")

ALPACA_DATA_REST_URL = "https://data.alpaca.markets/v2/stocks"
ALPACA_DATA_WS_URL   = "wss://stream.data.alpaca.markets/v2/iex"
# Paid SIP feed: wss://stream.data.alpaca.markets/v2/sip

connected_clients: Dict[WebSocket, asyncio.Lock] = {}
clients_lock = asyncio.Lock()
alpaca_task: Optional[asyncio.Task] = None

stock_pool = [
    "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL",
    "AMZN", "META", "AMD",  "NFLX", "INTC"
]


def alpaca_headers() -> dict:
    return {
        "APCA-API-KEY-ID":     ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
    }


# ── Market status ─────────────────────────────────────────────────────────────

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


# ── yfinance helpers (market CLOSED) ─────────────────────────────────────────

def get_snapshot_yfinance(symbol: str) -> dict:
    """
    Use yfinance to get latest price info when market is closed.
    Returns the same shape as the Alpaca snapshot so the frontend
    doesn't need to know which source was used.
    """
    ticker = yf.Ticker(symbol)
    info   = ticker.fast_info   # lightweight, no heavy fundamentals

    return {
        "s":             symbol,
        "p":             getattr(info, "last_price",         None),
        "close":         getattr(info, "last_price",         None),
        "previousClose": getattr(info, "previous_close",     None),
        "open":          getattr(info, "open",                None),
        "high":          getattr(info, "day_high",            None),
        "low":           getattr(info, "day_low",             None),
        "volume":        getattr(info, "last_volume",         None),
    }


def get_historical_bars_yfinance(symbol: str, limit: int = 30) -> list:
    """
    Fetch the last `limit` 1-hour bars via yfinance.
    Used to seed sparklines when the market is closed.
    Returns list of { time (ms), open, high, low, close, volume }.
    """


    ticker = yf.Ticker(symbol)
    # period="7d" + interval="1h" gives ~42 trading hours (plenty for 30 bars)
    df = ticker.history(period="7d", interval="1h")

    if df.empty:
        return []

    # Take the last `limit` rows
    df = df.tail(limit).reset_index()

    bars = []
    for _, row in df.iterrows():
        # The index column is named "Datetime" for intraday data
        dt = row.get("Datetime") or row.get("Date")
        if dt is None:
            continue

        # Convert to UTC ms timestamp
        if hasattr(dt, "timestamp"):
            ts_ms = int(dt.timestamp() * 1000)
        else:
            ts_ms = int(datetime.fromisoformat(str(dt)).timestamp() * 1000)

        bars.append({
            "time":   ts_ms,
            "open":   round(float(row["Open"]),   4),
            "high":   round(float(row["High"]),   4),
            "low":    round(float(row["Low"]),    4),
            "close":  round(float(row["Close"]),  4),
            "volume": int(row["Volume"]),
        })

    return bars


# ── Alpaca REST helpers (market OPEN) ─────────────────────────────────────────

def get_snapshot_alpaca(symbol: str) -> dict:
    """Alpaca snapshot — latest price, OHLCV, previous close."""
    url = f"{ALPACA_DATA_REST_URL}/{symbol}/snapshot?feed=iex"
    req = Request(url, headers=alpaca_headers())
    with urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())

    daily_bar    = data.get("dailyBar")    or {}
    prev_bar     = data.get("prevDailyBar") or {}
    latest_trade = data.get("latestTrade") or {}

    return {
        "s":             symbol,
        "p":             latest_trade.get("p"),
        "close":         daily_bar.get("c"),
        "previousClose": prev_bar.get("c"),
        "open":          daily_bar.get("o"),
        "high":          daily_bar.get("h"),
        "low":           daily_bar.get("l"),
        "volume":        daily_bar.get("v"),
    }


def get_historical_bars_alpaca(symbol: str, limit: int = 30) -> list:
    """Fetch last `limit` 1-hour bars from Alpaca REST."""
    start = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    params = urlencode({
        "timeframe": "1Hour",
        "start":     start,
        "limit":     limit,
        "feed":      "iex",
        "sort":      "asc",
    })
    url = f"{ALPACA_DATA_REST_URL}/{symbol}/bars?{params}"
    req = Request(url, headers=alpaca_headers())

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f"Alpaca historical bars error for {symbol}: {e}")
        return []

    bars = data.get("bars") or []
    return [
        {
            "time":   int(datetime.fromisoformat(
                          b["t"].replace("Z", "+00:00")
                      ).timestamp() * 1000),
            "open":   b.get("o"),
            "high":   b.get("h"),
            "low":    b.get("l"),
            "close":  b.get("c"),
            "volume": b.get("v"),
        }
        for b in bars
    ]


# ── Unified data fetchers (auto-switch by market status) ──────────────────────

def get_snapshot(symbol: str) -> dict:
    """
    Returns snapshot from Alpaca when market is OPEN,
    falls back to yfinance when CLOSED.
    """
    if get_market_status() == "OPEN":
        try:
            return get_snapshot_alpaca(symbol)
        except Exception as e:
            print(f"Alpaca snapshot failed for {symbol}, falling back to yfinance: {e}")
            return get_snapshot_yfinance(symbol)
    else:
        try:
            return get_snapshot_yfinance(symbol)
        except Exception as e:
            print(f"yfinance snapshot failed for {symbol}, falling back to Alpaca: {e}")
            return get_snapshot_alpaca(symbol)


def get_historical_bars(symbol: str, limit: int = 30) -> list:
    """
    Returns historical bars from Alpaca when market is OPEN,
    falls back to yfinance when CLOSED.
    yfinance is more reliable for historical data outside trading hours.
    """
    if get_market_status() == "OPEN":
        try:
            bars = get_historical_bars_alpaca(symbol, limit)
            if bars:
                return bars
        except Exception as e:
            print(f"Alpaca bars failed for {symbol}: {e}")
        # Fallback
        return get_historical_bars_yfinance(symbol, limit)
    else:
        try:
            bars = get_historical_bars_yfinance(symbol, limit)
            if bars:
                return bars
        except Exception as e:
            print(f"yfinance bars failed for {symbol}: {e}")
        # Fallback
        return get_historical_bars_alpaca(symbol, limit)


# ── Client management ─────────────────────────────────────────────────────────

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


# ── On-connect data burst ─────────────────────────────────────────────────────

async def send_snapshot_prices(websocket: WebSocket):
    """Send latest price snapshot — Alpaca if open, yfinance if closed."""
    quotes = await asyncio.gather(
        *[asyncio.to_thread(get_snapshot, s) for s in stock_pool]
    )
    await send_json_to_client(websocket, {
        "type":   "snapshot",
        "data":   list(quotes),
        "source": "alpaca" if get_market_status() == "OPEN" else "yfinance",
    })


async def send_historical_candles(websocket: WebSocket):
    """Send 30 historical 1-hour bars — Alpaca if open, yfinance if closed."""
    history = await asyncio.gather(
        *[asyncio.to_thread(get_historical_bars, s, 30) for s in stock_pool]
    )
    payload = {symbol: bars for symbol, bars in zip(stock_pool, history)}
    await send_json_to_client(websocket, {
        "type":   "history",
        "data":   payload,
        "source": "alpaca" if get_market_status() == "OPEN" else "yfinance",
    })


# ── Alpaca WebSocket streaming (only meaningful when market OPEN) ─────────────

async def run_alpaca_connection():
    while True:
        try:
            async with websockets.connect(
                ALPACA_DATA_WS_URL,
                ping_interval=20,
                ping_timeout=20,
            ) as alpaca_ws:
                print("Connected to Alpaca data stream")

                await alpaca_ws.send(json.dumps({
                    "action": "auth",
                    "key":    ALPACA_API_KEY,
                    "secret": ALPACA_API_SECRET,
                }))
                await alpaca_ws.recv()

                await alpaca_ws.send(json.dumps({
                    "action": "subscribe",
                    "trades": stock_pool,
                    "bars":   stock_pool,
                }))
                await alpaca_ws.recv()

                while True:
                    async with clients_lock:
                        has_clients = bool(connected_clients)
                    if not has_clients:
                        return

                    raw = await alpaca_ws.recv()
                    messages = json.loads(raw)

                    for msg in messages:
                        msg_type = msg.get("T")

                        if msg_type == "t":
                            await broadcast_to_clients(json.dumps({
                                "type": "trade",
                                "data": {
                                    "s": msg.get("S"),
                                    "p": msg.get("p"),
                                    "v": msg.get("s"),
                                    "t": msg.get("t"),
                                }
                            }))

                        elif msg_type == "b":
                            await broadcast_to_clients(json.dumps({
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
                            }))

                        elif msg_type == "error":
                            print("Alpaca stream error:", msg)

        except asyncio.CancelledError:
            print("Alpaca WebSocket task cancelled")
            raise

        except Exception as e:
            print("Alpaca connection error:", e)
            await asyncio.sleep(5)


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
        market = get_market_status()

        # 1. Latest prices (Alpaca if open, yfinance if closed)
        await send_snapshot_prices(websocket)

        # 2. Historical bars to seed sparklines (always works regardless of market)
        await send_historical_candles(websocket)

        # 3. Market status banner
        await send_json_to_client(websocket, {
            "type":   "market_status",
            "status": market,
        })

        # 4. Only start live WebSocket stream when market is open
        if market == "OPEN":
            await ensure_alpaca_connection()
        else:
            print("Market closed — skipping Alpaca WebSocket, using yfinance data only")

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        print("Frontend WebSocket disconnected")

    finally:
        await unregister_client(websocket)