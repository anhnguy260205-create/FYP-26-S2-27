import { motion, AnimatePresence } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import {
    Bot, Send, MessageSquare, TrendingUp, Brain,
    BarChart3, ChevronLeft, Loader2, User, Trash2,
    RefreshCw, ChevronDown
} from "lucide-react";
import useLiveStocks from "../../api/useLiveStocks.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = "http://127.0.0.1:8000";
const CHAT_STORAGE_VERSION = "chatbot-session-reset-v2";
const CHAT_VERSION_KEY = "rocketTradeAiChatVersion";
const CHAT_ACTIVE_USER_KEY = "rocketTradeAiChatActiveUser";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "AMD"];
const COMPANY_NAMES = {
    AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet/Google", AMZN: "Amazon",
    NVDA: "NVIDIA", META: "Meta", TSLA: "Tesla", AVGO: "Broadcom",
    ORCL: "Oracle", AMD: "AMD",
};

const QUICK_PROMPTS = [
    { label: "Analyze NVDA for me", icon: <TrendingUp size={14} /> },
    { label: "What is the RSI indicator?", icon: <Brain size={14} /> },
    { label: "Explain portfolio diversification", icon: <BarChart3 size={14} /> },
    { label: "What is a bull vs bear market?", icon: <TrendingUp size={14} /> },
    { label: "How do I read a candlestick chart?", icon: <BarChart3 size={14} /> },
    { label: "What is market capitalisation?", icon: <Brain size={14} /> },
];


const STOCK_NAME_ALIASES = {
    apple: "AAPL", aapl: "AAPL",
    microsoft: "MSFT", msft: "MSFT",
    google: "GOOGL", alphabet: "GOOGL", googl: "GOOGL", goog: "GOOG",
    amazon: "AMZN", amzn: "AMZN",
    nvidia: "NVDA", nvda: "NVDA",
    meta: "META", facebook: "META",
    tesla: "TSLA", tsla: "TSLA",
    broadcom: "AVGO", avgo: "AVGO",
    oracle: "ORCL", orcl: "ORCL",
    amd: "AMD",
    netflix: "NFLX", nflx: "NFLX",
    palantir: "PLTR", pltr: "PLTR",
    shopify: "SHOP", shop: "SHOP",
    shopee: "SE", sea: "SE", se: "SE",
    disney: "DIS", dis: "DIS",
    walmart: "WMT", wmt: "WMT",
    costco: "COST", cost: "COST",
    visa: "V", mastercard: "MA",
    coca: "KO", coke: "KO",
    jpmorgan: "JPM", jpm: "JPM",
    berkshire: "BRK.B",
};

function normaliseQuery(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim();
}

const TICKER_STOP_WORDS = new Set([
    "I", "A", "AN", "THE", "FOR", "TO", "BUY", "SELL", "HOLD", "UP", "DOWN",
    "AI", "API", "RSI", "MACD", "ETF", "USD", "CEO", "CFO", "IPO", "DCA",
]);

function detectRequestedStockSymbol(text) {
    const original = String(text || "");
    const q = normaliseQuery(original);
    const words = q.split(" ").filter(Boolean);

    for (const word of words) {
        const alias = STOCK_NAME_ALIASES[word];
        if (alias) {
            const platformSymbol = alias === "GOOG" ? "GOOGL" : alias;
            return { symbol: platformSymbol.toUpperCase(), supported: SYMBOLS.includes(platformSymbol.toUpperCase()) };
        }
    }

    const tickerMatches = original.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g) || [];
    for (const raw of tickerMatches) {
        const symbol = raw.toUpperCase();
        if (TICKER_STOP_WORDS.has(symbol)) continue;
        return { symbol, supported: SYMBOLS.includes(symbol) };
    }

    return null;
}

function detectStockSymbol(text) {
    const detected = detectRequestedStockSymbol(text);
    return detected?.supported ? detected.symbol : null;
}

function isStockSpecificQuestion(text) {
    const q = normaliseQuery(text);
    const detected = detectRequestedStockSymbol(text);
    if (!detected?.symbol) return false;

    return /\b(analy[sz]e|stock|price|doing|confidence|going up|invest|buy|sell|hold|signal|prediction|forecast|outlook|trend|performance)\b/.test(q);
}

function isInvestmentPickQuestion(text) {
    const q = normaliseQuery(text);
    return (
        /what stocks? should i invest/.test(q) ||
        /what should i invest/.test(q) ||
        /which stocks? should i buy/.test(q) ||
        /recommend stocks?/.test(q) ||
        /stock recommendations?/.test(q) ||
        /stock reccomendations?/.test(q) ||
        /stocks? recommendations?/.test(q) ||
        /stocks? reccomendations?/.test(q) ||
        /stocks? to invest/.test(q)
    );
}

function getLatestStockSnapshot(liveStocks, liveCandles, symbol) {
    const quote = liveStocks?.[symbol];
    const candles = liveCandles?.[symbol];

    // Prefer the websocket snapshot because it has price/open/high/low/volume immediately.
    if (quote && (quote.price || quote.p || quote.close)) {
        const price = Number(quote.price ?? quote.p ?? quote.close ?? 0);
        const open = Number(quote.open ?? quote.previousClose ?? quote.close ?? price);
        const high = Number(quote.high ?? Math.max(price, open));
        const low = Number(quote.low ?? Math.min(price, open));
        const volume = Number(quote.volume ?? quote.avgVolume ?? 0);
        const change = price - open;
        const pct = open ? (change / open) * 100 : 0;

        if (Number.isFinite(price) && price > 0) {
            return {
                symbol,
                name: COMPANY_NAMES[symbol] || symbol,
                price,
                open,
                high,
                low,
                volume,
                change,
                pct,
            };
        }
    }

    // Fallback to candles if the snapshot object is not ready yet.
    if (!Array.isArray(candles) || candles.length === 0) return null;

    const last = candles[candles.length - 1] || {};
    const prev = candles.length >= 2 ? candles[candles.length - 2] || {} : {};
    const price = Number(last.close ?? last.price ?? last.c ?? 0);
    const open = Number(last.open ?? last.o ?? prev.close ?? prev.price ?? price);
    const high = Number(last.high ?? last.h ?? Math.max(price, open));
    const low = Number(last.low ?? last.l ?? Math.min(price, open));
    const volume = Number(last.volume ?? last.v ?? 0);
    const change = price - open;
    const pct = open ? (change / open) * 100 : 0;

    if (!Number.isFinite(price) || price <= 0) return null;

    return {
        symbol,
        name: COMPANY_NAMES[symbol] || symbol,
        price,
        open,
        high,
        low,
        volume,
        change,
        pct,
    };
}

function formatMoney(value) {
    if (!Number.isFinite(value) || value <= 0) return "N/A";
    return `$${value.toFixed(2)}`;
}

function getUnsupportedDisplayName(symbol) {
    const names = {
        SE: "Sea Limited / Shopee",
        SHOP: "Shopify",
        NFLX: "Netflix",
        PLTR: "Palantir",
        DIS: "Disney",
        WMT: "Walmart",
        COST: "Costco",
        V: "Visa",
        MA: "Mastercard",
        KO: "Coca-Cola",
        JPM: "JPMorgan",
        "BRK.B": "Berkshire Hathaway",
    };
    return names[symbol] || symbol;
}

function isCompanyInfoOrInvestRequest(text) {
    const q = normaliseQuery(text);
    return /\b(share|tell me|about|business|company|what does|how does|should i invest|invest in it|worth investing|worth buying|buy it|buy this)\b/.test(q);
}

function buildShopeeCompanyReply() {
    return {
        content: `Here’s the useful way to think about Sea Limited / Shopee before considering the stock.

Quick take:
• Shopee is Sea Limited’s e-commerce marketplace brand.
• Sea Limited is not only Shopee — it also has Garena for gaming and SeaMoney for digital financial services.
• The stock case depends on whether Sea can grow while keeping margins and cash flow healthy.

What to check:
• Shopee’s revenue growth, profitability, and spending on promotions.
• Competition from Lazada, TikTok Shop, and other regional marketplaces.
• Garena and SeaMoney performance, because they also affect Sea Limited’s overall stock.

Watch out for:
• Treating a popular app as the same thing as a good investment.
• High competition reducing margins.
• Valuation rising faster than the business fundamentals.

Next step:
Use this as a checklist first, then compare Sea Limited against another e-commerce or tech company.

Educational only, not financial advice.`,
    };
}

function buildUnsupportedStockReply(symbol, question = "") {
    const displayName = getUnsupportedDisplayName(symbol);

    if (symbol === "SE" && isCompanyInfoOrInvestRequest(question)) {
        return buildShopeeCompanyReply();
    }

    if (symbol === "SE") {
        return {
            content: `${displayName} (${symbol}) is not in RocketTrade’s live stock feed right now.

Quick take:
• Shopee is Sea Limited’s e-commerce marketplace brand.
• Sea Limited also includes Garena and SeaMoney, so SE is not a pure Shopee-only stock.
• Without live platform data, it’s better to judge the business drivers instead of guessing the price move.

What to check:
• Recent earnings results and management outlook.
• Shopee’s growth, margins, and competition.
• Garena and SeaMoney performance, because they also affect SE.

Watch out for:
• Chasing the stock just because the Shopee brand is popular.
• Ignoring valuation and profitability.
• Putting too much money into one company or sector.

Next step:
Ask me to compare Sea Limited with another company, or ask for a simple SE research checklist.

Educational only, not financial advice.`,
        };
    }

    if (isCompanyInfoOrInvestRequest(question)) {
        return {
            content: `${displayName} (${symbol}) is not in RocketTrade’s live stock feed right now.

Quick take:
• I can still help you understand the company and how to research it.
• Start with its business model, revenue growth, profitability, and competitive position.
• For the investment angle, focus on whether the business quality matches your risk level.

What to check:
• Latest earnings results and management outlook.
• Profit margins, debt levels, and free cash flow.
• Main competitors and whether the company has a strong advantage.

Watch out for:
• Buying only because the brand is popular.
• Ignoring valuation if the stock already looks expensive.
• Putting too much money into one company.

Next step:
Ask me for a simple research checklist for ${displayName}.

Educational only, not financial advice.`,
        };
    }

    return {
        content: `${displayName} (${symbol}) is not in RocketTrade’s live stock feed right now.

Quick take:
• I do not have a live platform price for this ticker here.
• You can still review the company’s business model, growth, margins, and risks.
• Avoid guessing the short-term stock move without updated data.

What to check:
• Recent earnings results and management outlook.
• Revenue growth, profit margin, cash flow, and debt.
• Whether the stock fits your risk level and time horizon.

Watch out for:
• Chasing a stock only because the brand is popular.
• Ignoring valuation if the business already looks expensive.
• Putting too much money into one company or sector.

Next step:
Ask me about the business model, risks, or what metrics to check for ${displayName}.

Educational only, not financial advice.`,
    };
}

function buildStockSpecificReply(question, liveStocks, liveCandles) {
    const detected = detectRequestedStockSymbol(question);
    if (!detected?.symbol) return null;

    const symbol = detected.symbol;
    if (!detected.supported) return buildUnsupportedStockReply(symbol, question);

    const snapshot = getLatestStockSnapshot(liveStocks, liveCandles, symbol);
    const predictionRoute = `/investor/realtimedashboard/astockdashboard/${encodeURIComponent(symbol)}`;

    if (!snapshot) {
        return {
            content: `I can help with ${symbol}, but the live stock feed has not loaded the price yet.

Quick take:
• Wait a few seconds for the ticker strip at the top to load.
• Refresh the page if the ticker strip stays empty.
• Once the live price appears, ask me again and I’ll summarise the move.

What to check:
• Use the AI Prediction page for signals and confidence when you want the model view.

Educational only, not financial advice.`,
            cta: {
                label: `View ${symbol} AI Prediction`,
                route: predictionRoute,
                symbol,
            },
        };
    }

    const direction = snapshot.pct >= 0 ? "up" : "down";
    const arrow = snapshot.pct >= 0 ? "▲" : "▼";
    const moveText = `${arrow} ${Math.abs(snapshot.pct).toFixed(2)}%`;
    const volumeText = snapshot.volume ? snapshot.volume.toLocaleString() : "N/A";

    return {
        content: `${snapshot.name} (${symbol}) is currently ${direction} based on the latest data loaded in RocketTrade.

Quick take:
• Latest price: ${formatMoney(snapshot.price)}
• Move from open: ${moveText}
• Day range: ${formatMoney(snapshot.low)} to ${formatMoney(snapshot.high)}
• Volume: ${volumeText}

What to check:
• Compare the price move with volume before making any decision.
• Check recent news if the move looks unusually large.
• Use the AI Prediction page when you want the platform’s signal/confidence.

Educational only, not financial advice.`,
        cta: {
            label: `View ${symbol} AI Prediction`,
            route: predictionRoute,
            symbol,
        },
    };
}

function buildInvestmentFrameworkReply() {
    return `I can’t pick stocks for you directly, but I can help you narrow your shortlist.

Quick take:
• Decide your goal first: growth, income, or lower risk.
• Pick sectors you understand, like tech, healthcare, banks, or consumer staples.
• Compare revenue growth, debt, profit margin, valuation, and recent trend.

What to check:
• Use RocketTrade’s AI Prediction page for stock-specific signals.
• Use the real-time dashboard to check price movement and volume.
• Avoid choosing only one stock because concentration risk can be high.

Next step:
Tell me your risk level and time horizon, and I’ll help you build a research checklist.

Educational only, not financial advice.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStockContext(liveStocks, liveCandles) {
    const lines = SYMBOLS.map(sym => {
        const snapshot = getLatestStockSnapshot(liveStocks, liveCandles, sym);
        if (!snapshot) return null;
        return `${sym} (${COMPANY_NAMES[sym]}): $${snapshot.price.toFixed(2)} (${snapshot.pct >= 0 ? "+" : ""}${snapshot.pct.toFixed(2)}%), volume ${(snapshot.volume || 0).toLocaleString()}`;
    }).filter(Boolean);
    return lines.length
        ? `\n\nLive market snapshot loaded in RocketTrade:\n${lines.join("\n")}`
        : "";
}

function buildSystemPrompt(user, stockContext) {
    return `You are the RocketTrade AI Assistant — a friendly financial education chatbot inside RocketTrade.

User information:
- Name: ${user?.full_name || user?.username || "Investor"}
- Role: Investor / Trader (not admin or consultant)

Main style goal:
Sound like a helpful friend/tutor, not a research report. Keep the same simple structure across answers so the chat feels consistent.

Core response structure:
1. Start with ONE casual sentence that directly answers the user.
2. Add one blank line.
3. Use plain section labels ending with a colon, like "Quick take:". Never use markdown bold.
4. Under each label, use 2–4 bullet points maximum, using the bullet symbol "•".
5. Add one blank line between sections.
6. End with one natural next step or follow-up question only when useful.
7. Keep most replies under 120 words unless the user asks for a full breakdown.

Allowed section labels:
- "Quick take:"
- "What to check:"
- "Watch out for:"
- "Example:"
- "Next step:"

Formatting rules:
- Never use **bold**, markdown tables, numbered essay sections, or long report headings.
- Never write labels as "**Quick take:**". Write "Quick take:" only.
- Keep one idea per bullet.
- Use short paragraphs, not big blocks of text.

Avoid robotic report formatting:
- Do NOT use long headings like "Financial Highlights", "Market Sentiment", "RocketTrade Insights", "Fundamental Analysis", or "Current Live Price Data" unless the user asks for a formal report.
- Do NOT dump many stock tickers in long lists.
- Do NOT overuse the user's name. Use their name in the greeting only, not every answer.
- Never mention subscription plans, access tiers, Basic users, Premium users, or plan limitations. The chatbot must answer the same way for all logged-in users.
- If live data is missing, simply say "I don’t have enough live data here to give an exact score.".

Investment advice safety:
- Do not tell the user exactly what to buy or sell.
- For stock-specific questions, do not invent predictions or confidence scores. Use only live market snapshot values if provided, and point users to RocketTrade's AI Prediction page for signals.
- If asked "what should I invest in", give a short framework, not a long ticker list.
- Avoid giving fake confidence scores, ratings, exact live prices, target prices, or future predictions unless those numbers are provided in the live market snapshot.
- For stock-specific answers, include this short disclaimer only once: "Educational only, not financial advice."

Context handling:
- Remember the chat context. If the user says "give me an example", continue from the previous topic.
- For candlestick or investing concepts, explain with small examples, not a textbook essay.
- If API/data is unavailable, say: "Please wait a little and try again. A shorter question may also help it go through faster."

Example style for "what stocks should I invest in":
"I can’t pick stocks for you directly, but I can help you build a sensible shortlist.

Quick take:
• Start with your goal: growth, income, or lower risk.
• Pick 2–3 sectors you understand, like tech, healthcare, or consumer staples.
• Compare companies by revenue growth, debt, profit margin, and recent trend.

Next step:
Tell me your risk level and time horizon, and I’ll help you narrow down what to research.

Educational only, not financial advice."

Scope:
- Help with stocks, investing, trading strategies, technical/fundamental analysis, market terms, and RocketTrade platform features.
- Politely redirect unrelated topics back to finance or RocketTrade.
- Do not explain feature availability by account type. Do not say that the user is Basic or Premium.
${stockContext}`;
}


function cleanChatHistoryText(text) {
    return String(text || "")
        .replace(/since I'?m a Basic plan user,?\s*/gi, "")
        .replace(/as a Basic plan user,?\s*/gi, "")
        .replace(/Basic plan user/gi, "user")
        .replace(/Premium plan user/gi, "user")
        .replace(/\*\*/g, "");
}

function cleanAssistantReply(text) {
    return String(text || "")
        .replace(/\*\*/g, "")
        .replace(/Educational only — not financial advice\./g, "Educational only, not financial advice.")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}


function makeWelcomeMessage(user) {
    return {
        role: "assistant",
        content: `Hello${user?.full_name ? `, ${user.full_name}` : ""}! 👋 I'm the RocketTrade AI Assistant.\n\nI can help you with:\n• Stock analysis and market data\n• Investment concepts & terminology\n• Technical & fundamental analysis\n• Understanding the RocketTrade platform\n\nWhat would you like to know?`
    };
}

function getChatStorageKey(user) {
    const id = user?.user_id || user?.id || user?.username || user?.email || "guest";
    return `rocketTradeAiChat:${id}`;
}

function clearRocketTradeAiChatStorage() {
    try {
        Object.keys(sessionStorage)
            .filter(key => key.startsWith("rocketTradeAiChat"))
            .forEach(key => sessionStorage.removeItem(key));
    } catch { }
}

function isEndChatRequest(text) {
    const q = normaliseQuery(text);
    return ["end", "end chat", "end the chat", "stop chat", "close chat", "new chat", "reset chat", "clear chat"].includes(q);
}

function loadSavedChat(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        return parsed
            .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .map(m => ({
                role: m.role,
                content: cleanAssistantReply(m.content),
                cta: m.cta && m.cta.route && m.cta.label ? m.cta : undefined,
            }));
    } catch {
        return null;
    }
}

function toAssistantMessage(reply) {
    if (typeof reply === "string") {
        return { role: "assistant", content: cleanAssistantReply(reply) };
    }
    return {
        role: "assistant",
        content: cleanAssistantReply(reply?.content || ""),
        cta: reply?.cta,
    };
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingDots() {
    return (
        <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
            {[0, 1, 2].map(i => (
                <motion.span key={i}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.5)", display: "block" }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </div>
    );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
    const navigate = useNavigate();
    const isUser = msg.role === "user";
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: "10px",
            }}
        >
            {!isUser && (
                <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#155dfc,#0092b8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Bot size={16} />
                </div>
            )}
            <div style={{
                maxWidth: "72%",
                padding: "13px 16px",
                borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isUser
                    ? "linear-gradient(135deg,#155dfc,#0092b8)"
                    : "rgba(255,255,255,0.07)",
                border: isUser ? "none" : "1px solid rgba(255,255,255,0.09)",
                fontSize: "14px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            }}>
                {msg.content}
                {!isUser && msg.cta?.route && msg.cta?.label && (
                    <button
                        type="button"
                        onClick={() => navigate(msg.cta.route, { state: { selectedSymbol: msg.cta.symbol } })}
                        style={{
                            marginTop: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            padding: "8px 11px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg,#155dfc,#0092b8)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 600,
                            whiteSpace: "normal",
                            maxWidth: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                        }}
                    >
                        {msg.cta.label}
                    </button>
                )}
            </div>
            {isUser && (
                <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <User size={15} />
                </div>
            )}
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AIChatbot() {
    const navigate = useNavigate();
    const stockContext = useLiveStocks() || {};
    const liveStocks = stockContext.stocks || {};
    const liveCandles = stockContext.candles || {};
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    const chatStorageKey = getChatStorageKey(currentUser);
    const activeUserKey = currentUser?.user_id || currentUser?.id || currentUser?.username || currentUser?.email || "guest";

    // One-time cleanup for older chatbot versions so stale history from previous patches disappears.
    // Also start clean if a different account opens the chatbot in the same browser session.
    try {
        const savedVersion = sessionStorage.getItem(CHAT_VERSION_KEY);
        const previousActiveUser = sessionStorage.getItem(CHAT_ACTIVE_USER_KEY);

        if (savedVersion !== CHAT_STORAGE_VERSION) {
            clearRocketTradeAiChatStorage();
            sessionStorage.setItem(CHAT_VERSION_KEY, CHAT_STORAGE_VERSION);
        } else if (previousActiveUser && previousActiveUser !== String(activeUserKey)) {
            clearRocketTradeAiChatStorage();
            sessionStorage.setItem(CHAT_VERSION_KEY, CHAT_STORAGE_VERSION);
        }

        sessionStorage.setItem(CHAT_ACTIVE_USER_KEY, String(activeUserKey));
    } catch { }

    const [messages, setMessages] = useState(() => loadSavedChat(chatStorageKey) || [makeWelcomeMessage(currentUser)]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showScroll, setShowScroll] = useState(false);

    // Save the chat for the current logged-in browser session so users can leave the page,
    // refresh, or visit the dashboard and still come back to the same chat.
    // It resets when they click End chat, type "end", switch account, log out,
    // or the browser session ends.
    useEffect(() => {
        try {
            sessionStorage.setItem(chatStorageKey, JSON.stringify(messages));
        } catch (err) {
            console.warn("Could not save chatbot history", err);
        }
    }, [chatStorageKey, messages]);

    const handleScroll = useCallback((e) => {
        const el = e.currentTarget;
        setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    }, []);

    const sendMessage = useCallback(async (text) => {
        const trimmed = (text || input).trim();
        if (!trimmed || loading) return;

        if (isEndChatRequest(trimmed)) {
            abortRef.current?.abort();
            try {
                sessionStorage.removeItem(chatStorageKey);
            } catch { }
            setInput("");
            setError(null);
            setLoading(false);
            setMessages([makeWelcomeMessage(currentUser)]);
            return;
        }

        setInput("");
        setError(null);

        const userMsg = { role: "user", content: trimmed };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setLoading(true);

        const localReply = isInvestmentPickQuestion(trimmed)
            ? buildInvestmentFrameworkReply()
            : isStockSpecificQuestion(trimmed)
                ? buildStockSpecificReply(trimmed, liveStocks, liveCandles)
                : null;

        if (localReply) {
            const assistantMsg = toAssistantMessage(localReply);
            window.setTimeout(() => {
                setMessages(prev => [...prev, assistantMsg]);
                setLoading(false);
            }, 250);
            return;
        }

        // Build history for API (exclude system-level welcome if desired)
        const history = nextMessages.map(m => ({ role: m.role, content: cleanChatHistoryText(m.content) }));
        const stockCtx = buildStockContext(liveStocks, liveCandles);
        const systemPrompt = buildSystemPrompt(currentUser, stockCtx);

        abortRef.current = new AbortController();

        try {
            const res = await fetch("http://127.0.0.1:8000/chatbot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abortRef.current.signal,
                body: JSON.stringify({
                    system: systemPrompt,
                    messages: history,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const apiError = new Error(err?.message || err?.detail || `API error ${res.status}`);
                apiError.status = res.status;
                apiError.payload = err;
                throw apiError;
            }

            const data = await res.json();
            const reply = cleanAssistantReply(data.reply || "Hmm, I could not generate a proper reply. Try asking it in a shorter way?");

            setMessages(prev => [...prev, { role: "assistant", content: reply }]);
        } catch (err) {
            if (err.name === "AbortError") return;
            console.error(err);

            const isRateLimit = err.status === 429 || String(err.message || "").toLowerCase().includes("rate");
            const friendlyReply = isRateLimit
                ? "Please wait a little and try again. A shorter question may also help it go through faster."
                : "Something went wrong on my side. Your message was not lost — try again in a moment, or shorten the question a little.";

            setError(isRateLimit ? "Please try again later." : "Something went wrong. Please try again.");
            setMessages(prev => [...prev, { role: "assistant", content: friendlyReply }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, messages, liveStocks, liveCandles, currentUser]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const endChat = () => {
        abortRef.current?.abort();
        setLoading(false);
        setError(null);
        try {
            sessionStorage.removeItem(chatStorageKey);
        } catch { }
        setMessages([makeWelcomeMessage(currentUser)]);
    };

    // Live price ticker strip
    const liveStrip = SYMBOLS.map(sym => {
        const snapshot = getLatestStockSnapshot(liveStocks, liveCandles, sym);
        if (!snapshot) return null;
        return { sym, price: snapshot.price, pct: snapshot.pct };
    }).filter(Boolean);

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />

            {/* Live ticker strip — auto-scrolling marquee */}
            {liveStrip.length > 0 && (
                <div style={{
                    background: "rgba(0,0,0,0.3)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    padding: "6px 0",
                    overflow: "hidden",
                    position: "relative",
                }}>
                    <div className="ticker-track">
                        {[...liveStrip, ...liveStrip].map(({ sym, price, pct }, i) => (
                            <span key={`${sym}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}>
                                <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{sym}</span>
                                <span style={{ color: "#e2e8f0" }}>${price.toFixed(2)}</span>
                                <span style={{ color: pct >= 0 ? "#34d399" : "#f87171" }}>
                                    {pct >= 0 ? "▲" : "▼"}{Math.abs(pct).toFixed(2)}%
                                </span>
                                <span style={{ color: "rgba(255,255,255,0.12)", margin: "0 10px" }}>•</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <main className="flex-1 p-5" style={{ minHeight: 0 }}>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "240px 1fr",
                    gap: "20px",
                    height: "calc(100vh - 200px)",
                    maxHeight: "1300px",
                }}>

                    {/* ── SIDEBAR ── */}
                    <div style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                        overflow: "hidden",
                        height: "100%",
                    }}>


                        {/* Bot avatar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: "50%",
                                background: "linear-gradient(135deg,#155dfc,#0092b8)",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                <Bot size={18} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: "14px" }}>AI Assistant</div>
                                <div style={{ fontSize: "11px", color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                                    Online
                                </div>
                            </div>
                        </div>

                        {/* Scrollable middle: quick prompts + topics */}
                        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Quick prompts */}
                            <div>
                                <p style={{ fontSize: "10px", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>SUGGESTED</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {QUICK_PROMPTS.map(({ label, icon }) => (
                                        <button key={label}
                                            onClick={() => sendMessage(label)}
                                            disabled={loading}
                                            style={{
                                                padding: "9px 10px", borderRadius: "10px", textAlign: "left",
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                fontSize: "12px", display: "flex", alignItems: "center", gap: "7px",
                                                color: "rgba(255,255,255,0.75)",
                                                cursor: loading ? "not-allowed" : "pointer",
                                                transition: "background 0.15s",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                                        >
                                            {icon}{label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Topics */}
                            <div style={{ marginTop: "auto" }}>
                                <p style={{ fontSize: "10px", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>TOPICS</p>
                                {[
                                    { icon: <TrendingUp size={13} />, label: "Stock Analysis" },
                                    { icon: <Brain size={13} />, label: "AI & Predictions" },
                                    { icon: <BarChart3 size={13} />, label: "Technical Analysis" },
                                    { icon: <MessageSquare size={13} />, label: "Investing Basics" },
                                ].map(({ icon, label }) => (
                                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                                        {icon}{label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* End chat */}
                        <button onClick={endChat}
                            style={{
                                display: "flex", alignItems: "center", gap: "3px", flexShrink: 0,
                                padding: "8px 12px", borderRadius: "10px", fontSize: "12px",
                                background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)",
                                color: "rgba(248,113,113,0.8)", cursor: "pointer",
                            }}>
                            <Trash2 size={13} /> End chat
                        </button>
                    </div>

                    {/* ── CHAT AREA ── */}
                    <div style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: "18px 24px",
                            borderBottom: "1px solid rgba(255,255,255,0.07)",
                            display: "flex", alignItems: "center", gap: "12px",
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: "50%",
                                background: "linear-gradient(135deg,#155dfc,#0092b8)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <Bot size={22} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontSize: "18px", fontWeight: 700 }}>RocketTrade AI Assistant</h1>
                                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                                    Ask about stocks, market trends, technical analysis, and more
                                </p>
                            </div>
                            <button onClick={endChat} title="End chat"
                                style={{ padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                                <RefreshCw size={15} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            onScroll={handleScroll}
                            style={{
                                flex: 1, overflowY: "auto", padding: "24px",
                                display: "flex", flexDirection: "column", gap: "16px",
                                scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent",
                            }}
                        >
                            <AnimatePresence initial={false}>
                                {messages.map((msg, i) => (
                                    <MessageBubble key={i} msg={msg} />
                                ))}
                                {loading && (
                                    <div key="typing"
                                        style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: "50%",
                                            background: "linear-gradient(135deg,#155dfc,#0092b8)",
                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                        }}>
                                            <Bot size={16} />
                                        </div>
                                        <div style={{
                                            padding: "13px 16px", borderRadius: "18px 18px 18px 4px",
                                            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)",
                                        }}>
                                            <TypingDots />
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>

                            {error && (
                                <div style={{
                                    padding: "12px 16px", borderRadius: "12px",
                                    background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                                    color: "#f87171", fontSize: "13px", textAlign: "center",
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>

                        {/* Scroll-to-bottom pill */}
                        <AnimatePresence>
                            {showScroll && (
                                <div
                                    style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "-8px" }}>
                                    <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                                        style={{
                                            padding: "5px 14px 5px 12px", borderRadius: "20px",
                                            background: "rgba(21,93,252,0.85)", border: "1px solid rgba(0,146,184,0.4)",
                                            fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer",
                                        }}>
                                        <ChevronDown size={13} /> Scroll to bottom
                                    </button>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Input */}
                        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    placeholder="Ask about a stock, indicator, strategy… (Enter to send, Shift+Enter for newline)"
                                    rows={1}
                                    style={{
                                        flex: 1, minHeight: "46px", maxHeight: "120px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        background: "rgba(255,255,255,0.05)",
                                        padding: "13px 16px",
                                        outline: "none",
                                        resize: "none",
                                        color: "white",
                                        fontSize: "14px",
                                        lineHeight: "1.5",
                                        overflowY: "auto",
                                        scrollbarWidth: "thin",
                                    }}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={loading || !input.trim()}
                                    style={{
                                        width: 46, height: 46, borderRadius: "12px",
                                        background: loading || !input.trim()
                                            ? "rgba(255,255,255,0.08)"
                                            : "linear-gradient(135deg,#155dfc,#0092b8)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                                        border: "none", flexShrink: 0,
                                        transition: "background 0.2s",
                                    }}
                                >
                                    {loading
                                        ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                                        : <Send size={18} />
                                    }
                                </button>
                            </div>
                            <p style={{ textAlign: "center", marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                                For educational purposes only · Not financial advice · Powered by RocketTrade AI
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .ticker-track {
                    display: inline-flex;
                    gap: 0;
                    animation: ticker-scroll 28s linear infinite;
                    will-change: transform;
                }
                .ticker-track:hover { animation-play-state: paused; }
                textarea::placeholder { color: rgba(255,255,255,0.3); }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
            `}</style>
        </motion.div>
    );
}

export default AIChatbot;
