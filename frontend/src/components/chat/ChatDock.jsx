import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Search, ChevronDown } from "lucide-react";
import {
    sendChatMessage, getConversations, getChatMessages,
    getUnreadCount, searchChatUsers,
} from "../../api/chatApi.js";

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

const PANEL_BG = "rgba(15,23,42,0.97)";
const BORDER = "1px solid rgba(255,255,255,0.1)";
const GRADIENT = "linear-gradient(135deg,#0092b8,#155dfc)";
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

export default function ChatDock() {
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

    const bottomRef = useRef(null);
    const threadRef = useRef(null);
    threadRef.current = thread;

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
        setMinimized(false);
        setMessages([]);
        setLockedThread(Boolean(conv.locked) || !isPremium);
        if (conv.conv_id) {
            try {
                const res = await getChatMessages(conv.conv_id);
                if (res.success) setMessages(res.messages || []);
            } catch { /* ignore */ }
            refreshUnread();
            refreshConvs();
        }
    }, [isPremium, refreshUnread, refreshConvs]);

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

    const otherName = thread ? (thread.other.full_name || thread.other.username) : "";

    return (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 60, display: "flex", alignItems: "flex-end", gap: 12 }}>

            {/* ── Floating chat window ── */}
            {thread && (
                <div style={{
                    width: 320, borderRadius: 16, overflow: "hidden",
                    background: PANEL_BG, border: BORDER, backdropFilter: "blur(12px)",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                    display: "flex", flexDirection: "column",
                    height: minimized ? "auto" : 430,
                }}>
                    {/* header */}
                    <div
                        onClick={() => setMinimized(m => !m)}
                        style={{
                            padding: "10px 12px", display: "flex", alignItems: "center", gap: 9,
                            cursor: "pointer", background: "rgba(255,255,255,0.04)",
                            borderBottom: minimized ? "none" : "1px solid rgba(255,255,255,0.08)",
                        }}>
                        <Avatar name={otherName} role={thread.other.role} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "#f1f5f9", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {otherName}
                            </div>
                            <div style={{ fontSize: 9.5, color: ROLE_COLORS[thread.other.role] || "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                {thread.other.role}
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); }}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}>
                            <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setThread(null); }}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}>
                            <X size={15} />
                        </button>
                    </div>

                    {!minimized && (
                        <>
                            {/* messages */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
                                {messages.map(m => {
                                    const mine = m.sender_id === me.user_id;
                                    return (
                                        <div key={m.message_id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                            <div style={{
                                                maxWidth: "78%", padding: "8px 12px", fontSize: 13, lineHeight: 1.45,
                                                color: "#f1f5f9", whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                borderRadius: mine ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                                                background: mine ? GRADIENT : "rgba(255,255,255,0.08)",
                                            }}>{m.content}</div>
                                        </div>
                                    );
                                })}
                                {messages.length === 0 && !lockedThread && (
                                    <div style={{ textAlign: "center", color: "#64748b", fontSize: 12.5, marginTop: 70 }}>
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
                                    <span style={{ color: "#e2e8f0", fontSize: 12 }}>
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
                            ) : (
                                <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
                                    <input value={text} onChange={e => setText(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                                        placeholder="Type a message…"
                                        style={{
                                            flex: 1, height: 36, borderRadius: 10, padding: "0 12px",
                                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                                            color: "#f1f5f9", fontSize: 13, outline: "none",
                                        }} />
                                    <button onClick={send} disabled={sending || !text.trim()}
                                        style={{
                                            width: 38, height: 36, borderRadius: 10, border: "none",
                                            cursor: sending ? "default" : "pointer", color: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: GRADIENT,
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

            {/* ── Conversations panel ── */}
            {open && (
                <div style={{
                    width: 300, height: 420, borderRadius: 16, overflow: "hidden",
                    background: PANEL_BG, border: BORDER, backdropFilter: "blur(12px)",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                    display: "flex", flexDirection: "column",
                }}>
                    <div style={{
                        padding: "13px 15px", fontWeight: 700, fontSize: 14.5, color: "#f1f5f9",
                        borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        Messages
                        <button onClick={() => setOpen(false)}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 2 }}>
                            <X size={15} />
                        </button>
                    </div>

                    {!isPremium ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, padding: 24, textAlign: "center" }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: "50%", fontSize: 22,
                                background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>🔒</div>
                            <div style={{ color: "#f1f5f9", fontSize: 14.5, fontWeight: 700 }}>Premium feature</div>
                            <p style={{ color: "#94a3b8", fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
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
                    ) : (
                        <>
                            <div style={{ padding: 10 }}>
                                <div style={{ position: "relative" }}>
                                    <Search size={13} color="rgba(255,255,255,0.35)"
                                        style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                                    <input value={query} onChange={e => setQuery(e.target.value)}
                                        placeholder="Search experts…"
                                        style={{
                                            width: "100%", height: 34, borderRadius: 10, padding: "0 12px 0 30px",
                                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                                            color: "#f1f5f9", fontSize: 12.5, outline: "none",
                                        }} />
                                </div>
                                {results.map(u => (
                                    <div key={u.user_id}
                                        onClick={() => { setQuery(""); setResults([]); openChatWith(u); }}
                                        className="flex items-center gap-2.5 py-2 px-1 cursor-pointer hover:bg-white/5 rounded-lg">
                                        <Avatar name={u.full_name || u.username} role={u.role} size={28} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: "#e2e8f0", fontSize: 12.5, fontWeight: 600 }}>{u.full_name || u.username}</div>
                                            <div style={{ fontSize: 9, color: ROLE_COLORS[u.role] || "#94a3b8", textTransform: "uppercase" }}>{u.role}</div>
                                        </div>
                                        {u.locked && <span style={{ fontSize: 12 }}>🔒</span>}
                                    </div>
                                ))}
                            </div>

                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {convs.length === 0 ? (
                                    <div style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: "36px 16px" }}>
                                        No conversations yet.<br />Search an expert above, or hit
                                        “Ask Question” on an expert profile.
                                    </div>
                                ) : convs.map(c => (
                                    <div key={c.conv_id} onClick={() => openThread(c)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", cursor: "pointer",
                                            borderTop: "1px solid rgba(255,255,255,0.04)",
                                            background: thread?.conv_id === c.conv_id ? "rgba(0,146,184,0.12)"
                                                : c.unread > 0 ? "rgba(0,146,184,0.06)" : "transparent",
                                        }}>
                                        <Avatar name={c.other.full_name || c.other.username} role={c.other.role} size={34} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                                                <span style={{ color: "#f1f5f9", fontSize: 12.5, fontWeight: c.unread ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {c.other.full_name || c.other.username}
                                                </span>
                                                <span style={{ color: "#64748b", fontSize: 9.5, flexShrink: 0 }}>{timeAgo(c.last_message?.created_at)}</span>
                                            </div>
                                            <div style={{
                                                color: c.unread ? "#e2e8f0" : "#94a3b8", fontSize: 11.5,
                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                            }}>
                                                {c.last_message?.content || "…"}
                                            </div>
                                        </div>
                                        {c.unread > 0 && (
                                            <span style={{
                                                minWidth: 17, height: 17, borderRadius: 9, background: "#0092b8", color: "#fff",
                                                fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center",
                                                justifyContent: "center", padding: "0 4px",
                                            }}>{c.unread}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Bubble ── */}
            <button onClick={() => setOpen(o => !o)}
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
        </div>
    );
}
