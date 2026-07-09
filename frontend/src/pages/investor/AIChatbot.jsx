import { motion, AnimatePresence } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useRef } from "react";
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

// ─── Main Component ───────────────────────────────────────────────────────────

function AIChatbot() {
    const {
        messages, input, setInput, loading, error,
        sendMessage, endChat, handleKeyDown, handleScroll, showScroll,
        bottomRef,
    } = useAIChatSession();
    const inputRef = useRef(null);

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
