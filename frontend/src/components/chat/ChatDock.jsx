import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Search, ChevronDown, Bot, Gift } from "lucide-react";
import {
    sendChatMessage, getConversations, getChatMessages,
    getUnreadCount, searchChatUsers,
} from "../../api/chatApi.js";
import { getConversationGifts } from "../../api/walletApi.js";
import GiftDialog from "./GiftDialog.jsx";
import { stickerFor } from "./giftStickers.js";
import { useAIChatSession } from "../../hooks/useAIChatSession.js";

/*
 * ChatDock — Facebook-style floating messenger for investors.
 *
 * Mounted once (GeneralHeader). Renders nothing for guests / experts.
 *   - Bubble bottom-right with unread badge
 *   - Panel: conversation list + expert search
 *   - Chat window: one floating thread at a time
 *   - Premium: basic investors see the upgrade lock (backend enforces too)
 *
 * Other components open a thread via:
 *   openChatWith({ user_id, full_name, username, role })
 */

export function openChatWith(user) {
    window.dispatchEvent(new CustomEvent("rt-open-chat", { detail: user }));
}

const PANEL_BG = "#242526";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const HOVER_BG = "#3a3b3c";
const ACCENT = "#0084ff";
const TEXT_PRIMARY = "#e4e6eb";
const TEXT_SECONDARY = "#b0b3b8";
const GRADIENT = "linear-gradient(135deg,#0092b8,#155dfc)"; // role-avatar gradient, kept for investor/expert distinction
const ROLE_COLORS = { expert: "#fbbf24", investor: "#63b3ed" };

function timeAgo(iso) {
    if (!iso) return "";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

function Avatar({ name, role, size = 36 }) {
    const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.34, fontWeight: 700, color: "#fff",
            background: role === "expert"
                ? "linear-gradient(135deg,#f59e0b,#b45309)"
                : GRADIENT,
        }}>{initials}</div>
    );
}

function FilterTab({ active, onClick, children }) {
    return (
        <button onClick={onClick}
            style={{
                padding: "6px 14px", borderRadius: 16, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                background: active ? ACCENT : HOVER_BG,
                color: active ? "#fff" : TEXT_SECONDARY,
                transition: "background-color 0.1s ease",
            }}>{children}</button>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{
            padding: "10px 16px 6px", fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY,
            textTransform: "uppercase", letterSpacing: "0.06em",
        }}>{children}</div>
    );
}

function ConversationRow({ c, active, onClick }) {
    return (
        <div onClick={onClick}
            className={active ? "" : "hover:bg-[#3a3b3c]"}
            style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", cursor: "pointer",
                borderRadius: 8, margin: "1px 8px", width: "calc(100% - 16px)",
                background: active ? HOVER_BG : "transparent",
                transition: "background-color 0.1s ease",
            }}>
            <Avatar name={c.other.full_name || c.other.username} role={c.other.role} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: c.unread ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.other.full_name || c.other.username}
                    </span>
                    <span style={{ color: TEXT_SECONDARY, fontSize: 11, flexShrink: 0 }}>{timeAgo(c.last_message?.created_at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                        flex: 1, minWidth: 0,
                        color: c.unread ? TEXT_PRIMARY : TEXT_SECONDARY, fontWeight: c.unread ? 600 : 400, fontSize: 13,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {c.last_message?.content || "…"}
                    </div>
                    {c.unread > 0 && (
                        <span style={{
                            flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9, background: ACCENT, color: "#fff",
                            fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center",
                            justifyContent: "center", padding: "0 5px",
                        }}>{c.unread}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function AIAssistantRow({ active, onClick }) {
    return (
        <div onClick={onClick}
            className={active ? "" : "hover:bg-[#3a3b3c]"}
            style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", cursor: "pointer",
                borderRadius: 8, margin: "1px 8px", width: "calc(100% - 16px)",
                background: active ? HOVER_BG : "transparent",
                transition: "background-color 0.1s ease",
            }}>
            <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", background: GRADIENT,
            }}>
                <Bot size={20} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600 }}>AI Assistant</span>
                <div style={{ color: TEXT_SECONDARY, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Ask about stocks, indicators, and more
                </div>
            </div>
        </div>
    );
}

// Separate component so the AI session hook (its own websocket + sessionStorage
// history) only runs while the AI thread is actually open, not on every ChatDock mount.
function AIThreadPane({ minimized, onToggleMinimize, onClose }) {
    const navigate = useNavigate();
    const { messages, input, setInput, loading, error, sendMessage, handleKeyDown, bottomRef } = useAIChatSession();

    useEffect(() => {
        if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading, minimized, bottomRef]);

    return (
        <div style={{
            width: 320, borderRadius: 16, overflow: "hidden",
            background: PANEL_BG, border: BORDER,
            boxShadow: "0 12px 28px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
            display: "flex", flexDirection: "column",
            height: minimized ? "auto" : 430,
        }}>
            <div onClick={onToggleMinimize}
                style={{
                    padding: "10px 12px", display: "flex", alignItems: "center", gap: 9,
                    cursor: "pointer", background: "rgba(255,255,255,0.03)",
                    borderBottom: minimized ? "none" : BORDER,
                }}>
                <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", background: GRADIENT,
                }}>
                    <Bot size={16} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: TEXT_PRIMARY, fontSize: 13.5, fontWeight: 700 }}>AI Assistant</div>
                    <div style={{ fontSize: 9.5, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} /> Online
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
                    style={{ background: "none", border: "none", color: TEXT_SECONDARY, cursor: "pointer", padding: 4 }}>
                    <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                    style={{ background: "none", border: "none", color: TEXT_SECONDARY, cursor: "pointer", padding: 4 }}>
                    <X size={15} />
                </button>
            </div>

            {!minimized && (
                <>
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
                        {messages.map((m, i) => {
                            const mine = m.role === "user";
                            return (
                                <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                    <div style={{
                                        maxWidth: "82%", padding: "8px 12px", fontSize: 13, lineHeight: 1.45,
                                        color: mine ? "#fff" : TEXT_PRIMARY, whiteSpace: "pre-wrap", wordBreak: "break-word",
                                        borderRadius: mine ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                                        background: mine ? ACCENT : HOVER_BG,
                                    }}>
                                        {m.content}
                                        {m.cta && (
                                            <button onClick={() => navigate(m.cta.route)}
                                                style={{
                                                    display: "block", marginTop: 8, padding: "6px 10px", borderRadius: 8, border: "none",
                                                    cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#fff", background: ACCENT,
                                                }}>{m.cta.label} →</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {loading && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div style={{ padding: "8px 12px", borderRadius: "13px 13px 13px 4px", background: HOVER_BG, color: TEXT_SECONDARY, fontSize: 13 }}>…</div>
                            </div>
                        )}
                        {error && (
                            <div style={{ textAlign: "center", color: "#f87171", fontSize: 11.5 }}>{error}</div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                    <div style={{ padding: 10, borderTop: BORDER, display: "flex", gap: 8 }}>
                        <input value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            placeholder="Ask about a stock, indicator…"
                            style={{
                                flex: 1, height: 36, borderRadius: 20, padding: "0 14px",
                                background: HOVER_BG, border: "none",
                                color: TEXT_PRIMARY, fontSize: 13, outline: "none",
                            }} />
                        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                            style={{
                                width: 36, height: 36, borderRadius: "50%", border: "none",
                                cursor: loading ? "default" : "pointer", color: "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: ACCENT,
                                opacity: loading || !input.trim() ? 0.45 : 1,
                            }}>
                            <Send size={15} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const ChatDock = forwardRef(function ChatDock({ hideBubble = false, onUnreadChange } = {}, ref) {
    const navigate = useNavigate();
    const me = (() => {
        try {
            return JSON.parse(sessionStorage.getItem("currentUser") ||
                localStorage.getItem("currentUser") || "{}");
        } catch { return {}; }
    })();
    const isInvestor = String(me?.role || "").toLowerCase() === "investor";
    const isPremium = String(me?.subscription_status || "").toLowerCase() === "premium";

    const [open, setOpen] = useState(false);          // conversation panel
    const [anchorRect, setAnchorRect] = useState(null); // trigger icon's bounding rect, for dropdown positioning
    const [filter, setFilter] = useState("all");       // "all" | "unread" — conversation list tab
    const [thread, setThread] = useState(null);       // {conv_id?, other, locked}
    const [minimized, setMinimized] = useState(false);
    const [convs, setConvs] = useState([]);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [unread, setUnread] = useState(0);
    const [sending, setSending] = useState(false);
    const [lockedThread, setLockedThread] = useState(false);
    const [chatUnavailableMsg, setChatUnavailableMsg] = useState("");
    const [gifts, setGifts] = useState([]);
    const [giftOpen, setGiftOpen] = useState(false);

    const bottomRef = useRef(null);
    const threadRef = useRef(null);
    threadRef.current = thread;
    const panelRef = useRef(null);

    // Gifting is premium-only and expert-only, mirroring the backend rule.
    const canGift =
        !!thread && !thread.isAI &&
        thread.other.role === "expert" &&
        thread.other.user_id !== me.user_id &&
        isPremium;

    const loadGifts = useCallback(async (otherUserId) => {
        if (!otherUserId) { setGifts([]); return; }
        try {
            const res = await getConversationGifts(otherUserId);
            if (res.success) setGifts(res.gifts || []);
        } catch { /* ignore */ }
    }, []);

    const refreshConvs = useCallback(async () => {
        try {
            const res = await getConversations();
            if (res.success) setConvs(res.conversations || []);
            return res.conversations || [];
        } catch { return []; }
    }, []);

    const refreshUnread = useCallback(async () => {
        try {
            const res = await getUnreadCount();
            if (res.success) setUnread(res.unread || 0);
        } catch { /* ignore */ }
    }, []);

    const openThread = useCallback(async (conv) => {
        setThread(conv);
        setOpen(false);
        setMinimized(false);
        setMessages([]);
        setGifts([]);
        setLockedThread(Boolean(conv.locked) || !isPremium);
        // Applies to new AND existing conversations — an expert who's turned
        // chat off can't be messaged at all until they turn it back on.
        setChatUnavailableMsg(
            conv.other?.chat_available === false
                ? `${conv.other.full_name || conv.other.username} isn't accepting chat messages right now.`
                : ""
        );
        loadGifts(conv.other?.user_id);
        if (conv.conv_id) {
            try {
                const res = await getChatMessages(conv.conv_id);
                if (res.success) setMessages(res.messages || []);
            } catch { /* ignore */ }
            refreshUnread();
            refreshConvs();
        }
    }, [isPremium, refreshUnread, refreshConvs, loadGifts]);

    const openAIThread = () => {
        setThread({ isAI: true });
        setOpen(false);
        setMinimized(false);
    };

    // ── Global "open chat with user" event (Ask Question buttons) ──────────
    useEffect(() => {
        if (!isInvestor) return;
        const handler = async (e) => {
            const user = e.detail || {};
            if (!user.user_id) return;
            const list = await refreshConvs();
            const existing = list.find(c => c.other.user_id === user.user_id);
            if (existing) return openThread(existing);
            openThread({ conv_id: null, other: user, locked: !isPremium });
        };
        window.addEventListener("rt-open-chat", handler);
        return () => window.removeEventListener("rt-open-chat", handler);
    }, [isInvestor, isPremium, openThread, refreshConvs]);

    // ── Initial unread + conversations ─────────────────────────────────────
    useEffect(() => {
        if (!isInvestor || !me?.user_id) return;
        refreshUnread();
        refreshConvs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── WebSocket push ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!isInvestor || !me?.user_id) return;
        let alive = true;
        let socket;
        const connect = () => {
            if (!alive) return;
            socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/chat/ws?user_id=${encodeURIComponent(me.user_id)}`);
            socket.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type !== "message") return;
                    const m = msg.data;
                    if (threadRef.current?.conv_id === m.conv_id) {
                        setMessages(prev => prev.some(x => x.message_id === m.message_id) ? prev : [...prev, m]);
                    }
                    refreshConvs();
                    refreshUnread();
                } catch { /* ignore */ }
            };
            socket.onclose = () => { if (alive) setTimeout(connect, 5000); };
        };
        connect();
        return () => { alive = false; try { socket?.close(); } catch { /* */ } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInvestor]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, minimized]);

    useEffect(() => { onUnreadChange?.(unread); }, [unread, onUnreadChange]);

    // ── Close the panel on any click outside it (except the nav-bar trigger icons) ──
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current?.contains(e.target)) return;
            if (e.target.closest?.("[data-chat-trigger]")) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    useImperativeHandle(ref, () => ({
        toggleOpen: (rect) => {
            if (rect) setAnchorRect(rect);
            setOpen((o) => !o);
        },
    }));

    // ── Search experts ─────────────────────────────────────────────────────
    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(() => {
            searchChatUsers(query.trim()).then(r => r.success && setResults(r.users || [])).catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const send = async () => {
        const content = text.trim();
        if (!content || sending || !thread) return;
        setSending(true);
        try {
            const res = await sendChatMessage(thread.other.user_id, content);
            if (res.premium_required) {
                setLockedThread(true);
            } else if (res.chat_unavailable) {
                setChatUnavailableMsg(res.message || "This expert isn't accepting new chat requests right now.");
            } else if (res.success) {
                setText("");
                setMessages(prev => prev.some(x => x.message_id === res.data.message_id) ? prev : [...prev, res.data]);
                if (!thread.conv_id) setThread(t => ({ ...t, conv_id: res.data.conv_id }));
                refreshConvs();
            }
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    if (!isInvestor || !me?.user_id) return null;

    const otherName = thread && !thread.isAI ? (thread.other.full_name || thread.other.username) : "";
    const unreadConvs = convs.filter(c => c.unread > 0);
    const readConvs = convs.filter(c => !c.unread);

    // Conversations panel drops just below the trigger icon when opened from the nav
    // bar (anchorRect set), falling back to bottom-right for the bare-bubble mode.
    const panelWrapperStyle = anchorRect
        ? {
            position: "fixed",
            top: anchorRect.bottom + 10,
            right: Math.max(12, window.innerWidth - anchorRect.right),
            zIndex: 60, display: "flex", alignItems: "flex-start", gap: 12,
        }
        : { position: "fixed", bottom: 20, right: 20, zIndex: 60, display: "flex", alignItems: "flex-end", gap: 12 };

    // The active thread always docks at the bottom-right of the screen, like a
    // Facebook chat head, independent of where the panel is anchored.
    const threadWrapperStyle = { position: "fixed", bottom: 20, right: 20, zIndex: 60 };

    return (
        <>
            {/* ── Floating chat window — always docked bottom-right ── */}
            {thread && (
                <div style={threadWrapperStyle}>
                    {thread.isAI ? (
                        <AIThreadPane
                            minimized={minimized}
                            onToggleMinimize={() => setMinimized(m => !m)}
                            onClose={() => setThread(null)}
                        />
                    ) : (
                    <div style={{
                        width: 320, borderRadius: 16, overflow: "hidden",
                        background: PANEL_BG, border: BORDER,
                        boxShadow: "0 12px 28px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                        display: "flex", flexDirection: "column",
                        height: minimized ? "auto" : 430,
                    }}>
                    {/* header */}
                    <div
                        onClick={() => setMinimized(m => !m)}
                        style={{
                            padding: "10px 12px", display: "flex", alignItems: "center", gap: 9,
                            cursor: "pointer", background: "rgba(255,255,255,0.03)",
                            borderBottom: minimized ? "none" : BORDER,
                        }}>
                        <Avatar name={otherName} role={thread.other.role} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: TEXT_PRIMARY, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {otherName}
                            </div>
                            <div style={{ fontSize: 9.5, color: ROLE_COLORS[thread.other.role] || TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                {thread.other.role}
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); }}
                            style={{ background: "none", border: "none", color: TEXT_SECONDARY, cursor: "pointer", padding: 4 }}>
                            <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setThread(null); }}
                            style={{ background: "none", border: "none", color: TEXT_SECONDARY, cursor: "pointer", padding: 4 }}>
                            <X size={15} />
                        </button>
                    </div>

                    {!minimized && (
                        <>
                            {/* messages */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
                                {[
                                    ...messages.map(m => ({ kind: "message", at: m.created_at, data: m })),
                                    ...gifts.map(g => ({ kind: "gift", at: g.created_at, data: g })),
                                ]
                                    .sort((a, b) => new Date(a.at) - new Date(b.at))
                                    .map(item => {
                                        if (item.kind === "gift") {
                                            const g = item.data;
                                            const mine = g.sender_user_id === me.user_id;
                                            const sticker = stickerFor(g.amount);
                                            return (
                                                <div key={g.gift_id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                                    <div style={{
                                                        maxWidth: "78%", padding: "8px 12px", borderRadius: 13,
                                                        background: "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)",
                                                        color: "#fff",
                                                    }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12.5 }}>
                                                            <span style={{ fontSize: 15, lineHeight: 1 }}>{sticker.emoji}</span>
                                                            {mine ? "You sent" : "Gift received"} {sticker.name} (${g.amount.toFixed(2)})
                                                        </div>
                                                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.85 }}>
                                                            {mine
                                                                ? `$${g.expert_share.toFixed(2)} to expert after fee`
                                                                : `+$${g.expert_share.toFixed(2)} credited`}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const m = item.data;
                                        const mine = m.sender_id === me.user_id;
                                        return (
                                            <div key={m.message_id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                                <div style={{
                                                    maxWidth: "78%", padding: "8px 12px", fontSize: 13, lineHeight: 1.45,
                                                    color: mine ? "#fff" : TEXT_PRIMARY, whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                    borderRadius: mine ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                                                    background: mine ? ACCENT : HOVER_BG,
                                                }}>{m.content}</div>
                                            </div>
                                        );
                                    })}
                                {messages.length === 0 && gifts.length === 0 && !lockedThread && (
                                    <div style={{ textAlign: "center", color: TEXT_SECONDARY, fontSize: 12.5, marginTop: 70 }}>
                                        Ask {otherName} your first question 👋
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* composer / premium lock */}
                            {lockedThread ? (
                                <div style={{
                                    padding: 14, textAlign: "center", borderTop: "1px solid rgba(255,215,0,0.2)",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                                }}>
                                    <span style={{ fontSize: 18 }}>🔒</span>
                                    <span style={{ color: TEXT_PRIMARY, fontSize: 12 }}>
                                        Chatting with experts is a <span style={{ color: "#fbbf24", fontWeight: 700 }}>Premium</span> perk.
                                    </span>
                                    <button onClick={() => navigate("/investor/subscription")}
                                        style={{
                                            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                                            color: "#fff", fontWeight: 600, fontSize: 12,
                                            background: "linear-gradient(90deg, #d4a017, #b8860b)",
                                        }}>
                                        Upgrade to Premium →
                                    </button>
                                </div>
                            ) : chatUnavailableMsg ? (
                                <div style={{
                                    padding: 14, textAlign: "center", borderTop: BORDER,
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                                }}>
                                    <span style={{ fontSize: 18 }}>⏸️</span>
                                    <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>{chatUnavailableMsg}</span>
                                </div>
                            ) : (
                                <div style={{ padding: 10, borderTop: BORDER, display: "flex", gap: 8 }}>
                                    {canGift && (
                                        <button onClick={() => setGiftOpen(true)} title="Send a gift"
                                            style={{
                                                width: 36, height: 36, borderRadius: "50%", border: "none",
                                                cursor: "pointer", color: "#fff", flexShrink: 0,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                background: "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)",
                                            }}>
                                            <Gift size={15} />
                                        </button>
                                    )}
                                    <input value={text} onChange={e => setText(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                                        placeholder="Type a message…"
                                        style={{
                                            flex: 1, height: 36, borderRadius: 20, padding: "0 14px",
                                            background: HOVER_BG, border: "none",
                                            color: TEXT_PRIMARY, fontSize: 13, outline: "none",
                                        }} />
                                    <button onClick={send} disabled={sending || !text.trim()}
                                        style={{
                                            width: 36, height: 36, borderRadius: "50%", border: "none",
                                            cursor: sending ? "default" : "pointer", color: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: ACCENT,
                                            opacity: sending || !text.trim() ? 0.45 : 1,
                                        }}>
                                        <Send size={15} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                    )}
                </div>
            )}

            <div style={panelWrapperStyle} ref={panelRef}>
            {/* ── Conversations panel ── */}
            {open && (
                <div style={{
                    width: 372, height: "min(680px, calc(100vh - 96px))", maxHeight: 680,
                    borderRadius: 16, overflow: "hidden",
                    background: PANEL_BG, border: BORDER,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                    display: "flex", flexDirection: "column",
                }}>
                    <div style={{ padding: "16px 18px 12px", fontWeight: 800, fontSize: 20, color: TEXT_PRIMARY }}>
                        Chats
                    </div>

                    {!isPremium ? (
                        <>
                            {/* AI Assistant is available to every investor — not gated behind Premium */}
                            <div style={{ padding: "0 0 4px" }}>
                                <AIAssistantRow active={thread?.isAI === true} onClick={openAIThread} />
                            </div>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, padding: 24, textAlign: "center" }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: "50%", fontSize: 22,
                                    background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>🔒</div>
                                <div style={{ color: TEXT_PRIMARY, fontSize: 14.5, fontWeight: 700 }}>Premium feature</div>
                                <p style={{ color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
                                    Upgrade to chat one-on-one with our verified experts.
                                </p>
                                <button onClick={() => navigate("/investor/subscription")}
                                    style={{
                                        marginTop: 4, padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                                        color: "#fff", fontWeight: 600, fontSize: 12.5,
                                        background: "linear-gradient(90deg, #d4a017, #b8860b)",
                                    }}>
                                    Upgrade to Premium →
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ padding: "0 12px 10px" }}>
                                <div style={{ position: "relative" }}>
                                    <Search size={15} color={TEXT_SECONDARY}
                                        style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
                                    <input value={query} onChange={e => setQuery(e.target.value)}
                                        placeholder="Search experts…"
                                        style={{
                                            width: "100%", height: 38, borderRadius: 20, padding: "0 14px 0 36px",
                                            background: HOVER_BG, border: "none",
                                            color: TEXT_PRIMARY, fontSize: 14, outline: "none",
                                        }} />
                                </div>
                                {results.map(u => (
                                    <div key={u.user_id}
                                        onClick={() => { setQuery(""); setResults([]); openChatWith(u); }}
                                        className="flex items-center gap-2.5 py-2 px-2 mt-1 cursor-pointer hover:bg-[#3a3b3c] rounded-lg">
                                        <Avatar name={u.full_name || u.username} role={u.role} size={32} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: TEXT_PRIMARY, fontSize: 13.5, fontWeight: 600 }}>{u.full_name || u.username}</div>
                                            <div style={{ fontSize: 10, color: ROLE_COLORS[u.role] || TEXT_SECONDARY, textTransform: "uppercase" }}>{u.role}</div>
                                        </div>
                                        {u.locked && <span style={{ fontSize: 12 }}>🔒</span>}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", gap: 8, padding: "0 12px 10px" }}>
                                <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>All</FilterTab>
                                <FilterTab active={filter === "unread"} onClick={() => setFilter("unread")}>
                                    Unread{unreadConvs.length > 0 ? ` (${unreadConvs.length})` : ""}
                                </FilterTab>
                            </div>

                            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
                                <AIAssistantRow active={thread?.isAI === true} onClick={openAIThread} />

                                {convs.length === 0 ? (
                                    <div style={{ textAlign: "center", color: TEXT_SECONDARY, fontSize: 13, padding: "40px 20px" }}>
                                        No conversations yet.<br />Search an expert above, or hit
                                        “Ask Question” on an expert profile.
                                    </div>
                                ) : filter === "unread" ? (
                                    unreadConvs.length === 0 ? (
                                        <div style={{ textAlign: "center", color: TEXT_SECONDARY, fontSize: 13, padding: "40px 20px" }}>
                                            No unread messages.
                                        </div>
                                    ) : unreadConvs.map(c => (
                                        <ConversationRow key={c.conv_id} c={c}
                                            active={thread?.conv_id === c.conv_id}
                                            onClick={() => openThread(c)} />
                                    ))
                                ) : (
                                    <>
                                        {unreadConvs.length > 0 && (
                                            <>
                                                <SectionLabel>Unread ({unreadConvs.length})</SectionLabel>
                                                {unreadConvs.map(c => (
                                                    <ConversationRow key={c.conv_id} c={c}
                                                        active={thread?.conv_id === c.conv_id}
                                                        onClick={() => openThread(c)} />
                                                ))}
                                            </>
                                        )}
                                        {readConvs.length > 0 && (
                                            <>
                                                <SectionLabel>Read</SectionLabel>
                                                {readConvs.map(c => (
                                                    <ConversationRow key={c.conv_id} c={c}
                                                        active={thread?.conv_id === c.conv_id}
                                                        onClick={() => openThread(c)} />
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Bubble ── */}
            {!hideBubble && (
                <button onClick={(e) => { setAnchorRect(e.currentTarget.getBoundingClientRect()); setOpen(o => !o); }}
                    aria-label="Messages"
                    style={{
                        width: 54, height: 54, borderRadius: "50%", border: "none", cursor: "pointer",
                        background: GRADIENT, color: "#fff", position: "relative",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 10px 26px rgba(0,146,184,0.45)",
                    }}>
                    <MessageCircle size={24} />
                    {unread > 0 && (
                        <span style={{
                            position: "absolute", top: -3, right: -3,
                            minWidth: 19, height: 19, borderRadius: 10, padding: "0 5px",
                            background: "#ef4444", color: "#fff", fontSize: 10.5, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "2px solid #0f172a",
                        }}>{unread > 99 ? "99+" : unread}</span>
                    )}
                </button>
            )}
            </div>

            {giftOpen && thread && !thread.isAI && (
                <GiftDialog
                    expert={thread.other}
                    onClose={() => setGiftOpen(false)}
                    onSent={() => loadGifts(thread.other.user_id)}
                />
            )}
        </>
    );
});

export default ChatDock;
