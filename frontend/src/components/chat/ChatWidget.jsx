import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Bot, X, Send, Loader2, RefreshCw } from "lucide-react";
import { useAIChatSession, QUICK_PROMPTS } from "../../hooks/useAIChatSession.js";
import { MessageBubble, TypingDots } from "./ChatMessageBubble.jsx";

// The dedicated chat page renders its own full conversation UI — don't double it up.
const WIDGET_HIDDEN_PATHS = new Set(["/investor/aichatbot"]);

function ChatWidget() {
    const location = useLocation();
    const {
        messages, input, setInput, loading, error,
        sendMessage, endChat, handleKeyDown, bottomRef,
    } = useAIChatSession();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [isOpen, messages.length, loading, bottomRef]);

    if (WIDGET_HIDDEN_PATHS.has(location.pathname)) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        role="dialog"
                        aria-label="AI Assistant chat"
                        className="fixed bottom-24 right-5 sm:right-6 z-[60] w-[min(380px,92vw)] h-[min(560px,75vh)] flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10 text-white"
                        style={{ background: "#0b1220" }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 shrink-0 bg-white/[0.03]">
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: "linear-gradient(135deg,#155dfc,#0092b8)" }}
                            >
                                <Bot size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white leading-tight">AI Assistant</p>
                                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
                                </p>
                            </div>
                            <button
                                onClick={endChat}
                                title="New chat"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer"
                            >
                                <RefreshCw size={15} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chat"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
                            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
                        >
                            <AnimatePresence initial={false}>
                                {messages.map((msg, i) => (
                                    <MessageBubble key={i} msg={msg} avatarSize={28} maxWidth="82%" />
                                ))}
                                {loading && (
                                    <div className="flex items-end gap-2.5">
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                            style={{ background: "linear-gradient(135deg,#155dfc,#0092b8)" }}
                                        >
                                            <Bot size={14} />
                                        </div>
                                        <div
                                            className="rounded-2xl rounded-bl-sm px-3.5 py-3"
                                            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
                                        >
                                            <TypingDots />
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                            {error && (
                                <div
                                    className="text-xs text-center text-red-400 rounded-xl px-3 py-2"
                                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
                                >
                                    ⚠️ {error}
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Quick prompts — only before the user has said anything */}
                        {messages.length <= 1 && (
                            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                                {QUICK_PROMPTS.slice(0, 3).map(({ label }) => (
                                    <button
                                        key={label}
                                        onClick={() => sendMessage(label)}
                                        disabled={loading}
                                        className="text-[11px] px-2.5 py-1.5 rounded-full text-slate-300 bg-white/5 border border-white/[0.08] transition-colors duration-150 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="px-3.5 py-3 border-t border-white/10 shrink-0">
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    placeholder="Ask about a stock, indicator…"
                                    rows={1}
                                    className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm text-white outline-none bg-white/5 border border-white/10"
                                    style={{ maxHeight: 90 }}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={loading || !input.trim()}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150"
                                    style={{
                                        background: loading || !input.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#155dfc,#0092b8)",
                                        cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating action button */}
            <motion.button
                onClick={() => setIsOpen((v) => !v)}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                title="AI Assistant"
                aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
                className="fixed bottom-5 right-5 sm:right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-black/40 cursor-pointer transition-shadow duration-200 hover:shadow-xl"
                style={{ background: "linear-gradient(135deg,#155dfc,#0092b8)" }}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isOpen ? (
                        <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <X size={22} />
                        </motion.span>
                    ) : (
                        <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <Bot size={24} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        </>
    );
}

export default ChatWidget;
