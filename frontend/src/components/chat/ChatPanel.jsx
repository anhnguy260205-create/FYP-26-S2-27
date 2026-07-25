import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Search, Gift } from "lucide-react";
import {
    sendChatMessage, getConversations, getChatMessages, searchChatUsers,
} from "../../api/chatApi.js";
import { getConversationGifts } from "../../api/walletApi.js";
import GiftDialog from "./GiftDialog.jsx";
import { stickerFor } from "./giftStickers.js";
import { isPremiumUser } from "../../utils/userRole.js";

/*
 * ChatPanel — embedded two-pane messenger (conversations + thread).
 * Used inside the expert Questions section; works for any logged-in user
 * (backend enforces the premium rule for investors).
 */

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

export default function ChatPanel({ height = 560, onUnreadChange }) {
    const me = (() => {
        try {
            return JSON.parse(sessionStorage.getItem("currentUser") ||
                localStorage.getItem("currentUser") || "{}");
        } catch { return {}; }
    })();

    const [convs, setConvs] = useState([]);
    const [active, setActive] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [sending, setSending] = useState(false);
    const [gifts, setGifts] = useState([]);
    const [giftOpen, setGiftOpen] = useState(false);

    // Gifting is premium-only and expert-only, mirroring the backend rule.
    const canGift =
        !!active &&
        active.other.role === "expert" &&
        active.other.user_id !== me.user_id &&
        isPremiumUser(me);

    const loadGifts = useCallback(async (otherUserId) => {
        if (!otherUserId) return;
        try {
            const res = await getConversationGifts(otherUserId);
            if (res.success) setGifts(res.gifts || []);
        } catch (e) {
            console.warn("Could not load gifts:", e);
        }
    }, []);

    useEffect(() => {
        if (active?.other?.user_id) loadGifts(active.other.user_id);
        else setGifts([]);
    }, [active?.other?.user_id, loadGifts]);

    const bottomRef = useRef(null);
    const activeRef = useRef(null);
    activeRef.current = active;

    const refreshConvs = useCallback(async () => {
        try {
            const res = await getConversations();
            if (res.success) {
                const list = res.conversations || [];
                setConvs(list);
                onUnreadChange?.(list.reduce((s, c) => s + (c.unread || 0), 0));
            }
        } catch { /* ignore */ }
    }, [onUnreadChange]);

    const openThread = useCallback(async (conv) => {
        setActive(conv);
        setMessages([]);
        if (conv.conv_id) {
            try {
                const res = await getChatMessages(conv.conv_id);
                if (res.success) setMessages(res.messages || []);
            } catch { /* ignore */ }
            refreshConvs();
        }
    }, [refreshConvs]);

    useEffect(() => { refreshConvs(); }, [refreshConvs]);

    // WebSocket push
    useEffect(() => {
        if (!me?.user_id) return;
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
                    if (activeRef.current?.conv_id === m.conv_id) {
                        setMessages(prev => prev.some(x => x.message_id === m.message_id) ? prev : [...prev, m]);
                    }
                    refreshConvs();
                } catch { /* ignore */ }
            };
            socket.onclose = () => { if (alive) setTimeout(connect, 5000); };
        };
        connect();
        return () => { alive = false; try { socket?.close(); } catch { /* */ } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(() => {
            searchChatUsers(query.trim()).then(r => r.success && setResults(r.users || [])).catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const startChatWith = (user) => {
        setQuery(""); setResults([]);
        const existing = convs.find(c => c.other.user_id === user.user_id);
        if (existing) return openThread(existing);
        openThread({ conv_id: null, other: user });
    };

    const send = async () => {
        const content = text.trim();
        if (!content || sending || !active) return;
        setSending(true);
        try {
            const res = await sendChatMessage(active.other.user_id, content);
            if (res.success) {
                setText("");
                setMessages(prev => prev.some(x => x.message_id === res.data.message_id) ? prev : [...prev, res.data]);
                if (!active.conv_id) setActive(a => ({ ...a, conv_id: res.data.conv_id }));
                refreshConvs();
            }
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    return (
        <div className="flex rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,179,237,0.15)", height }}>

            {/* ── Left: conversations ── */}
            <div style={{ width: 290, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: 12 }}>
                    <div style={{ position: "relative" }}>
                        <Search size={13} color="rgba(255,255,255,0.35)"
                            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                        <input value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Search people…"
                            style={{
                                width: "100%", height: 36, borderRadius: 10, padding: "0 12px 0 30px",
                                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                                color: "#f1f5f9", fontSize: 13, outline: "none",
                            }} />
                    </div>
                    {results.map(u => (
                        <div key={u.user_id} onClick={() => startChatWith(u)}
                            className="flex items-center gap-2.5 py-2 px-1 cursor-pointer hover:bg-white/5 rounded-lg">
                            <Avatar name={u.full_name || u.username} role={u.role} size={30} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{u.full_name || u.username}</div>
                                <div style={{ fontSize: 9.5, color: ROLE_COLORS[u.role] || "#94a3b8", textTransform: "uppercase" }}>{u.role}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {convs.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#64748b", fontSize: 12.5, padding: "40px 18px" }}>
                            No conversations yet.<br />Premium investors can message you here.
                        </div>
                    ) : convs.map(c => (
                        <div key={c.conv_id} onClick={() => openThread(c)}
                            style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer",
                                borderTop: "1px solid rgba(255,255,255,0.04)",
                                background: active?.conv_id === c.conv_id ? "rgba(0,146,184,0.12)"
                                    : c.unread > 0 ? "rgba(0,146,184,0.06)" : "transparent",
                            }}>
                            <Avatar name={c.other.full_name || c.other.username} role={c.other.role} size={36} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="flex justify-between gap-2">
                                    <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: c.unread ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {c.other.full_name || c.other.username}
                                    </span>
                                    <span style={{ color: "#64748b", fontSize: 10, flexShrink: 0 }}>{timeAgo(c.last_message?.created_at)}</span>
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
                                    minWidth: 18, height: 18, borderRadius: 9, background: "#0092b8", color: "#fff",
                                    fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center",
                                    justifyContent: "center", padding: "0 4px",
                                }}>{c.unread}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right: thread ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {!active ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
                        <span style={{ fontSize: 32 }}>💬</span>
                        <p style={{ color: "#94a3b8", fontSize: 13.5 }}>
                            Select a conversation to start chatting.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            padding: "11px 15px", display: "flex", alignItems: "center", gap: 10,
                            borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(15,23,42,0.4)",
                        }}>
                            <Avatar name={active.other.full_name || active.other.username} role={active.other.role} size={32} />
                            <div>
                                <div style={{ color: "#f1f5f9", fontSize: 13.5, fontWeight: 600 }}>
                                    {active.other.full_name || active.other.username}
                                </div>
                                <div style={{ fontSize: 9.5, color: ROLE_COLORS[active.other.role] || "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    {active.other.role}
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 6px", display: "flex", flexDirection: "column", gap: 7 }}>
                            {/* Messages and gifts are separate tables, so merge
                                them into one timeline sorted by timestamp. */}
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
                                                    maxWidth: "66%", padding: "11px 14px", borderRadius: 14,
                                                    background: "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)",
                                                    color: "#fff",
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 14 }}>
                                                        <span style={{ fontSize: 17, lineHeight: 1 }}>{sticker.emoji}</span>
                                                        {mine ? "You sent" : "Gift received"} {sticker.name} (${g.amount.toFixed(2)})
                                                    </div>
                                                    {g.message && (
                                                        <div style={{ fontSize: 12.5, marginTop: 5, opacity: 0.95 }}>
                                                            “{g.message}”
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: 11, marginTop: 5, opacity: 0.8 }}>
                                                        {mine
                                                            ? `${g.expert_share.toFixed(2)} to expert after fee`
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
                                                maxWidth: "66%", padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5,
                                                color: "#f1f5f9", whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                                background: mine ? GRADIENT : "rgba(255,255,255,0.08)",
                                            }}>{m.content}</div>
                                        </div>
                                    );
                                })}
                            {messages.length === 0 && gifts.length === 0 && (
                                <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 60 }}>
                                    Say hi to {active.other.full_name || active.other.username} 👋
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10 }}>
                            {canGift && (
                                <button onClick={() => setGiftOpen(true)} title="Send a gift"
                                    style={{
                                        width: 40, height: 40, borderRadius: 12, border: "none",
                                        cursor: "pointer", color: "#fff", flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)",
                                    }}>
                                    <Gift size={17} />
                                </button>
                            )}
                            <input value={text} onChange={e => setText(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                                placeholder="Type a message…"
                                style={{
                                    flex: 1, height: 40, borderRadius: 12, padding: "0 14px",
                                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                                    color: "#f1f5f9", fontSize: 13.5, outline: "none",
                                }} />
                            <button onClick={send} disabled={sending || !text.trim()}
                                className="flex items-center gap-2"
                                style={{
                                    padding: "0 18px", borderRadius: 12, border: "none",
                                    cursor: sending ? "default" : "pointer", color: "#fff", fontWeight: 600, fontSize: 13,
                                    background: GRADIENT,
                                    opacity: sending || !text.trim() ? 0.5 : 1,
                                }}>
                                <Send size={14} /> Send
                            </button>
                        </div>
                    </>
                )}
            </div>

            {giftOpen && active && (
                <GiftDialog
                    expert={active.other}
                    onClose={() => setGiftOpen(false)}
                    onSent={() => loadGifts(active.other.user_id)}
                />
            )}
        </div>
    );
}
