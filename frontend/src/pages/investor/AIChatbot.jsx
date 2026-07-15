import { motion, AnimatePresence } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useRef, useState } from "react";
import {
    Bot, Send, MessageSquare, TrendingUp, Brain,
    BarChart3, Loader2, Trash2, RefreshCw, ChevronDown
} from "lucide-react";
import { useAIChatSession, QUICK_PROMPTS } from "../../hooks/useAIChatSession.js";
import { MessageBubble, TypingDots } from "../../components/chat/ChatMessageBubble.jsx";

const QUICK_PROMPT_ICONS = [
    <TrendingUp size={14} key="tu1" />, <Brain size={14} key="br1" />, <BarChart3 size={14} key="bc1" />,
    <TrendingUp size={14} key="tu2" />, <BarChart3 size={14} key="bc2" />, <Brain size={14} key="br2" />,
];


// Basic (free) tier is limited to this many chatbot questions per session;
// premium users are unlimited. Resets when the session/chat storage resets.
const BASIC_QUESTION_LIMIT = 5;

// Platform "how do I…" help prompts — shown in their own sidebar section so
// users can quickly get unstuck on using RocketTrade itself, not just markets.
const PLATFORM_HELP_PROMPTS = [
    { label: "How do I buy my first stock?", icon: <MessageSquare size={14} /> },
    { label: "How does paper trading work?", icon: <MessageSquare size={14} /> },
    { label: "What do I get with Premium?", icon: <MessageSquare size={14} /> },
    { label: "How accurate are the AI predictions?", icon: <MessageSquare size={14} /> },
    { label: "How do I set a price alert?", icon: <MessageSquare size={14} /> },
    { label: "How do I ask a verified expert a question?", icon: <MessageSquare size={14} /> },
    { label: "What is the Quant Rating score?", icon: <MessageSquare size={14} /> },
    { label: "How do I leave a review of RocketTrade?", icon: <MessageSquare size={14} /> },
];

// ── Follow-up suggestion rules ────────────────────────────────────────────────
// Each rule has a priority score — higher = matched first when multiple rules fire.
// This prevents vague keywords like "market" from overriding specific ones like "alibaba".
const FOLLOW_UP_MAP = [
    // Specific companies — check first (priority 10)
    { priority: 10, keywords: ["alibaba","baba","lazada","taobao"],  suggestions: ["How does Alibaba make money?", "How does BABA compare to Amazon?", "What is Alibaba's main risk in China?"] },
    { priority: 10, keywords: ["nvda","nvidia"],                     suggestions: ["What sector is NVIDIA in?", "How does NVDA compare to AMD?", "What drives NVIDIA's revenue?"] },
    { priority: 10, keywords: ["aapl","apple","iphone"],             suggestions: ["What is Apple's main revenue driver?", "How does Apple's P/E compare to the sector?", "What is Apple's services segment?"] },
    { priority: 10, keywords: ["msft","microsoft","azure"],          suggestions: ["How does Azure affect Microsoft's earnings?", "What is Microsoft's dividend history?", "How does Microsoft compare to Google Cloud?"] },
    { priority: 10, keywords: ["amzn","amazon","aws"],               suggestions: ["What is AWS and why does it matter for Amazon?", "How does Amazon make money outside e-commerce?", "What is Amazon's P/E ratio?"] },
    { priority: 10, keywords: ["tsla","tesla"],                      suggestions: ["What drives Tesla's revenue?", "How does Tesla compare to other EV makers?", "What is Tesla's gross margin trend?"] },
    { priority: 10, keywords: ["meta","facebook","instagram"],       suggestions: ["What is Meta's main revenue source?", "How does Meta's ad platform work?", "What is Meta's P/E ratio?"] },
    { priority: 10, keywords: ["googl","google","alphabet"],         suggestions: ["What is Google's main business?", "How does Google Cloud compare to AWS?", "What is Alphabet's revenue breakdown?"] },
    { priority: 10, keywords: ["jd","jd.com","pinduoduo","pdd"],     suggestions: ["How does JD.com compare to Alibaba?", "What is Pinduoduo's business model?", "What are risks of investing in Chinese e-commerce?"] },
    { priority: 10, keywords: ["dbs","uob","ocbc","singapore bank"], suggestions: ["What drives Singapore bank profits?", "How does SIBOR affect Singapore banks?", "What is DBS's dividend yield?"] },

    // Technical indicators (priority 8)
    { priority: 8, keywords: ["rsi","relative strength index"],      suggestions: ["How do I spot RSI divergence?", "What RSI level means overbought?", "How does RSI combine with MACD?"] },
    { priority: 8, keywords: ["macd","moving average convergence"],  suggestions: ["What is a MACD crossover signal?", "How do I combine MACD with RSI?", "What timeframe is best for MACD?"] },
    { priority: 8, keywords: ["candlestick","doji","hammer","engulf","candle pattern"], suggestions: ["What is a bullish engulfing pattern?", "How do I spot a doji candle?", "What does a hammer candle signal?"] },
    { priority: 8, keywords: ["bollinger band","bollinger"],         suggestions: ["What is a Bollinger Band squeeze?", "How do I trade Bollinger Band breakouts?", "How do Bollinger Bands relate to volatility?"] },
    { priority: 8, keywords: ["support","resistance","key level"],   suggestions: ["How do I draw support and resistance?", "What happens when support breaks?", "How do I find key price levels?"] },
    { priority: 8, keywords: ["moving average","sma","ema","50-day","200-day"], suggestions: ["What is a golden cross in stocks?", "What is the 200-day moving average?", "How do I use moving averages to find trends?"] },

    // Concepts (priority 5)
    { priority: 5, keywords: ["e-commerce","ecommerce","online retail"], suggestions: ["How do I compare e-commerce companies?", "What metrics matter for e-commerce stocks?", "How does logistics affect e-commerce margins?"] },
    { priority: 5, keywords: ["portfolio","diversif","allocation"],  suggestions: ["What is a good portfolio split for beginners?", "How many stocks should I hold?", "What is portfolio rebalancing?"] },
    { priority: 5, keywords: ["p/e ratio","price to earnings","valuation","pe ratio"], suggestions: ["What is a good P/E ratio?", "How does P/E compare to P/B?", "What is the PEG ratio?"] },
    { priority: 5, keywords: ["dividend","yield","income"],          suggestions: ["How is dividend yield calculated?", "What is a dividend payout ratio?", "What are the best dividend sectors?"] },
    { priority: 5, keywords: ["stop loss","stop-loss","risk management"], suggestions: ["How do I set a stop loss?", "What is a trailing stop loss?", "What is the 2% risk rule?"] },
    { priority: 5, keywords: ["etf","index fund","passive invest"],  suggestions: ["What is the difference between ETF and mutual fund?", "What is the S&P 500?", "How do I start with index funds?"] },
    { priority: 5, keywords: ["earnings","revenue","eps","quarterly"], suggestions: ["What is EPS in stocks?", "How do I read an earnings report?", "What is free cash flow?"] },
    { priority: 5, keywords: ["short selling","short squeeze","shorting"], suggestions: ["How does short selling work?", "What is a short squeeze?", "What are the risks of shorting?"] },
    { priority: 5, keywords: ["crypto","bitcoin","btc","ethereum"],  suggestions: ["How is Bitcoin different from stocks?", "What is market cap in crypto?", "What causes crypto volatility?"] },

    // Platform features (priority 6 — more specific than general market chatter)
    { priority: 6, keywords: ["premium","upgrade","subscription plan"], suggestions: ["How do I upgrade to Premium?", "What's included in the free plan?", "Can I cancel Premium anytime?"] },
    { priority: 6, keywords: ["quant rating","quant score"],          suggestions: ["How is the Quant Rating calculated?", "Where can I see Quant Ratings by sector?", "Is a high Quant Rating a buy signal?"] },
    { priority: 6, keywords: ["price alert","set an alert","alerts"], suggestions: ["How do I edit or delete an alert?", "Can I set an RSI alert?", "How many alerts can I create?"] },
    { priority: 6, keywords: ["expert","consultant","ask a question"], suggestions: ["How long do experts take to reply?", "Can I message a specific expert?", "Is expert Q&A free or Premium only?"] },
    { priority: 6, keywords: ["paper trading","paper money","virtual fund"], suggestions: ["How much virtual money do I start with?", "Can I reset my paper trading balance?", "Do paper trades use real-time prices?"] },
    { priority: 6, keywords: ["review","rating the platform","leave a review"], suggestions: ["Can I edit my review later?", "Does my review show my name?", "How is the average rating calculated?"] },
    { priority: 6, keywords: ["forum","community post","discussion"],  suggestions: ["How do I start a new forum discussion?", "Can I save posts to read later?", "How do I report an inappropriate post?"] },

    // General market (priority 2 — matched last so specific topics win)
    { priority: 2, keywords: ["bull market","bear market"],          suggestions: ["How long do bear markets last on average?", "What sectors outperform in a bull market?", "How do I protect my portfolio in a downturn?"] },
    { priority: 2, keywords: ["technical analysis","chart pattern"],  suggestions: ["What is a head and shoulders pattern?", "How do I identify a breakout?", "What is a trend line?"] },
    { priority: 2, keywords: ["fundamental analysis","balance sheet"], suggestions: ["What is EPS?", "How do I read a balance sheet?", "What is free cash flow?"] },
];

const DEFAULT_FOLLOW_UPS = [
    "What is a good stock for beginners?",
    "How do I start building a portfolio?",
    "What is the difference between stocks and ETFs?",
];

function getFollowUps(messages) {
    // Only look at the single most recent AI reply
    const lastAI = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAI?.content) return DEFAULT_FOLLOW_UPS;
    const text = lastAI.content.toLowerCase();

    // Score every rule that matches, then pick the highest-priority one
    let bestMatch = null;
    let bestPriority = -1;

    for (const rule of FOLLOW_UP_MAP) {
        const hits = rule.keywords.filter(k => text.includes(k)).length;
        if (hits > 0) {
            const score = rule.priority * 100 + hits;
            if (score > bestPriority) {
                bestPriority = score;
                bestMatch = rule;
            }
        }
    }

    return bestMatch ? bestMatch.suggestions.slice(0, 3) : DEFAULT_FOLLOW_UPS;
}


// ─── Main Component ───────────────────────────────────────────────────────────

function AIChatbot() {
    const {
        messages, input, setInput, loading, error,
        sendMessage: rawSendMessage, endChat, handleScroll, showScroll,
        bottomRef,
    } = useAIChatSession();
    const inputRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    const isPremium = currentUser?.subscription_status === "premium"
        || currentUser?.investor_subscription_status === "premium"
        || currentUser?.subscription_status === "active";

    const [basicQuestionCount, setBasicQuestionCount] = useState(() => {
        try {
            const key = "rtBasicCount_" + (currentUser?.user_id || currentUser?.id || "guest");
            return parseInt(sessionStorage.getItem(key) || "0", 10);
        } catch { return 0; }
    });

    // Rotate a fresh set of 3 platform-help prompts each time the page loads,
    // so the sidebar doesn't always show the same 3 out of 8 options.
    const [platformPrompts] = useState(() => {
        const shuffled = [...PLATFORM_HELP_PROMPTS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    });

    // Gate free-tier usage, then delegate to the shared session hook for the
    // actual send/API logic (kept in one place so the floating ChatWidget and
    // this page never drift out of sync).
    const sendMessage = (text) => {
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading) return;
        if (!isPremium && basicQuestionCount >= BASIC_QUESTION_LIMIT) return;

        if (!isPremium) {
            const newCount = basicQuestionCount + 1;
            setBasicQuestionCount(newCount);
            try {
                const key = "rtBasicCount_" + (currentUser?.user_id || currentUser?.id || "guest");
                sessionStorage.setItem(key, String(newCount));
            } catch { /* sessionStorage unavailable — ignore */ }
        }
        rawSendMessage(text);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />

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
                                    {QUICK_PROMPTS.map(({ label }, i) => (
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
                                            {QUICK_PROMPT_ICONS[i]}{label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Platform help — "how do I…" questions about RocketTrade itself */}
                            <div>
                                <p style={{ fontSize: "10px", letterSpacing: "0.07em", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>PLATFORM HELP</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {platformPrompts.map(({ label, icon }) => (
                                        <button key={label}
                                            onClick={() => sendMessage(label)}
                                            disabled={loading || (!isPremium && basicQuestionCount >= BASIC_QUESTION_LIMIT)}
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
                textarea::placeholder { color: rgba(255,255,255,0.3); }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
            `}</style>
        </motion.div>
    );
}

export default AIChatbot;
