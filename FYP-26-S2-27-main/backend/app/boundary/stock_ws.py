from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.control.controller.alertc import CheckAndTriggerAlertsController
import websockets
import json
import asyncio
import os
import math
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

ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_API_SECRET = os.getenv("ALPACA_API_SECRET")

ALPACA_DATA_REST_URL = "https://data.alpaca.markets/v2/stocks"
ALPACA_DATA_WS_URL = "wss://stream.data.alpaca.markets/v2/iex"


# Store connected clients
connected_clients: Dict[WebSocket, asyncio.Lock] = {}
clients_lock = asyncio.Lock()
alpaca_task: Optional[asyncio.Task] = None
previous_close_cache: Dict[str, float] = {}

stock_pool = [
    "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL",
    "AMZN", "META", "AMD",  "NFLX", "INTC"
]


def clean_json_value(value):
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {key: clean_json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clean_json_value(item) for item in value]
    return value


def alpaca_headers() -> dict:
    return {
        "APCA-API-KEY-ID":     ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
    }


# getting market status
def get_market_status() -> str:
    eastern = ZoneInfo("America/New_York")
    now = datetime.now(eastern)
    current_time = now.time()
    market_open = current_time >= datetime.strptime("09:30", "%H:%M").time()
    market_close = current_time <= datetime.strptime("16:00", "%H:%M").time()
    weekday = now.weekday() < 5
    if weekday and market_open and market_close:
        return "OPEN"
    return "CLOSED"


# ── yfinance helpers ───────────────────────────────────────────────────────────

def get_snapshot_yfinance(symbol: str) -> dict:
    try:
        ticker = yf.Ticker(symbol)

        # One call: last 2 daily bars → today + yesterday
        hist = ticker.history(period="5d", interval="1d")
        hist = hist.dropna(subset=["Close"])  # drops the partial June 10 row

        today = None
        yesterday = None

        if not hist.empty:
            # hist is sorted oldest→newest
            today = hist.iloc[-1]
            yesterday = hist.iloc[-2] if len(hist) >= 2 else None

        # avg volume: three_month_average_volume from fast_info is reliable
        # (it's pre-computed by Yahoo, not derived from tick data)
        avg_volume = getattr(ticker.fast_info, "three_month_average_volume", None)

        return {
            "s":             symbol,
            # Use today's close as the current price (market closed → last close)
            "p":             float(today["Close"]) if today is not None else None,
            "close":         float(today["Close"]) if today is not None else None,
            "previousClose": float(yesterday["Close"]) if yesterday is not None else None,
            "open":          float(today["Open"]) if today is not None else None,
            "high":          float(today["High"]) if today is not None else None,
            "low":           float(today["Low"]) if today is not None else None,
            # today's total volume — matches Google Finance
            "volume":        int(today["Volume"]) if today is not None else None,
            # 3-month average daily volume — matches Google Finance
            "avgVolume":     int(avg_volume) if avg_volume is not None else None,
        }
    except Exception as e:
        # yfinance can raise internal KeyError when Yahoo response is missing fields
        # Return a safe snapshot so callers don't crash; log concise message.
        print(f"yfinance snapshot error for {symbol}: {e.__class__.__name__}: {e}")
        return {
            "s": symbol,
            "p": None,
            "close": None,
            "previousClose": None,
            "open": None,
            "high": None,
            "low": None,
            "volume": None,
            "avgVolume": None,
        }


def get_historical_bars_yfinance(symbol: str, range: str = "1D",  limit: int = 1800) -> list:

    ticker = yf.Ticker(symbol)
    if range == "1D":
        period = "1d"
        interval = "1m"

    elif range == "1W":
        period = "7d"
        interval = "5m"

    elif range == "1M":
        period = "1mo"
        interval = "1d"

    elif range == "3M":
        period = "3mo"
        interval = "1d"

    elif range == "6M":
        period = "6mo"
        interval = "1d"

    elif range == "1Y":
        period = "1y"
        interval = "1wk"

    else:
        period = "1d"
        interval = "1m"
    df = ticker.history(period=period, interval=interval)
    if df.empty:
        return []

    df = df.tail(limit).reset_index()

    bars = []
    for _, row in df.iterrows():
        dt = row.get("Datetime") or row.get("Date")
        if dt is None:
            continue

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


# ── Alpaca REST helpers (market OPEN) ──────────────────────────────────────────

def get_snapshot_alpaca(symbol: str) -> dict:
    """
    Alpaca snapshot for live market hours.

    Volume note: Alpaca IEX feed only captures ~10-15% of real market volume.
    avgVolume comes from yfinance (Yahoo/SIP) so it uses the full market figure,
    matching what Google Finance shows. The current volume will be lower than
    Google's until you upgrade to the Alpaca SIP feed.
    """
    url = f"{ALPACA_DATA_REST_URL}/{symbol}/snapshot?feed=iex"
    req = Request(url, headers=alpaca_headers())
    with urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())

    daily_bar = data.get("dailyBar") or {}
    prev_bar = data.get("prevDailyBar") or {}
    latest_trade = data.get("latestTrade") or {}

    # avgVolume: pull from yfinance fast_info (fast — no heavy fundamentals fetch)
    today_volume = None
    avg_volume = None
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d", interval="1d")

        if not hist.empty:
            today_volume = int(hist.iloc[-1]["Volume"])

        avg_volume = getattr(
            ticker.fast_info, "three_month_average_volume", None)
        if avg_volume is not None:
            avg_volume = int(avg_volume)
    except Exception as e:
        print(f"yfinance volume fields failed for {symbol}: {e}")

    return {
        "s":             symbol,
        "p":             latest_trade.get("p"),
        "close":         daily_bar.get("c"),
        "previousClose": prev_bar.get("c"),
        "open":          daily_bar.get("o"),
        "high":          daily_bar.get("h"),
        "low":           daily_bar.get("l"),
        # IEX-only volume — will be ~10x lower than Google Finance
        "volume":        today_volume,
        "avgVolume":     avg_volume,
    }


def get_historical_bars_alpaca(symbol: str, range: str = "1D", limit: int = 1800) -> list:
    """Fetch historical bars from Alpaca REST for the selected chart range."""
    if range == "1D":
        timeframe = "1Min"
        start_days = 2
    elif range == "1W":
        timeframe = "5Min"
        start_days = 10
    elif range in {"1M", "3M", "6M"}:
        timeframe = "1Day"
        start_days = {"1M": 45, "3M": 120, "6M": 220}[range]
    elif range == "1Y":
        timeframe = "1Week"
        start_days = 370
    else:
        timeframe = "1Min"
        start_days = 2

    start = (datetime.now(ZoneInfo("UTC")) - timedelta(days=start_days)
             ).strftime("%Y-%m-%dT%H:%M:%SZ")
    params = urlencode({
        "timeframe": timeframe,
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


# ── Unified fetchers (auto-switch by market status) ────────────────────────────

def get_snapshot(symbol: str) -> dict:
    if get_market_status() == "OPEN":
        try:
            return get_snapshot_alpaca(symbol)
        except Exception as e:
            print(
                f"Alpaca snapshot failed for {symbol}, falling back to yfinance: {e}")
            return get_snapshot_yfinance(symbol)
    else:
        try:
            return get_snapshot_yfinance(symbol)
        except Exception as e:
            print(
                f"yfinance snapshot failed for {symbol}, falling back to Alpaca: {e}")
            return get_snapshot_alpaca(symbol)


def get_historical_bars(symbol: str, range: str = "1D", limit: int = 1800) -> list:
    if get_market_status() == "OPEN":
        try:
            bars = get_historical_bars_alpaca(symbol, range=range, limit=limit)
            if bars:
                return bars
        except Exception as e:
            print(f"Alpaca bars failed for {symbol}: {e}")
        return get_historical_bars_yfinance(symbol, range=range, limit=limit)
    else:
        try:
            bars = get_historical_bars_yfinance(
                symbol, range=range, limit=limit)
            if bars:
                return bars
        except Exception as e:
            print(f"yfinance bars failed for {symbol}: {e}")
        return get_historical_bars_alpaca(symbol, range=range, limit=limit)


# ── Client management ──────────────────────────────────────────────────────────

async def register_client(websocket: WebSocket):
    async with clients_lock:
        connected_clients[websocket] = asyncio.Lock()
# Stop streaming data when no one uses


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
        await websocket.send_json(clean_json_value(message))


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


# ── On-connect data burst ──────────────────────────────────────────────────────

async def send_snapshot_prices(websocket: WebSocket):
    """Send latest price snapshot — Alpaca if open, yfinance if closed."""
    results = await asyncio.gather(
        *[asyncio.to_thread(get_snapshot, s) for s in stock_pool],
        return_exceptions=True,
    )
    quotes = []
    failed_symbols = []

    for symbol, result in zip(stock_pool, results):
        if isinstance(result, Exception):
            print(f"Snapshot fetch failed for {symbol}: {result}")
            failed_symbols.append(symbol)
            continue
        quotes.append(result)
        if result.get("previousClose") is not None:
            previous_close_cache[symbol] = float(result["previousClose"])

    await send_json_to_client(websocket, {
        "type":   "snapshot",
        "data":   quotes,
        "source": "alpaca" if get_market_status() == "OPEN" else "yfinance",
    })

    if failed_symbols:
        await send_json_to_client(websocket, {
            "type": "error",
            "message": f"Could not fetch stock snapshot for: {', '.join(failed_symbols)}",
        })


async def send_historical_candles(websocket: WebSocket, symbols: Optional[list[str]] = None, range: str = "1D"):
    """Send historical bars for the requested range."""
    symbols = symbols or stock_pool
    results = await asyncio.gather(
        *[asyncio.to_thread(get_historical_bars, s, range, 1800)
          for s in symbols],
        return_exceptions=True,
    )
    payload = {}
    failed_symbols = []

    for symbol, result in zip(symbols, results):
        if isinstance(result, Exception):
            print(f"Historical bars fetch failed for {symbol}: {result}")
            failed_symbols.append(symbol)
            continue
        payload[symbol] = result

    await send_json_to_client(websocket, {
        "type":   "history",
        "data":   payload,
        "range":  range,
        "source": "alpaca" if get_market_status() == "OPEN" else "yfinance",
    })

    if failed_symbols:
        await send_json_to_client(websocket, {
            "type": "error",
            "message": f"Could not fetch chart data for: {', '.join(failed_symbols)}",
        })


# ── Alpaca WebSocket streaming (only when market OPEN) ────────────────────────

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
                            # "S" = symbol (uppercase), "s" = trade size (shares), "p" = price
                            symbol = msg.get("S")
                            price = msg.get("p")
                            await broadcast_to_clients(json.dumps({
                                "type": "trade",
                                "data": {
                                    "s":    symbol,
                                    "p":    price,
                                    "size": msg.get("s"),
                                    "t":    msg.get("t"),
                                }
                            }))
                            if symbol and price is not None:
                                asyncio.create_task(asyncio.to_thread(
                                    CheckAndTriggerAlertsController().check,
                                    symbol, float(price), previous_close_cache.get(symbol)
                                ))

                        elif msg_type == "b":
                            # Authoritative 1-minute OHLCV bar from Alpaca
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


# ── WebSocket endpoint ─────────────────────────────────────────────────────────

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

        # 2. Historical bars to seed sparklines
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
            raw_message = await websocket.receive_text()

            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                continue

            if message.get("type") == "range":
                requested_symbol = str(message.get("symbol", "")).upper()
                requested_range = str(message.get("range", "1D")).upper()

                if requested_symbol not in stock_pool:
                    await send_json_to_client(websocket, {
                        "type": "error",
                        "message": f"Unsupported symbol: {requested_symbol}",
                    })
                    continue

                if requested_range not in {"1D", "1W", "1M", "3M", "6M", "1Y"}:
                    requested_range = "1D"

                await send_historical_candles(
                    websocket,
                    symbols=[requested_symbol],
                    range=requested_range,
                )

    except WebSocketDisconnect:
        print("Frontend WebSocket disconnected")

    finally:
        await unregister_client(websocket)
