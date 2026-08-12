from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.control.controller.alertc import CheckAndTriggerAlertsController
from app.control.services.auth import get_current_user
from app.entity.models.dashboardusage import DashboardUsage
import websockets
import json
import asyncio
import os
import math
import time
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


# Keep track of the clients currently connected to the stock WebSocket.
connected_clients: Dict[WebSocket, asyncio.Lock] = {}
clients_lock = asyncio.Lock()
alpaca_task: Optional[asyncio.Task] = None
previous_close_cache: Dict[str, float] = {}


# S&P 500 stocks grouped by their main GICS sector.
# The same mapping is also used when the frontend needs sector-based stock lists.
SECTOR_POOLS: Dict[str, list] = {
    "Information Technology": [
        "AAPL", "ACN", "ADBE", "ADI", "ADSK", "AKAM", "AMAT", "AMD", "ANET", "APH",
        "APP", "AVGO", "CDNS", "CDW", "CIEN", "COHR", "CRM", "CRWD", "CSCO", "CTSH",
        "DDOG", "DELL", "EPAM", "FFIV", "FICO", "FSLR", "FTNT", "GDDY", "GEN", "GLW",
        "HPE", "HPQ", "IBM", "INTC", "INTU", "IT", "JBL", "KEYS", "KLAC", "LITE",
        "LRCX", "MCHP", "MPWR", "MSFT", "MSI", "MU", "NOW", "NTAP", "NVDA", "NXPI",
        "ON", "ORCL", "PANW", "PLTR", "PTC", "Q", "QCOM", "ROP", "SMCI", "SNDK",
        "SNPS", "STX", "SWKS", "TDY", "TEL", "TER", "TRMB", "TXN", "TYL", "VRSN",
        "WDAY", "WDC", "ZBRA",
    ],
    "Communication Services": [
        "CHTR", "CMCSA", "DIS", "EA", "FOX", "FOXA", "GOOG", "GOOGL", "LYV", "META",
        "NFLX", "NWS", "NWSA", "OMC", "PSKY", "SATS", "T", "TKO", "TMUS", "TTD",
        "TTWO", "VZ", "WBD",
    ],
    "Consumer Discretionary": [
        "ABNB", "AMZN", "APTV", "AZO", "BBY", "BKNG", "CCL", "CMG", "CVNA", "DASH",
        "DECK", "DHI", "DPZ", "DRI", "EBAY", "EXPE", "F", "GM", "GPC", "GRMN",
        "HAS", "HD", "HLT", "LEN", "LOW", "LULU", "LVS", "MAR", "MCD", "MGM",
        "NCLH", "NKE", "NVR", "ORLY", "PHM", "POOL", "RCL", "RL", "ROST", "SBUX",
        "TJX", "TPR", "TSCO", "TSLA", "ULTA", "WSM", "WYNN", "YUM",
    ],
    "Financials": [
        "ACGL", "AFL", "AIG", "AIZ", "AJG", "ALL", "AMP", "AON", "APO", "ARES",
        "AXP", "BAC", "BEN", "BK", "BLK", "BRK-B", "BRO", "BX", "C", "CB",
        "CBOE", "CFG", "CINF", "CME", "COF", "COIN", "CPAY", "EG", "ERIE", "FDS",
        "FIS", "FISV", "FITB", "GL", "GPN", "GS", "HBAN", "HIG", "HOOD", "IBKR",
        "ICE", "IVZ", "JKHY", "JPM", "KEY", "KKR", "L", "MA", "MCO", "MET",
        "MRSH", "MS", "MSCI", "MTB", "NDAQ", "NTRS", "PFG", "PGR", "PNC", "PRU",
        "PYPL", "RF", "RJF", "SCHW", "SPGI", "STT", "SYF", "TFC", "TROW", "TRV",
        "USB", "V", "WFC", "WRB", "WTW", "XYZ",
    ],
    "Energy": [
        "APA", "BKR", "COP", "CTRA", "CVX", "DVN", "EOG", "EQT", "EXE", "FANG",
        "HAL", "KMI", "MPC", "OKE", "OXY", "PSX", "SLB", "TPL", "TRGP", "VLO",
        "WMB", "XOM",
    ],
    "Real Estate": [
        "AMT", "ARE", "AVB", "BXP", "CBRE", "CCI", "CPT", "CSGP", "DLR", "DOC",
        "EQIX", "EQR", "ESS", "EXR", "FRT", "HST", "INVH", "IRM", "KIM", "MAA",
        "O", "PLD", "PSA", "REG", "SBAC", "SPG", "UDR", "VICI", "VTR", "WELL",
        "WY",
    ],
    "Health Care": [
        "A", "ABBV", "ABT", "ALGN", "AMGN", "BAX", "BDX", "BIIB", "BMY", "BSX",
        "CAH", "CI", "CNC", "COO", "COR", "CRL", "CVS", "DGX", "DHR", "DVA",
        "DXCM", "ELV", "EW", "GEHC", "GILD", "HCA", "HSIC", "HUM", "IDXX", "INCY",
        "IQV", "ISRG", "JNJ", "LH", "LLY", "MCK", "MDT", "MRK", "MRNA", "MTD",
        "PFE", "PODD", "REGN", "RMD", "RVTY", "SOLV", "STE", "SYK", "TECH", "TMO",
        "UHS", "UNH", "VRTX", "VTRS", "WAT", "WST", "ZBH", "ZTS",
    ],
    "Consumer Staples": [
        "ADM", "BF-B", "BG", "CAG", "CASY", "CHD", "CL", "CLX", "COST", "CPB",
        "DG", "DLTR", "EL", "GIS", "HRL", "HSY", "KDP", "KHC", "KMB", "KO",
        "KR", "KVUE", "MDLZ", "MKC", "MNST", "MO", "PEP", "PG", "PM", "SJM",
        "STZ", "SYY", "TAP", "TGT", "TSN", "WMT",
    ],
    "Industrials": [
        "ADP", "ALLE", "AME", "AOS", "AXON", "BA", "BLDR", "BR", "CARR", "CAT",
        "CHRW", "CMI", "CPRT", "CSX", "CTAS", "DAL", "DE", "DOV", "EFX", "EME",
        "EMR", "ETN", "EXPD", "FAST", "FDX", "FIX", "FTV", "GD", "GE", "GEV",
        "GNRC", "GWW", "HII", "HON", "HUBB", "HWM", "IEX", "IR", "ITW", "J",
        "JBHT", "JCI", "LDOS", "LHX", "LII", "LMT", "LUV", "MAS", "MMM", "NDSN",
        "NOC", "NSC", "ODFL", "OTIS", "PAYX", "PCAR", "PH", "PNR", "PWR", "ROK",
        "ROL", "RSG", "RTX", "SNA", "SWK", "TDG", "TT", "TXT", "UAL", "UBER",
        "UNP", "UPS", "URI", "VLTO", "VRSK", "VRT", "WAB", "WM", "XYL",
    ],
    "Materials": [
        "ALB", "AMCR", "APD", "AVY", "BALL", "CF", "CRH", "CTVA", "DD", "DOW",
        "ECL", "FCX", "IFF", "IP", "LIN", "LYB", "MLM", "MOS", "NEM", "NUE",
        "PKG", "PPG", "SHW", "STLD", "SW", "VMC",
    ],
    "Utilities": [
        "AEE", "AEP", "AES", "ATO", "AWK", "CEG", "CMS", "CNP", "D", "DTE",
        "DUK", "ED", "EIX", "ES", "ETR", "EVRG", "EXC", "FE", "LNT", "NEE",
        "NI", "NRG", "PCG", "PEG", "PNW", "PPL", "SO", "SRE", "VST", "WEC",
        "XEL",
    ],
}


# Build one flat list from all sectors so the dashboard can work with
# the full stock pool without having to loop through each sector again.
stock_pool = [s for symbols in SECTOR_POOLS.values() for s in symbols]

# This makes it easy to find a stock's sector when building the response.
SYMBOL_SECTOR = {
    s: sector
    for sector, symbols in SECTOR_POOLS.items()
    for s in symbols
}


# Company names used by the dashboard alongside the stock symbols.
COMPANY_NAMES: Dict[str, str] = {
    "A": "Agilent Technologies",
    "AAPL": "Apple Inc.",
    "ABBV": "AbbVie",
    "ABNB": "Airbnb",
    "ABT": "Abbott Laboratories",
    "ACGL": "Arch Capital Group",
    "ACN": "Accenture",
    "ADBE": "Adobe Inc.",
    "ADI": "Analog Devices",
    "ADM": "Archer Daniels Midland",
    "ADP": "Automatic Data Processing",
    "ADSK": "Autodesk",
    "AEE": "Ameren",
    "AEP": "American Electric Power",
    "AES": "AES Corporation",
    "AFL": "Aflac",
    "AIG": "American International Group",
    "AIZ": "Assurant",
    "AJG": "Arthur J. Gallagher & Co.",
    "AKAM": "Akamai Technologies",
    "ALB": "Albemarle Corporation",
    "ALGN": "Align Technology",
    "ALL": "Allstate",
    "ALLE": "Allegion",
    "AMAT": "Applied Materials",
    "AMCR": "Amcor",
    "AMD": "Advanced Micro Devices",
    "AME": "Ametek",
    "AMGN": "Amgen",
    "AMP": "Ameriprise Financial",
    "AMT": "American Tower",
    "AMZN": "Amazon",
    "ANET": "Arista Networks",
    "AON": "Aon plc",
    "AOS": "A. O. Smith",
    "APA": "APA Corporation",
    "APD": "Air Products",
    "APH": "Amphenol",
    "APO": "Apollo Global Management",
    "APP": "AppLovin",
    "APTV": "Aptiv",
    "ARE": "Alexandria Real Estate Equities",
    "ARES": "Ares Management",
    "ATO": "Atmos Energy",
    "AVB": "AvalonBay Communities",
    "AVGO": "Broadcom",
    "AVY": "Avery Dennison",
    "AWK": "American Water Works",
    "AXON": "Axon Enterprise",
    "AXP": "American Express",
    "AZO": "AutoZone",
    "BA": "Boeing",
    "BAC": "Bank of America",
    "BALL": "Ball Corporation",
    "BAX": "Baxter International",
    "BBY": "Best Buy",
    "BDX": "Becton Dickinson",
    "BEN": "Franklin Resources",
    "BF-B": "Brown–Forman",
    "BG": "Bunge Global",
    "BIIB": "Biogen",
    "BK": "BNY Mellon",
    "BKNG": "Booking Holdings",
    "BKR": "Baker Hughes",
    "BLDR": "Builders FirstSource",
    "BLK": "BlackRock",
    "BMY": "Bristol Myers Squibb",
    "BR": "Broadridge Financial Solutions",
    "BRK-B": "Berkshire Hathaway",
    "BRO": "Brown & Brown",
    "BSX": "Boston Scientific",
    "BX": "Blackstone Inc.",
    "BXP": "BXP, Inc.",
    "C": "Citigroup",
    "CAG": "Conagra Brands",
    "CAH": "Cardinal Health",
    "CARR": "Carrier Global",
    "CASY": "Casey's",
    "CAT": "Caterpillar Inc.",
    "CB": "Chubb Limited",
    "CBOE": "Cboe Global Markets",
    "CBRE": "CBRE Group",
    "CCI": "Crown Castle",
    "CCL": "Carnival",
    "CDNS": "Cadence Design Systems",
    "CDW": "CDW Corporation",
    "CEG": "Constellation Energy",
    "CF": "CF Industries",
    "CFG": "Citizens Financial Group",
    "CHD": "Church & Dwight",
    "CHRW": "C.H. Robinson",
    "CHTR": "Charter Communications",
    "CI": "Cigna",
    "CIEN": "Ciena",
    "CINF": "Cincinnati Financial",
    "CL": "Colgate-Palmolive",
    "CLX": "Clorox",
    "CMCSA": "Comcast",
    "CME": "CME Group",
    "CMG": "Chipotle Mexican Grill",
    "CMI": "Cummins",
    "CMS": "CMS Energy",
    "CNC": "Centene Corporation",
    "CNP": "CenterPoint Energy",
    "COF": "Capital One",
    "COHR": "Coherent Corp.",
    "COIN": "Coinbase",
    "COO": "Cooper Companies (The)",
    "COP": "ConocoPhillips",
    "COR": "Cencora",
    "COST": "Costco",
    "CPAY": "Corpay",
    "CPB": "Campbell's Company (The)",
    "CPRT": "Copart",
    "CPT": "Camden Property Trust",
    "CRH": "CRH plc",
    "CRL": "Charles River Laboratories",
    "CRM": "Salesforce",
    "CRWD": "CrowdStrike",
    "CSCO": "Cisco",
    "CSGP": "CoStar Group",
    "CSX": "CSX Corporation",
    "CTAS": "Cintas",
    "CTRA": "Coterra",
    "CTSH": "Cognizant",
    "CTVA": "Corteva",
    "CVNA": "Carvana",
    "CVS": "CVS Health",
    "CVX": "Chevron Corporation",
    "D": "Dominion Energy",
    "DAL": "Delta Air Lines",
    "DASH": "DoorDash",
    "DD": "DuPont",
    "DDOG": "Datadog",
    "DE": "Deere & Company",
    "DECK": "Deckers Brands",
    "DELL": "Dell Technologies",
    "DG": "Dollar General",
    "DGX": "Quest Diagnostics",
    "DHI": "D. R. Horton",
    "DHR": "Danaher Corporation",
    "DIS": "Walt Disney Company (The)",
    "DLR": "Digital Realty",
    "DLTR": "Dollar Tree",
    "DOC": "Healthpeak Properties",
    "DOV": "Dover Corporation",
    "DOW": "Dow Inc.",
    "DPZ": "Domino's",
    "DRI": "Darden Restaurants",
    "DTE": "DTE Energy",
    "DUK": "Duke Energy",
    "DVA": "DaVita",
    "DVN": "Devon Energy",
    "DXCM": "Dexcom",
    "EA": "Electronic Arts",
    "EBAY": "eBay Inc.",
    "ECL": "Ecolab",
    "ED": "Consolidated Edison",
    "EFX": "Equifax",
    "EG": "Everest Group",
    "EIX": "Edison International",
    "EL": "Estée Lauder Companies (The)",
    "ELV": "Elevance Health",
    "EME": "Emcor",
    "EMR": "Emerson Electric",
    "EOG": "EOG Resources",
    "EPAM": "EPAM Systems",
    "EQIX": "Equinix",
    "EQR": "Equity Residential",
    "EQT": "EQT Corporation",
    "ERIE": "Erie Indemnity",
    "ES": "Eversource Energy",
    "ESS": "Essex Property Trust",
    "ETN": "Eaton Corporation",
    "ETR": "Entergy",
    "EVRG": "Evergy",
    "EW": "Edwards Lifesciences",
    "EXC": "Exelon",
    "EXE": "Expand Energy",
    "EXPD": "Expeditors International",
    "EXPE": "Expedia Group",
    "EXR": "Extra Space Storage",
    "F": "Ford Motor Company",
    "FANG": "Diamondback Energy",
    "FAST": "Fastenal",
    "FCX": "Freeport-McMoRan",
    "FDS": "FactSet",
    "FDX": "FedEx",
    "FE": "FirstEnergy",
    "FFIV": "F5, Inc.",
    "FICO": "Fair Isaac",
    "FIS": "Fidelity National Information Services",
    "FISV": "Fiserv",
    "FITB": "Fifth Third Bancorp",
    "FIX": "Comfort Systems USA",
    "FOX": "Fox Corporation (Class B)",
    "FOXA": "Fox Corporation (Class A)",
    "FRT": "Federal Realty Investment Trust",
    "FSLR": "First Solar",
    "FTNT": "Fortinet",
    "FTV": "Fortive",
    "GD": "General Dynamics",
    "GDDY": "GoDaddy",
    "GE": "GE Aerospace",
    "GEHC": "GE HealthCare",
    "GEN": "Gen Digital",
    "GEV": "GE Vernova",
    "GILD": "Gilead Sciences",
    "GIS": "General Mills",
    "GL": "Globe Life",
    "GLW": "Corning Inc.",
    "GM": "General Motors",
    "GNRC": "Generac",
    "GOOG": "Alphabet Inc. (Class C)",
    "GOOGL": "Alphabet Inc. (Class A)",
    "GPC": "Genuine Parts Company",
    "GPN": "Global Payments",
    "GRMN": "Garmin",
    "GS": "Goldman Sachs",
    "GWW": "W. W. Grainger",
    "HAL": "Halliburton",
    "HAS": "Hasbro",
    "HBAN": "Huntington Bancshares",
    "HCA": "HCA Healthcare",
    "HD": "Home Depot (The)",
    "HIG": "Hartford (The)",
    "HII": "Huntington Ingalls Industries",
    "HLT": "Hilton Worldwide",
    "HON": "Honeywell",
    "HOOD": "Robinhood Markets",
    "HPE": "Hewlett Packard Enterprise",
    "HPQ": "HP Inc.",
    "HRL": "Hormel Foods",
    "HSIC": "Henry Schein",
    "HST": "Host Hotels & Resorts",
    "HSY": "Hershey Company (The)",
    "HUBB": "Hubbell Incorporated",
    "HUM": "Humana",
    "HWM": "Howmet Aerospace",
    "IBKR": "Interactive Brokers",
    "IBM": "IBM",
    "ICE": "Intercontinental Exchange",
    "IDXX": "Idexx Laboratories",
    "IEX": "IDEX Corporation",
    "IFF": "International Flavors & Fragrances",
    "INCY": "Incyte",
    "INTC": "Intel",
    "INTU": "Intuit",
    "INVH": "Invitation Homes",
    "IP": "International Paper",
    "IQV": "IQVIA",
    "IR": "Ingersoll Rand",
    "IRM": "Iron Mountain",
    "ISRG": "Intuitive Surgical",
    "IT": "Gartner",
    "ITW": "Illinois Tool Works",
    "IVZ": "Invesco",
    "J": "Jacobs Solutions",
    "JBHT": "J.B. Hunt",
    "JBL": "Jabil",
    "JCI": "Johnson Controls",
    "JKHY": "Jack Henry & Associates",
    "JNJ": "Johnson & Johnson",
    "JPM": "JPMorgan Chase",
    "KDP": "Keurig Dr Pepper",
    "KEY": "KeyCorp",
    "KEYS": "Keysight Technologies",
    "KHC": "Kraft Heinz",
    "KIM": "Kimco Realty",
    "KKR": "KKR & Co.",
    "KLAC": "KLA Corporation",
    "KMB": "Kimberly-Clark",
    "KMI": "Kinder Morgan",
    "KO": "Coca-Cola Company (The)",
    "KR": "Kroger",
    "KVUE": "Kenvue",
    "L": "Loews Corporation",
    "LDOS": "Leidos",
    "LEN": "Lennar",
    "LH": "Labcorp",
    "LHX": "L3Harris",
    "LII": "Lennox International",
    "LIN": "Linde plc",
    "LITE": "Lumentum",
    "LLY": "Lilly (Eli)",
    "LMT": "Lockheed Martin",
    "LNT": "Alliant Energy",
    "LOW": "Lowe's",
    "LRCX": "Lam Research",
    "LULU": "Lululemon Athletica",
    "LUV": "Southwest Airlines",
    "LVS": "Las Vegas Sands",
    "LYB": "LyondellBasell",
    "LYV": "Live Nation Entertainment",
    "MA": "Mastercard",
    "MAA": "Mid-America Apartment Communities",
    "MAR": "Marriott International",
    "MAS": "Masco",
    "MCD": "McDonald's",
    "MCHP": "Microchip Technology",
    "MCK": "McKesson Corporation",
    "MCO": "Moody's Corporation",
    "MDLZ": "Mondelez International",
    "MDT": "Medtronic",
    "MET": "MetLife",
    "META": "Meta Platforms",
    "MGM": "MGM Resorts",
    "MKC": "McCormick & Company",
    "MLM": "Martin Marietta Materials",
    "MMM": "3M",
    "MNST": "Monster Beverage",
    "MO": "Altria",
    "MOS": "Mosaic Company (The)",
    "MPC": "Marathon Petroleum",
    "MPWR": "Monolithic Power Systems",
    "MRK": "Merck & Co.",
    "MRNA": "Moderna",
    "MRSH": "Marsh McLennan",
    "MS": "Morgan Stanley",
    "MSCI": "MSCI Inc.",
    "MSFT": "Microsoft",
    "MSI": "Motorola Solutions",
    "MTB": "M&T Bank",
    "MTD": "Mettler Toledo",
    "MU": "Micron Technology",
    "NCLH": "Norwegian Cruise Line Holdings",
    "NDAQ": "Nasdaq, Inc.",
    "NDSN": "Nordson Corporation",
    "NEE": "NextEra Energy",
    "NEM": "Newmont",
    "NFLX": "Netflix",
    "NI": "NiSource",
    "NKE": "Nike, Inc.",
    "NOC": "Northrop Grumman",
    "NOW": "ServiceNow",
    "NRG": "NRG Energy",
    "NSC": "Norfolk Southern",
    "NTAP": "NetApp",
    "NTRS": "Northern Trust",
    "NUE": "Nucor",
    "NVDA": "Nvidia",
    "NVR": "NVR, Inc.",
    "NWS": "News Corp (Class B)",
    "NWSA": "News Corp (Class A)",
    "NXPI": "NXP Semiconductors",
    "O": "Realty Income",
    "ODFL": "Old Dominion",
    "OKE": "Oneok",
    "OMC": "Omnicom Group",
    "ON": "ON Semiconductor",
    "ORCL": "Oracle Corporation",
    "ORLY": "O'Reilly Automotive",
    "OTIS": "Otis Worldwide",
    "OXY": "Occidental Petroleum",
    "PANW": "Palo Alto Networks",
    "PAYX": "Paychex",
    "PCAR": "Paccar",
    "PCG": "PG&E Corporation",
    "PEG": "Public Service Enterprise Group",
    "PEP": "PepsiCo",
    "PFE": "Pfizer",
    "PFG": "Principal Financial Group",
    "PG": "Procter & Gamble",
    "PGR": "Progressive Corporation",
    "PH": "Parker Hannifin",
    "PHM": "PulteGroup",
    "PKG": "Packaging Corporation of America",
    "PLD": "Prologis",
    "PLTR": "Palantir Technologies",
    "PM": "Philip Morris International",
    "PNC": "PNC Financial Services",
    "PNR": "Pentair",
    "PNW": "Pinnacle West Capital",
    "PODD": "Insulet Corporation",
    "POOL": "Pool Corporation",
    "PPG": "PPG Industries",
    "PPL": "PPL Corporation",
    "PRU": "Prudential Financial",
    "PSA": "Public Storage",
    "PSKY": "Paramount Skydance Corporation",
    "PSX": "Phillips 66",
    "PTC": "PTC Inc.",
    "PWR": "Quanta Services",
    "PYPL": "PayPal",
    "Q": "Qnity Electronics",
    "QCOM": "Qualcomm",
    "RCL": "Royal Caribbean Group",
    "REG": "Regency Centers",
    "REGN": "Regeneron Pharmaceuticals",
    "RF": "Regions Financial Corporation",
    "RJF": "Raymond James Financial",
    "RL": "Ralph Lauren Corporation",
    "RMD": "ResMed",
    "ROK": "Rockwell Automation",
    "ROL": "Rollins, Inc.",
    "ROP": "Roper Technologies",
    "ROST": "Ross Stores",
    "RSG": "Republic Services",
    "RTX": "RTX Corporation",
    "RVTY": "Revvity",
    "SATS": "EchoStar",
    "SBAC": "SBA Communications",
    "SBUX": "Starbucks",
    "SCHW": "Charles Schwab Corporation",
    "SHW": "Sherwin-Williams",
    "SJM": "J.M. Smucker Company (The)",
    "SLB": "Schlumberger",
    "SMCI": "Supermicro",
    "SNA": "Snap-on",
    "SNDK": "Sandisk",
    "SNPS": "Synopsys",
    "SO": "Southern Company",
    "SOLV": "Solventum",
    "SPG": "Simon Property Group",
    "SPGI": "S&P Global",
    "SRE": "Sempra",
    "STE": "Steris",
    "STLD": "Steel Dynamics",
    "STT": "State Street Corporation",
    "STX": "Seagate Technology",
    "STZ": "Constellation Brands",
    "SW": "Smurfit Westrock",
    "SWK": "Stanley Black & Decker",
    "SWKS": "Skyworks Solutions",
    "SYF": "Synchrony Financial",
    "SYK": "Stryker Corporation",
    "SYY": "Sysco",
    "T": "AT&T",
    "TAP": "Molson Coors Beverage Company",
    "TDG": "TransDigm Group",
    "TDY": "Teledyne Technologies",
    "TECH": "Bio-Techne",
    "TEL": "TE Connectivity",
    "TER": "Teradyne",
    "TFC": "Truist Financial",
    "TGT": "Target Corporation",
    "TJX": "TJX Companies",
    "TKO": "TKO Group Holdings",
    "TMO": "Thermo Fisher Scientific",
    "TMUS": "T-Mobile US",
    "TPL": "Texas Pacific Land Corporation",
    "TPR": "Tapestry, Inc.",
    "TRGP": "Targa Resources",
    "TRMB": "Trimble Inc.",
    "TROW": "T. Rowe Price",
    "TRV": "Travelers Companies (The)",
    "TSCO": "Tractor Supply",
    "TSLA": "Tesla, Inc.",
    "TSN": "Tyson Foods",
    "TT": "Trane Technologies",
    "TTD": "Trade Desk (The)",
    "TTWO": "Take-Two Interactive",
    "TXN": "Texas Instruments",
    "TXT": "Textron",
    "TYL": "Tyler Technologies",
    "UAL": "United Airlines Holdings",
    "UBER": "Uber",
    "UDR": "UDR, Inc.",
    "UHS": "Universal Health Services",
    "ULTA": "Ulta Beauty",
    "UNH": "UnitedHealth Group",
    "UNP": "Union Pacific Corporation",
    "UPS": "United Parcel Service",
    "URI": "United Rentals",
    "USB": "U.S. Bancorp",
    "V": "Visa Inc.",
    "VICI": "Vici Properties",
    "VLO": "Valero Energy",
    "VLTO": "Veralto",
    "VMC": "Vulcan Materials Company",
    "VRSK": "Verisk Analytics",
    "VRSN": "Verisign",
    "VRT": "Vertiv",
    "VRTX": "Vertex Pharmaceuticals",
    "VST": "Vistra Corp.",
    "VTR": "Ventas",
    "VTRS": "Viatris",
    "VZ": "Verizon",
    "WAB": "Wabtec",
    "WAT": "Waters Corporation",
    "WBD": "Warner Bros. Discovery",
    "WDAY": "Workday, Inc.",
    "WDC": "Western Digital",
    "WEC": "WEC Energy Group",
    "WELL": "Welltower",
    "WFC": "Wells Fargo",
    "WM": "Waste Management",
    "WMB": "Williams Companies",
    "WMT": "Walmart",
    "WRB": "W. R. Berkley Corporation",
    "WSM": "Williams-Sonoma, Inc.",
    "WST": "West Pharmaceutical Services",
    "WTW": "Willis Towers Watson",
    "WY": "Weyerhaeuser",
    "WYNN": "Wynn Resorts",
    "XEL": "Xcel Energy",
    "XOM": "ExxonMobil",
    "XYL": "Xylem Inc.",
    "XYZ": "Block, Inc.",
    "YUM": "Yum! Brands",
    "ZBH": "Zimmer Biomet",
    "ZBRA": "Zebra Technologies",
    "ZTS": "Zoetis",
}


# Only a smaller group is subscribed to the live stream.
# The remaining stocks are updated through the periodic batch refresh.
STREAM_SYMBOL_LIMIT = 30

stream_pool = [
    "AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "AMD", "CRM", "QCOM", "ADBE",
    "GOOGL", "META", "NFLX", "DIS",
    "AMZN", "TSLA", "NKE", "MCD", "HD",
    "JPM", "BAC", "V", "MA",
    "XOM", "CVX", "COP",
    "AMT", "PLD", "O",
][:STREAM_SYMBOL_LIMIT]


# These caches help avoid repeatedly requesting the same stock data.
_snapshot_cache: Dict[str, dict] = {}
_snapshot_cache_ts: Dict[str, float] = {}
SNAPSHOT_TTL = 30.0

_spark_cache: Dict[str, list] = {}

_batch_refresh_lock = asyncio.Lock()
_batch_last_refresh: Optional[float] = None

BATCH_REFRESH_INTERVAL = 240.0
SPARK_BARS = 30

_CACHE_FILE = BASE_DIR / "snapshot_cache.json"


def _save_cache_to_disk() -> None:
    try:
        tmp = _CACHE_FILE.with_suffix(".json.tmp")

        with open(tmp, "w") as fh:
            json.dump({
                "saved_at": time.time(),
                "snapshots": _snapshot_cache,
                "sparks": _spark_cache,
            }, fh)

        # Replace the old file only after the new cache has been written.
        os.replace(tmp, _CACHE_FILE)

    except Exception as e:
        print(f"Snapshot cache save failed: {e}")


def _load_cache_from_disk() -> None:
    try:
        if not _CACHE_FILE.exists():
            return

        with open(_CACHE_FILE) as fh:
            data = json.load(fh)

        snaps = data.get("snapshots") or {}
        _snapshot_cache.update(snaps)
        _spark_cache.update(data.get("sparks") or {})

        for sym, snap in snaps.items():
            # Older cache files may not have these fields yet.
            snap.setdefault("sector", SYMBOL_SECTOR.get(sym))
            snap.setdefault("name", COMPANY_NAMES.get(sym))

            pc = snap.get("previousClose")
            if pc is not None:
                previous_close_cache[sym] = float(pc)

        age_h = (time.time() - float(data.get("saved_at", 0))) / 3600
        print(
            f"Loaded persisted snapshot cache: "
            f"{len(snaps)} symbols, saved {age_h:.1f}h ago"
        )

    except Exception as e:
        print(f"Snapshot cache load failed: {e}")


_load_cache_from_disk()


def get_live_price(symbol: str) -> float | None:
    snap = _snapshot_cache.get(symbol)

    if snap and snap.get("p") is not None:
        return float(snap["p"])

    try:
        fresh = get_snapshot_yfinance(symbol)
        return (
            float(fresh["p"])
            if fresh and fresh.get("p") is not None
            else None
        )
    except Exception:
        return None


def clean_json_value(value):
    # Remove NaN and infinity values because they cannot be returned as valid JSON.
    if isinstance(value, float) and not math.isfinite(value):
        return None

    if isinstance(value, dict):
        return {
            key: clean_json_value(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [clean_json_value(item) for item in value]

    return value


def alpaca_headers() -> dict:
    return {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
    }


# Trading holidays used to determine whether the US market is open.
_NYSE_HOLIDAYS_2025 = {
    "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18",
    "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01",
    "2025-11-27", "2025-12-25",
}

_NYSE_HOLIDAYS_2026 = {
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03",
    "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
    "2026-11-26", "2026-12-25",
}

_NYSE_HOLIDAYS = _NYSE_HOLIDAYS_2025 | _NYSE_HOLIDAYS_2026


def get_market_status() -> str:
    eastern = ZoneInfo("America/New_York")
    now = datetime.now(eastern)

    today_str = now.strftime("%Y-%m-%d")

    if today_str in _NYSE_HOLIDAYS:
        return "CLOSED"

    current_time = now.time()

    market_open = current_time >= datetime.strptime(
        "09:30", "%H:%M"
    ).time()

    market_close = current_time <= datetime.strptime(
        "16:00", "%H:%M"
    ).time()

    weekday = now.weekday() < 5

    if weekday and market_open and market_close:
        return "OPEN"

    return "CLOSED"


_shutting_down = False
_BATCH_CHUNK = 100


def request_shutdown() -> None:
    global _shutting_down
    _shutting_down = True


def refresh_pool_snapshots() -> None:
    # Download the stock pool in batches instead of making one request per stock.
    now = time.monotonic()
    frames = {}

    for i in range(0, len(stock_pool), _BATCH_CHUNK):
        if _shutting_down:
            return

        chunk = stock_pool[i:i + _BATCH_CHUNK]

        try:
            df = yf.download(
                tickers=chunk,
                period="3mo",
                interval="1d",
                group_by="ticker",
                auto_adjust=False,
                threads=True,
                progress=False,
            )

        except Exception as e:
            print(
                f"Batch chunk download failed "
                f"({chunk[0]}…{chunk[-1]}): {e}"
            )
            continue

        if df is None or df.empty:
            continue

        multi = hasattr(df.columns, "levels")

        for symbol in chunk:
            try:
                frames[symbol] = df[symbol] if multi else df
            except KeyError:
                continue

    if not frames:
        raise RuntimeError(
            "yf.download returned no data for the stock pool"
        )

    for symbol, sub in frames.items():
        sub = sub.dropna(subset=["Close"])

        if sub.empty:
            continue

        today = sub.iloc[-1]
        yesterday = sub.iloc[-2] if len(sub) >= 2 else None

        avg_volume = sub["Volume"].tail(63).mean()

        # These two values are used later for the dashboard's risk and momentum information.
        rets = sub["Close"].pct_change().dropna()

        vol3m = (
            float(rets.std() * math.sqrt(252))
            if len(rets) > 5
            else None
        )

        closes = sub["Close"]

        mom21 = (
            float(closes.iloc[-1] / closes.iloc[-22] - 1)
            if len(closes) >= 22 and closes.iloc[-22]
            else None
        )

        def _f(v):
            try:
                v = float(v)
                return v if math.isfinite(v) else None
            except (TypeError, ValueError):
                return None

        snap = {
            "s": symbol,
            "sector": SYMBOL_SECTOR.get(symbol),
            "name": COMPANY_NAMES.get(symbol),
            "p": _f(today["Close"]),
            "close": _f(today["Close"]),
            "previousClose": (
                _f(yesterday["Close"])
                if yesterday is not None
                else None
            ),
            "open": _f(today["Open"]),
            "high": _f(today["High"]),
            "low": _f(today["Low"]),
            "volume": (
                int(today["Volume"])
                if _f(today["Volume"]) is not None
                else None
            ),
            "avgVolume": (
                int(avg_volume)
                if _f(avg_volume) is not None
                else None
            ),
            "vol3m": (
                round(vol3m, 4)
                if vol3m is not None and math.isfinite(vol3m)
                else None
            ),
            "mom21": (
                round(mom21, 4)
                if mom21 is not None and math.isfinite(mom21)
                else None
            ),
        }

        _snapshot_cache[symbol] = snap
        _snapshot_cache_ts[symbol] = now

        if snap["previousClose"] is not None:
            previous_close_cache[symbol] = snap["previousClose"]

        bars = []

        for ts, row in sub.tail(SPARK_BARS).iterrows():
            o = _f(row["Open"])
            h = _f(row["High"])
            l = _f(row["Low"])
            c = _f(row["Close"])

            if c is None:
                continue

            bars.append({
                "time": int(ts.timestamp() * 1000),
                "open": round(o, 4) if o is not None else None,
                "high": round(h, 4) if h is not None else None,
                "low": round(l, 4) if l is not None else None,
                "close": round(c, 4),
                "volume": (
                    int(row["Volume"])
                    if _f(row["Volume"]) is not None
                    else 0
                ),
            })

        _spark_cache[symbol] = bars

    # Split stocks into three risk groups based on their recent volatility.
    vol_items = [
        (s, snap["vol3m"])
        for s, snap in _snapshot_cache.items()
        if snap.get("vol3m") is not None
    ]

    if len(vol_items) >= 3:
        ordered = sorted(v for _, v in vol_items)

        lo = ordered[len(ordered) // 3]
        hi = ordered[(2 * len(ordered)) // 3]

        for s, v in vol_items:
            _snapshot_cache[s]["risk"] = (
                "Conservative"
                if v <= lo
                else "Moderate"
                if v <= hi
                else "Aggressive"
            )

    if not _shutting_down:
        _save_cache_to_disk()


async def ensure_snapshots_fresh(force: bool = False) -> None:
    global _batch_last_refresh

    async with _batch_refresh_lock:
        fresh = (
            _snapshot_cache
            and _batch_last_refresh is not None
            and (
                time.monotonic() - _batch_last_refresh
            ) < BATCH_REFRESH_INTERVAL
        )

        if fresh and not force:
            return

        try:
            # Run the blocking yfinance download outside the event loop.
            await asyncio.to_thread(refresh_pool_snapshots)
            _batch_last_refresh = time.monotonic()

        except Exception as e:
            print(f"Batch snapshot refresh failed: {e}")


def get_snapshot_yfinance(symbol: str) -> dict:
    ticker = yf.Ticker(symbol)

    # Get the latest two daily bars so we can calculate the current
    # and previous closing prices.
    hist = ticker.history(period="5d", interval="1d")
    hist = hist.dropna(subset=["Close"])

    today = None
    yesterday = None

    if not hist.empty:
        today = hist.iloc[-1]
        yesterday = hist.iloc[-2] if len(hist) >= 2 else None

    avg_volume = getattr(
        ticker.fast_info,
        "three_month_average_volume",
        None,
    )

    return {
        "s": symbol,
        "p": float(today["Close"]) if today is not None else None,
        "close": float(today["Close"]) if today is not None else None,
        "previousClose": (
            float(yesterday["Close"])
            if yesterday is not None
            else None
        ),
        "open": float(today["Open"]) if today is not None else None,
        "high": float(today["High"]) if today is not None else None,
        "low": float(today["Low"]) if today is not None else None,
        "volume": (
            int(today["Volume"])
            if today is not None
            else None
        ),
        "avgVolume": (
            int(avg_volume)
            if avg_volume is not None
            else None
        ),
    }


def get_historical_bars_yfinance(
    symbol: str,
    range: str = "1D",
    limit: int = 1800,
) -> list:

    ticker = yf.Ticker(symbol)

    # Use a different interval depending on the range selected by the user.
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

    df = ticker.history(
        period=period,
        interval=interval,
    )

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
            ts_ms = int(
                datetime.fromisoformat(str(dt)).timestamp() * 1000
            )

        bars.append({
            "time": ts_ms,
            "open": round(float(row["Open"]), 4),
            "high": round(float(row["High"]), 4),
            "low": round(float(row["Low"]), 4),
            "close": round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        })

    return bars


def get_snapshot_alpaca(symbol: str) -> dict:
    url = f"{ALPACA_DATA_REST_URL}/{symbol}/snapshot?feed=iex"

    req = Request(
        url,
        headers=alpaca_headers(),
    )

    with urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())

    daily_bar = data.get("dailyBar") or {}
    prev_bar = data.get("prevDailyBar") or {}
    latest_trade = data.get("latestTrade") or {}

    # Alpaca's IEX feed does not give us the same volume figure
    # as the full market, so yfinance is used for the volume fields.
    today_volume = None
    avg_volume = None

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(
            period="1d",
            interval="1d",
        )

        if not hist.empty:
            today_volume = int(hist.iloc[-1]["Volume"])

        avg_volume = getattr(
            ticker.fast_info,
            "three_month_average_volume",
            None,
        )

        if avg_volume is not None:
            avg_volume = int(avg_volume)

    except Exception as e:
        print(
            f"yfinance volume fields failed for {symbol}: {e}"
        )

    return {
        "s": symbol,
        "p": latest_trade.get("p"),
        "close": daily_bar.get("c"),
        "previousClose": prev_bar.get("c"),
        "open": daily_bar.get("o"),
        "high": daily_bar.get("h"),
        "low": daily_bar.get("l"),
        "volume": today_volume,
        "avgVolume": avg_volume,
    }


def get_historical_bars_alpaca(
    symbol: str,
    range: str = "1D",
    limit: int = 1800,
) -> list:

    # Alpaca uses different timeframes depending on how much history is requested.
    if range == "1D":
        timeframe = "1Min"
        start_days = 2

    elif range == "1W":
        timeframe = "5Min"
        start_days = 10

    elif range in {"1M", "3M", "6M"}:
        timeframe = "1Day"
        start_days = {
            "1M": 45,
            "3M": 120,
            "6M": 220,
        }[range]

    elif range == "1Y":
        timeframe = "1Week"
        start_days = 370

    else:
        timeframe = "1Min"
        start_days = 2

    start = (
        datetime.now(ZoneInfo("UTC")) -
        timedelta(days=start_days)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    params = urlencode({
        "timeframe": timeframe,
        "start": start,
        "limit": limit,
        "feed": "iex",
        "sort": "asc",
    })

    url = f"{ALPACA_DATA_REST_URL}/{symbol}/bars?{params}"

    req = Request(
        url,
        headers=alpaca_headers(),
    )

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

    except Exception as e:
        print(
            f"Alpaca historical bars error for {symbol}: {e}"
        )
        return []

    bars = data.get("bars") or []

    return [
        {
            "time": int(
                datetime.fromisoformat(
                    b["t"].replace("Z", "+00:00")
                ).timestamp() * 1000
            ),
            "open": b.get("o"),
            "high": b.get("h"),
            "low": b.get("l"),
            "close": b.get("c"),
            "volume": b.get("v"),
        }
        for b in bars
    ]


# Choose the data source automatically depending on whether the US market is open.
def get_snapshot(symbol: str) -> dict:
    now = time.monotonic()

    if (
        symbol in _snapshot_cache
        and now - _snapshot_cache_ts.get(symbol, 0) < SNAPSHOT_TTL
    ):
        return _snapshot_cache[symbol]

    if get_market_status() == "OPEN":
        try:
            result = get_snapshot_alpaca(symbol)

        except Exception as e:
            print(
                f"Alpaca snapshot failed for {symbol}, "
                f"falling back to yfinance: {e}"
            )
            result = get_snapshot_yfinance(symbol)

    else:
        try:
            result = get_snapshot_yfinance(symbol)

        except Exception as e:
            print(
                f"yfinance snapshot failed for {symbol}, "
                f"falling back to Alpaca: {e}"
            )
            result = get_snapshot_alpaca(symbol)

    _snapshot_cache[symbol] = result
    _snapshot_cache_ts[symbol] = now

    return result


def get_historical_bars(
    symbol: str,
    range: str = "1D",
    limit: int = 1800,
) -> list:

    if get_market_status() == "OPEN":
        try:
            bars = get_historical_bars_alpaca(
                symbol,
                range=range,
                limit=limit,
            )

            if bars:
                return bars

        except Exception as e:
            print(
                f"Alpaca bars failed for {symbol}: {e}"
            )

        return get_historical_bars_yfinance(
            symbol,
            range=range,
            limit=limit,
        )

    else:
        try:
            bars = get_historical_bars_yfinance(
                symbol,
                range=range,
                limit=limit,
            )

            if bars:
                return bars

        except Exception as e:
            print(
                f"yfinance bars failed for {symbol}: {e}"
            )

        return get_historical_bars_alpaca(
            symbol,
            range=range,
            limit=limit,
        )


async def register_client(websocket: WebSocket):
    async with clients_lock:
        connected_clients[websocket] = asyncio.Lock()


async def unregister_client(websocket: WebSocket):
    global alpaca_task

    async with clients_lock:
        connected_clients.pop(websocket, None)

        # Stop the Alpaca stream when there is nobody watching the dashboard.
        if not connected_clients and alpaca_task:
            alpaca_task.cancel()
            alpaca_task = None


async def send_to_client(
    websocket: WebSocket,
    message: str,
):
    async with clients_lock:
        send_lock = connected_clients.get(websocket)

        if not send_lock:
            return

        async with send_lock:
            await websocket.send_text(message)


async def send_json_to_client(
    websocket: WebSocket,
    message: dict,
):
    async with clients_lock:
        send_lock = connected_clients.get(websocket)

        if not send_lock:
            return

        async with send_lock:
            await websocket.send_json(
                clean_json_value(message)
            )


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


async def send_snapshot_prices(websocket: WebSocket):
    # Send the cached prices for the whole stock pool when a user first connects.
    await ensure_snapshots_fresh()

    quotes = [
        _snapshot_cache[s]
        for s in stock_pool
        if s in _snapshot_cache
    ]

    failed_symbols = [
        s for s in stock_pool
        if s not in _snapshot_cache
    ]

    await send_json_to_client(
        websocket,
        {
            "type": "snapshot",
            "data": quotes,
            "source": "yfinance",
        },
    )

    if failed_symbols:
        await send_json_to_client(
            websocket,
            {
                "type": "error",
                "message": (
                    "Could not fetch stock snapshot for: "
                    + ", ".join(failed_symbols)
                ),
            },
        )


async def send_spark_history(websocket: WebSocket):
    # Sparklines use the small cached history instead of downloading charts again.
    await ensure_snapshots_fresh()

    await send_json_to_client(
        websocket,
        {
            "type": "history",
            "data": _spark_cache,
            "range": "1M",
            "source": "yfinance",
        },
    )


async def send_historical_candles(
    websocket: WebSocket,
    symbols: Optional[list[str]] = None,
    range: str = "1D",
):
    symbols = symbols or stock_pool

    # Fetch multiple symbols at the same time so changing a chart does not
    # block on each stock request one by one.
    results = await asyncio.gather(
        *[
            asyncio.to_thread(
                get_historical_bars,
                s,
                range,
                1800,
            )
            for s in symbols
        ],
        return_exceptions=True,
    )

    payload = {}
    failed_symbols = []

    for symbol, result in zip(symbols, results):
        if isinstance(result, Exception):
            print(
                f"Historical bars fetch failed for {symbol}: {result}"
            )
            failed_symbols.append(symbol)
            continue

        payload[symbol] = result

    await send_json_to_client(
        websocket,
        {
            "type": "history",
            "data": payload,
            "range": range,
            "source": (
                "alpaca"
                if get_market_status() == "OPEN"
                else "yfinance"
            ),
        },
    )

    if failed_symbols:
        await send_json_to_client(
            websocket,
            {
                "type": "error",
                "message": (
                    "Could not fetch chart data for: "
                    + ", ".join(failed_symbols)
                ),
            },
        )


async def run_alpaca_connection():
    while True:
        try:
            async with websockets.connect(
                ALPACA_DATA_WS_URL,
                ping_interval=20,
                ping_timeout=20,
            ) as alpaca_ws:

                print("Connected to Alpaca data stream")

                await alpaca_ws.send(
                    json.dumps({
                        "action": "auth",
                        "key": ALPACA_API_KEY,
                        "secret": ALPACA_API_SECRET,
                    })
                )

                await alpaca_ws.recv()

                # Subscribe only to the smaller set of stocks used for live updates.
                await alpaca_ws.send(
                    json.dumps({
                        "action": "subscribe",
                        "trades": stream_pool,
                        "bars": stream_pool,
                    })
                )

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
                            # Forward each live trade to all connected dashboard clients.
                            symbol = msg.get("S")
                            price = msg.get("p")

                            await broadcast_to_clients(
                                json.dumps({
                                    "type": "trade",
                                    "data": {
                                        "s": symbol,
                                        "p": price,
                                        "size": msg.get("s"),
                                        "t": msg.get("t"),
                                    },
                                })
                            )

                            if symbol and price is not None:
                                # Check whether this live price triggers a user alert.
                                asyncio.create_task(
                                    asyncio.to_thread(
                                        CheckAndTriggerAlertsController().check,
                                        symbol,
                                        float(price),
                                        previous_close_cache.get(symbol),
                                    )
                                )

                        elif msg_type == "b":
                            # Send the latest one-minute OHLCV bar to the frontend.
                            await broadcast_to_clients(
                                json.dumps({
                                    "type": "bar",
                                    "data": {
                                        "s": msg.get("S"),
                                        "open": msg.get("o"),
                                        "high": msg.get("h"),
                                        "low": msg.get("l"),
                                        "close": msg.get("c"),
                                        "volume": msg.get("v"),
                                        "t": msg.get("t"),
                                    },
                                })
                            )

                        elif msg_type == "error":
                            print(
                                "Alpaca stream error:",
                                msg,
                            )

        except asyncio.CancelledError:
            print("Alpaca WebSocket task cancelled")
            raise

        except Exception as e:
            print(
                f"Alpaca connection error: {e}"
            )
            await asyncio.sleep(5)


async def ensure_alpaca_connection():
    global alpaca_task

    async with clients_lock:
        if not alpaca_task or alpaca_task.done():
            alpaca_task = asyncio.create_task(
                run_alpaca_connection()
            )


async def periodic_snapshot_broadcast():
    # Keep the full stock pool updated even though only part of it uses the live stream.
    while True:
        market_open = get_market_status() == "OPEN"

        await asyncio.sleep(
            60 if market_open else 300
        )

        async with clients_lock:
            clients = list(connected_clients.keys())

        if not clients:
            return

        try:
            await ensure_snapshots_fresh()

            quotes = [
                _snapshot_cache[s]
                for s in stock_pool
                if s in _snapshot_cache
            ]

            if quotes:
                msg = json.dumps(
                    clean_json_value({
                        "type": "snapshot",
                        "data": quotes,
                        "source": "yfinance",
                    })
                )

                for ws in clients:
                    try:
                        await send_to_client(ws, msg)
                    except Exception:
                        pass

        except Exception as e:
            print(
                f"Periodic snapshot broadcast error: {e}"
            )


@router.get("/stocks/sectors")
def rest_stock_sectors():
    # Return the available sectors together with the number of stocks in the pool.
    return {
        "success": True,
        "count": len(stock_pool),
        "sectors": SECTOR_POOLS,
    }


@router.get("/stocks/snapshot/{symbol}")
def rest_stock_snapshot(symbol: str):
    try:
        data = get_snapshot_yfinance(
            symbol.upper()
        )

        if data.get("p") is None:
            return {
                "success": False,
                "message": (
                    f"No data found for {symbol.upper()}"
                ),
            }

        return {
            "success": True,
            "data": clean_json_value(data),
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
        }


@router.get("/stocks/candles/{symbol}")
def rest_stock_candles(
    symbol: str,
    range: str = "1D",
):
    try:
        bars = get_historical_bars_yfinance(
            symbol.upper(),
            range=range,
        )

        return {
            "success": True,
            "candles": bars,
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
        }


@router.get("/stocks/dashboard-access/{symbol}")
def check_dashboard_access(
    symbol: str,
    current_user: dict = Depends(get_current_user),
):
    # Check the user's free dashboard quota before allowing another stock dashboard view.
    symbol = symbol.upper()

    quota = DashboardUsage.check(
        current_user["user_id"],
        symbol,
    )

    if not quota["allowed"]:
        return {
            "success": False,
            "limit_reached": True,
            "views_used": quota["views_used"],
            "views_limit": quota["limit"],
            "message": (
                "Free dashboard limit reached. "
                "Upgrade to Premium for unlimited stock dashboards."
            ),
        }

    usage = DashboardUsage.record_view(
        current_user["user_id"],
        symbol,
    )

    return {
        "success": True,
        "limit_reached": False,
        "views_used": usage["views_used"],
        "views_limit": usage["limit"],
    }


@router.get("/stocks/dashboard-usage")
def dashboard_usage(
    current_user: dict = Depends(get_current_user),
):
    # Return the current user's dashboard usage for the basic plan.
    return {
        "success": True,
        **DashboardUsage.get_usage(
            current_user["user_id"]
        ),
    }


@router.websocket("/ws/stocks")
async def websocket_endpoint(
    websocket: WebSocket,
):
    await websocket.accept()

    if not ALPACA_API_KEY or not ALPACA_API_SECRET:
        await websocket.send_json({
            "type": "error",
            "message": (
                "Missing ALPACA_API_KEY or ALPACA_API_SECRET "
                "in backend .env"
            ),
        })

        await websocket.close()
        return

    await register_client(websocket)

    try:
        market = get_market_status()

        # Send the initial stock data before waiting for live updates.
        await send_snapshot_prices(websocket)

        # Sparklines are loaded from the existing batch cache.
        await send_spark_history(websocket)

        # Let the frontend know whether the US market is currently open.
        await send_json_to_client(
            websocket,
            {
                "type": "market_status",
                "status": market,
            },
        )

        if market == "OPEN":
            await ensure_alpaca_connection()

        else:
            print(
                "Market closed — using yfinance snapshots "
                "with periodic refresh"
            )

        # Keep refreshing the full stock list in the background.
        asyncio.create_task(
            periodic_snapshot_broadcast()
        )

        while True:
            raw_message = await websocket.receive_text()

            try:
                message = json.loads(raw_message)

            except json.JSONDecodeError:
                continue

            if message.get("type") == "range":
                requested_symbol = str(
                    message.get("symbol", "")
                ).upper()

                requested_range = str(
                    message.get("range", "1D")
                ).upper()

                if requested_symbol not in stock_pool:
                    await send_json_to_client(
                        websocket,
                        {
                            "type": "error",
                            "message": (
                                f"Unsupported symbol: "
                                f"{requested_symbol}"
                            ),
                        },
                    )
                    continue

                if requested_range not in {
                    "1D",
                    "1W",
                    "1M",
                    "3M",
                    "6M",
                    "1Y",
                }:
                    requested_range = "1D"

                await send_historical_candles(
                    websocket,
                    symbols=[requested_symbol],
                    range=requested_range,
                )

    except WebSocketDisconnect:
        print(
            "Frontend WebSocket disconnected"
        )

    finally:
        await unregister_client(websocket)