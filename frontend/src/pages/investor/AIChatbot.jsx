import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
    Bot,
    Send,
    MessageSquare,
    TrendingUp,
    Brain,
    BarChart3,
    ChevronLeft
} from "lucide-react";
import { useEffect } from "react";
function AIChatbot() {
    const QUICK_PROMPTS = [
        "Analyze NVDA for me",
        "What is the RSI indicator?",
        "How accurate are AI predictions?",
        "Show today's top gainers",
        "Explain diversification",
        "Should I buy AAPL?"
    ];

    const RECENT_CHATS = [
        "NVDA earnings analysis",
        "Risk management guide",
        "Best dividend stocks",
        "Trading psychology",
        "Market outlook 2025"
    ];
    const navigate = useNavigate();
    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <GeneralHeader />
            <main className="flex-1 p-7">

                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: "260px 1fr",
                        gap: "24px",
                        height: "100%"
                    }}
                >

                    {/* LEFT SIDEBAR */}
                    <div
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "20px",
                            padding: "20px"
                        }}
                    >
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 mb-6"
                            style={{
                                color: "rgba(255,255,255,0.6)"
                            }}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>

                        <div className="mb-6">
                            <h3
                                style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.08em",
                                    color: "rgba(255,255,255,0.35)"
                                }}
                            >
                                CHATBOT
                            </h3>

                            <div
                                className="flex items-center gap-3 mt-3"
                            >
                                <div
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        background:
                                            "linear-gradient(135deg,#155dfc,#0092b8)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <Bot size={18} />
                                </div>

                                <div>
                                    <div className="font-semibold">
                                        AI Assistant
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: "rgba(255,255,255,0.45)"
                                        }}
                                    >
                                        Online
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3
                                style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.08em",
                                    color: "rgba(255,255,255,0.35)"
                                }}
                            >
                                RECENT
                            </h3>

                            <div className="mt-3 flex flex-col gap-2">
                                {RECENT_CHATS.map((chat) => (
                                    <button
                                        key={chat}
                                        style={{
                                            padding: "10px",
                                            borderRadius: "10px",
                                            textAlign: "left",
                                            background:
                                                "rgba(255,255,255,0.03)",
                                            border:
                                                "1px solid rgba(255,255,255,0.05)",
                                            fontSize: "13px"
                                        }}
                                    >
                                        {chat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3
                                style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.08em",
                                    color: "rgba(255,255,255,0.35)"
                                }}
                            >
                                POPULAR TOPICS
                            </h3>

                            <div className="mt-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={14} />
                                    <span>Stock Analysis</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Brain size={14} />
                                    <span>AI Predictions</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <BarChart3 size={14} />
                                    <span>Technical Analysis</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CHAT AREA */}
                    <div
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "20px",
                            padding: "30px",
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >

                        {/* TITLE */}
                        <div className="text-center mb-10">
                            <div
                                style={{
                                    width: "70px",
                                    height: "70px",
                                    borderRadius: "50%",
                                    background:
                                        "linear-gradient(135deg,#155dfc,#0092b8)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto"
                                }}
                            >
                                <Bot size={32} />
                            </div>

                            <h1
                                className="mt-4"
                                style={{
                                    fontSize: "28px",
                                    fontWeight: "700"
                                }}
                            >
                                Rocket Trading AI Assistant
                            </h1>

                            <p
                                style={{
                                    color: "rgba(255,255,255,0.45)"
                                }}
                            >
                                Ask about stocks, technical analysis,
                                market trends, portfolio management,
                                and AI predictions.
                            </p>
                        </div>

                        {/* QUICK QUESTIONS */}
                        <div
                            className="grid grid-cols-2 gap-4 mb-8"
                        >
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    style={{
                                        padding: "14px",
                                        borderRadius: "12px",
                                        background:
                                            "rgba(255,255,255,0.04)",
                                        border:
                                            "1px solid rgba(255,255,255,0.08)",
                                        textAlign: "left",
                                        transition: "0.2s"
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <MessageSquare size={14} />
                                        {prompt}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* SAMPLE CHAT */}
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px"
                            }}
                        >
                            <div
                                style={{
                                    alignSelf: "flex-start",
                                    maxWidth: "70%",
                                    padding: "14px",
                                    borderRadius: "14px",
                                    background:
                                        "rgba(255,255,255,0.05)"
                                }}
                            >
                                Hello! I'm your AI investment assistant.
                                How can I help you today?
                            </div>

                            <div
                                style={{
                                    alignSelf: "flex-end",
                                    maxWidth: "70%",
                                    padding: "14px",
                                    borderRadius: "14px",
                                    background:
                                        "linear-gradient(90deg,#155dfc,#0092b8)"
                                }}
                            >
                                Analyze NVIDIA stock for me.
                            </div>
                        </div>

                        {/* INPUT */}
                        <div
                            className="flex gap-3 mt-6"
                        >
                            <input
                                placeholder="Ask about a stock, indicator, strategy..."
                                style={{
                                    flex: 1,
                                    height: "50px",
                                    borderRadius: "12px",
                                    border:
                                        "1px solid rgba(255,255,255,0.08)",
                                    background:
                                        "rgba(255,255,255,0.04)",
                                    padding: "0 16px",
                                    outline: "none"
                                }}
                            />

                            <button
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "12px",
                                    background:
                                        "linear-gradient(90deg,#0092b8,#155dfc)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>

                        <p
                            className="text-center mt-3"
                            style={{
                                fontSize: "11px",
                                color: "rgba(255,255,255,0.3)"
                            }}
                        >
                            For educational purposes only. Not financial advice.
                        </p>

                    </div>
                </div>

            </main>
            <Footer />
        </motion.div>
    );
}
export default AIChatbot;