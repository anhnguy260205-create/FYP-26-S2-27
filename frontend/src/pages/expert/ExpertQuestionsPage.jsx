import { useState } from "react";
import { motion } from "framer-motion";
import ExpertHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import ChatPanel from "../../components/chat/ChatPanel.jsx";

export default function ExpertQuestionsPage() {
    const [chatUnread, setChatUnread] = useState(0);

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <ExpertHeader />
            <main className="flex-1 p-4 md:p-7 max-w-6xl mx-auto w-full">

                {/* Header */}
                <div className="flex items-center gap-3 flex-wrap mb-5">
                    <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, letterSpacing: "0.02em", color: "#e2e8f0", margin: 0 }}>
                        Messages
                    </h1>
                    {chatUnread > 0 && (
                        <span style={{
                            minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px",
                            background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{chatUnread}</span>
                    )}
                </div>
                <p style={{ marginTop: -12, marginBottom: 20, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                    Chat one-on-one with premium investors.
                </p>

                <ChatPanel height={560} onUnreadChange={setChatUnread} />
            </main>
            <Footer />
        </motion.div>
    );
}
