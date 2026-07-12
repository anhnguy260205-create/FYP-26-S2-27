import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import {
  sendChatMessage, getConversations, getChatMessages, searchChatUsers,
} from "../../api/chatApi.js";

/*
 * Messages — the expert-consultation section under Forum / Community.
 *
 * Access: premium investors and experts. Basic investors see the premium
 * lock (backend enforces the same rule on every request).
 * Deep link:  /forum/messages?to=<expert_user_id>  (used by "Ask Question"
 * on an expert profile) opens/starts that conversation directly.
 */

const ROLE_COLORS = { expert: "#fbbf24", investor: "#63b3ed" };

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function Avatar({ name, role, size = 38 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: "#fff",
      background: role === "expert"
        ? "linear-gradient(135deg,#f59e0b,#b45309)"
        : "linear-gradient(135deg,#0092b8,#155dfc)",
    }}>{initials}</div>
  );
}

function PremiumLock({ navigate }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-10">
      <div style={{
        width: 64, height: 64, borderRadius: "50%", fontSize: 28,
        background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>🔒</div>
      <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700 }}>
        Messages is a Premium feature
      </h2>
      <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 420 }}>
        Upgrade to Premium to chat directly with our verified experts —
        ask questions about stocks, strategies and portfolios, one-on-one.
      </p>
      <button onClick={() => navigate("/investor/subscription")}
        style={{
          marginTop: 6, padding: "12px 26px", borderRadius: 14, border: "none", cursor: "pointer",
          color: "#fff", fontWeight: 600, fontSize: 14,
          background: "linear-gradient(90deg, #d4a017, #b8860b)",
          boxShadow: "0 10px 22px rgba(212,160,23,0.3)",
        }}>
        Upgrade to Premium →
      </button>
    </div>
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const me = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("currentUser") ||
        localStorage.getItem("currentUser") || "{}");
    } catch { return {}; }
  })();
  const role = String(me?.role || "").toLowerCase();
  const isExpert = role === "expert";
  const isPremium = String(me?.subscription_status || "").toLowerCase() === "premium";
  const hasAccess = isExpert || isPremium;

  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);   // {conv_id?, other:{...}}
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [sending, setSending] = useState(false);
  const [lockedThread, setLockedThread] = useState(false);

  const bottomRef = useRef(null);
  const activeRef = useRef(null);
  const deepLinkDone = useRef(false);
  activeRef.current = active;

  const refreshConvs = useCallback(async () => {
    try {
      const res = await getConversations();
      if (res.success) setConvs(res.conversations || []);
      return res.conversations || [];
    } catch { return []; }
  }, []);

  const openThread = useCallback(async (conv) => {
    setActive(conv);
    setMessages([]);
    setLockedThread(Boolean(conv.locked));
    if (conv.conv_id) {
      try {
        const res = await getChatMessages(conv.conv_id);
        if (res.success) setMessages(res.messages || []);
      } catch { /* ignore */ }
    }
  }, []);

  // ── Websocket push ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess || !me?.user_id) return;
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
  }, [hasAccess]);

  // ── Initial load + ?to= deep link ─────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      const list = await refreshConvs();
      if (deepLinkDone.current) return;
      deepLinkDone.current = true;
      const to = searchParams.get("to");
      if (!to) return;
      const existing = list.find(c => c.other.user_id === to);
      if (existing) return openThread(existing);
      // No conversation yet — resolve the user by name (passed by the
      // "Ask Question" button on the expert profile page)
      const name = searchParams.get("name") || "";
      if (name.length < 2) return;
      try {
        const res = await searchChatUsers(name);
        const user = (res.users || []).find(u => u.user_id === to);
        if (user) openThread({ conv_id: null, other: user, locked: user.locked });
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Search experts / people ────────────────────────────────────────────
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
    openThread({ conv_id: null, other: user, locked: user.locked });
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending || !active) return;
    setSending(true);
    try {
      const res = await sendChatMessage(active.other.user_id, content);
      if (res.premium_required) {
        setLockedThread(true);
      } else if (res.success) {
        setText("");
        setMessages(prev => prev.some(x => x.message_id === res.data.message_id) ? prev : [...prev, res.data]);
        if (!active.conv_id) setActive(a => ({ ...a, conv_id: res.data.conv_id }));
        refreshConvs();
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
    >
      {isExpert ? <ConsultantHeader /> : <GeneralHeader />}

      <main className="flex-1 p-4 md:p-7 flex flex-col">
        <div className="mb-5">
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
            Messages
          </h1>
          <p style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            {isExpert
              ? "Answer questions from premium investors, one-on-one."
              : "Chat directly with our verified experts — a Premium perk."}
          </p>
        </div>

        {!hasAccess ? (
          <div className="flex-1 flex rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.2)" }}>
            <PremiumLock navigate={navigate} />
          </div>
        ) : (
          <div className="flex-1 flex rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,179,237,0.15)", minHeight: 520 }}>

            {/* ── Left: conversations ── */}
            <div style={{ width: 300, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 12 }}>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={isExpert ? "Search people…" : "Search experts…"}
                  style={{
                    width: "100%", height: 38, borderRadius: 10, padding: "0 12px",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#f1f5f9", fontSize: 13, outline: "none",
                  }} />
                {results.map(u => (
                  <div key={u.user_id} onClick={() => startChatWith(u)}
                    className="flex items-center gap-2.5 py-2 px-1 cursor-pointer hover:bg-white/5 rounded-lg">
                    <Avatar name={u.full_name || u.username} role={u.role} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{u.full_name || u.username}</div>
                      <div style={{ fontSize: 10, color: ROLE_COLORS[u.role] || "#94a3b8", textTransform: "uppercase" }}>{u.role}</div>
                    </div>
                    {u.locked && <span style={{ fontSize: 13 }}>🔒</span>}
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {convs.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: 12.5, padding: "40px 18px" }}>
                    No conversations yet.<br />
                    {isExpert ? "Premium investors can message you here." : "Search an expert above to ask your first question."}
                  </div>
                ) : convs.map(c => (
                  <div key={c.conv_id} onClick={() => openThread(c)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      background: active?.conv_id === c.conv_id ? "rgba(0,146,184,0.12)"
                        : c.unread > 0 ? "rgba(0,146,184,0.06)" : "transparent",
                    }}>
                    <Avatar name={c.other.full_name || c.other.username} role={c.other.role} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex justify-between gap-2">
                        <span style={{ color: "#f1f5f9", fontSize: 13.5, fontWeight: c.unread ? 700 : 600 }}>
                          {c.other.full_name || c.other.username}
                          {c.other.role === "expert" && <span style={{ marginLeft: 5, fontSize: 9, color: "#fbbf24" }}>EXPERT</span>}
                        </span>
                        <span style={{ color: "#64748b", fontSize: 10, flexShrink: 0 }}>{timeAgo(c.last_message?.created_at)}</span>
                      </div>
                      <div style={{
                        color: c.unread ? "#e2e8f0" : "#94a3b8", fontSize: 12,
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
                  <span style={{ fontSize: 34 }}>💬</span>
                  <p style={{ color: "#94a3b8", fontSize: 14 }}>
                    Select a conversation{isExpert ? "" : " or search an expert"} to start chatting.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(15,23,42,0.4)",
                  }}>
                    <Avatar name={active.other.full_name || active.other.username} role={active.other.role} size={34} />
                    <div>
                      <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>
                        {active.other.full_name || active.other.username}
                      </div>
                      <div style={{ fontSize: 10, color: ROLE_COLORS[active.other.role] || "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {active.other.role}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 6px", display: "flex", flexDirection: "column", gap: 7 }}>
                    {messages.map(m => {
                      const mine = m.sender_id === me.user_id;
                      return (
                        <div key={m.message_id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "66%", padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5,
                            color: "#f1f5f9", whiteSpace: "pre-wrap", wordBreak: "break-word",
                            borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                            background: mine ? "linear-gradient(135deg,#0092b8,#155dfc)" : "rgba(255,255,255,0.08)",
                          }}>{m.content}</div>
                        </div>
                      );
                    })}
                    {messages.length === 0 && !lockedThread && (
                      <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 60 }}>
                        Ask {active.other.full_name || active.other.username} your first question 👋
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {lockedThread ? (
                    <div style={{
                      padding: 18, textAlign: "center", borderTop: "1px solid rgba(255,215,0,0.2)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 22 }}>🔒</span>
                      <span style={{ color: "#e2e8f0", fontSize: 13 }}>
                        Chatting with experts requires a <span style={{ color: "#fbbf24", fontWeight: 700 }}>Premium</span> subscription.
                      </span>
                      <button onClick={() => navigate("/investor/subscription")}
                        style={{
                          padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                          color: "#fff", fontWeight: 600, fontSize: 13,
                          background: "linear-gradient(90deg, #d4a017, #b8860b)",
                        }}>
                        Upgrade to Premium →
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10 }}>
                      <input value={text} onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                        placeholder="Type a message…"
                        style={{
                          flex: 1, height: 40, borderRadius: 12, padding: "0 14px",
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                          color: "#f1f5f9", fontSize: 13.5, outline: "none",
                        }} />
                      <button onClick={send} disabled={sending || !text.trim()}
                        style={{
                          padding: "0 20px", borderRadius: 12, border: "none",
                          cursor: sending ? "default" : "pointer", color: "#fff", fontWeight: 600, fontSize: 13.5,
                          background: "linear-gradient(90deg, #0092b8, #155dfc)",
                          opacity: sending || !text.trim() ? 0.5 : 1,
                        }}>Send</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
