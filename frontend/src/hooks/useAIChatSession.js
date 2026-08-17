import { useState, useRef, useEffect, useCallback } from "react";
import useLiveStocks from "../api/useLiveStocks.js";
import { SYMBOLS, COMPANY_NAMES, getLatestStockSnapshot } from "../utils/stockSnapshot.js";
import { authFetch } from "../api/apiClient.js";

// Constants

const CHAT_STORAGE_VERSION = "chatbot-session-reset-v2";
const CHAT_VERSION_KEY = "rocketTradeAiChatVersion";
const CHAT_ACTIVE_USER_KEY = "rocketTradeAiChatActiveUser";

export const QUICK_PROMPTS = [
    { label: "Analyze NVDA for me" },
    { label: "What is the RSI indicator?" },
    { label: "Explain portfolio diversification" },
    { label: "What is a bull vs bear market?" },
    { label: "How do I read a candlestick chart?" },
    { label: "What is market capitalisation?" },
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
    const predictionRoute = `/realtimedashboard/astockdashboard/${encodeURIComponent(symbol)}`;

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

// Helpers

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
- Do not personalize answers by the asker's own current plan — never say "since you're a Basic user" or "as a Premium user, you..." and never guess or state which plan the current user is on. Answer plan questions the same way for everyone, as general platform information (see "Platform plans" below), not as a status check on this user.
- If live data is missing, simply say "I don’t have enough live data here to give an exact score.".

Platform plans (answer these directly when asked — this is public pricing-page information, not personal account data):
- Free ("Starter") — $0, no card needed: limited AI stock recommendations, limited watchlist management, limited expert portfolio access, real-time market dashboard, Knowledge Hub access, AI chatbot, paper trading.
- Premium ("Pro") — $20.99/month, billed annually: everything in Free, plus unlimited AI stock predictions, expert consultation access, advanced portfolio analytics, and priority customer support.
- If asked "what do I get with Premium" or similar, answer with the Premium feature list above — do not deflect or say you lack this information.

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
- Help with stocks, investing, trading strategies, technical/fundamental analysis, market terms, and RocketTrade platform features — including what each plan includes, pricing, and how to upgrade (point them to the Subscription page).
- Politely redirect unrelated topics back to finance or RocketTrade.
- Do not state or guess which plan the current user is on, and do not explain a feature's availability as "you have this because you're Basic/Premium" — just describe what each plan includes when asked.
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
    } catch { /* sessionStorage unavailable — ignore */ }
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

// used by both the full AIChatbot page and the floating ChatWidget so they share 1 implementation
export function useAIChatSession() {
    const stockContext = useLiveStocks() || {};
    const liveStocks = stockContext.stocks || {};
    const liveCandles = stockContext.candles || {};
    const bottomRef = useRef(null);
    const abortRef = useRef(null);
    const sendingRef = useRef(false);

    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "null");
    const chatStorageKey = getChatStorageKey(currentUser);
    const activeUserKey = currentUser?.user_id || currentUser?.id || currentUser?.username || currentUser?.email || "guest";

    // one-time cleanup for older chatbot versions so stale history from previous patches disappears
    // also start clean if a different account opens the chatbot in the same browser session
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
    } catch { /* sessionStorage unavailable — ignore */ }

    const [messages, setMessages] = useState(() => loadSavedChat(chatStorageKey) || [makeWelcomeMessage(currentUser)]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showScroll, setShowScroll] = useState(false);


    const [chatUsage, setChatUsage] = useState(null);
    useEffect(() => {
        let cancelled = false;
        authFetch(`${import.meta.env.VITE_API_URL}/chatbot/usage`)
            .then(r => r.json())
            .then(res => { if (!cancelled && res?.success) setChatUsage(res); })
            .catch(() => { });
        return () => { cancelled = true; };
    }, []);
    const chatLimitReached = chatUsage?.premium === false
        && chatUsage.questions_used >= chatUsage.limit;

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
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading || sendingRef.current) return;
        sendingRef.current = true;

        if (isEndChatRequest(trimmed)) {
            abortRef.current?.abort();
            try {
                sessionStorage.removeItem(chatStorageKey);
            } catch { /* sessionStorage unavailable — ignore */ }
            setInput("");
            setError(null);
            setLoading(false);
            setMessages([makeWelcomeMessage(currentUser)]);
            sendingRef.current = false;
            return;
        }

        setInput("");
        setError(null);

        const userMsg = { role: "user", content: trimmed };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setLoading(true);

        if (chatLimitReached) {
            const limitMsg = toAssistantMessage({
                content: `You've used your ${chatUsage.limit} free chatbot questions. Upgrade to Premium for unlimited AI chat.`,
                cta: { route: "/investor/subscription", label: "Upgrade to Premium" },
            });
            window.setTimeout(() => {
                setMessages(prev => [...prev, limitMsg]);
                setLoading(false);
                sendingRef.current = false;
            }, 200);
            return;
        }

        const localReply = isInvestmentPickQuestion(trimmed)
            ? buildInvestmentFrameworkReply()
            : isStockSpecificQuestion(trimmed)
                ? buildStockSpecificReply(trimmed, liveStocks, liveCandles)
                : null;

        if (localReply) {
            // local reply skips Groq but still counts as 1 free question, so claim a slot first
            try {
                const res = await authFetch(`${import.meta.env.VITE_API_URL}/chatbot/reserve`, { method: "POST" });
                const data = await res.json().catch(() => ({}));

                if (data?.limit_reached) {
                    setChatUsage({ premium: false, questions_used: data.questions_used, limit: data.questions_limit });
                    const limitMsg = toAssistantMessage({
                        content: data.message || `You've used your ${data.questions_limit} free chatbot questions. Upgrade to Premium for unlimited AI chat.`,
                        cta: { route: "/investor/subscription", label: "Upgrade to Premium" },
                    });
                    setMessages(prev => [...prev, limitMsg]);
                    setLoading(false);
                    sendingRef.current = false;
                    return;
                }

                if (data.questions_used != null) {
                    setChatUsage({ premium: false, questions_used: data.questions_used, limit: data.questions_limit });
                }
            } catch {
                // reserve call failed, still answer locally instead of blocking on a network hiccup
            }

            const assistantMsg = toAssistantMessage(localReply);
            window.setTimeout(() => {
                setMessages(prev => [...prev, assistantMsg]);
                setLoading(false);
                sendingRef.current = false;
            }, 250);
            return;
        }

        // build history for API
        const history = nextMessages.map(m => ({ role: m.role, content: cleanChatHistoryText(m.content) }));
        const stockCtx = buildStockContext(liveStocks, liveCandles);
        const systemPrompt = buildSystemPrompt(currentUser, stockCtx);

        abortRef.current = new AbortController();

        try {
            const res = await authFetch(`${import.meta.env.VITE_API_URL}/chatbot/chat`, {
                method: "POST",
                signal: abortRef.current.signal,
                body: JSON.stringify({
                    system: systemPrompt,
                    messages: history,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (data?.limit_reached) {
                setChatUsage({ premium: false, questions_used: data.questions_used, limit: data.questions_limit });
                const limitMsg = toAssistantMessage({
                    content: data.message || "You've used your free chatbot questions. Upgrade to Premium for unlimited AI chat.",
                    cta: { route: "/investor/subscription", label: "Upgrade to Premium" },
                });
                setMessages(prev => [...prev, limitMsg]);
                return;
            }

            if (!res.ok) {
                const apiError = new Error(data?.message || data?.detail || `API error ${res.status}`);
                apiError.status = res.status;
                apiError.payload = data;
                throw apiError;
            }

            if (data.questions_used != null) {
                setChatUsage({ premium: false, questions_used: data.questions_used, limit: data.questions_limit });
            }

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
            sendingRef.current = false;
        }
    }, [input, loading, messages, liveStocks, liveCandles, currentUser, chatLimitReached, chatUsage]);

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
        } catch { /* sessionStorage unavailable — ignore */ }
        setMessages([makeWelcomeMessage(currentUser)]);
    };

    return {
        messages, input, setInput, loading, error,
        sendMessage, endChat, handleKeyDown, handleScroll, showScroll,
        bottomRef, liveStocks, liveCandles,
        chatUsage, chatLimitReached,
    };
}
