import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bot, User } from "lucide-react";

export function TypingDots() {
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

export function MessageBubble({ msg, avatarSize = 32, maxWidth = "72%" }) {
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
                    width: avatarSize, height: avatarSize, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#155dfc,#0092b8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Bot size={avatarSize * 0.5} />
                </div>
            )}
            <div style={{
                maxWidth,
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
                    width: avatarSize, height: avatarSize, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <User size={avatarSize * 0.47} />
                </div>
            )}
        </motion.div>
    );
}
