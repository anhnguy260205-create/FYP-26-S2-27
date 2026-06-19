import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";

import {
    ArrowLeft,
    User,
    Clock,
    CheckCircle,
    Send,
    Briefcase,
    Shield,
    TrendingUp,
    MessageCircle,
    LogOut
} from "lucide-react";
import { useState } from "react";
function ExpertAdvice() {
    const [selectedConsultant, setSelectedConsultant] = useState("Dr. Raymond");
    const [selectedType, setSelectedType] = useState("Technical Analysis");
    const navigate = useNavigate();
    const consultants = [
        {
            name: "Dr. Raymond",
            status: "Available",
            response: "< 4 hrs",
            skills: ["Technical Analysis", "SGX Markets"]
        },
        {
            name: "James Wong",
            status: "Available",
            response: "< 8 hrs",
            skills: ["Portfolio Review", "Asset Allocation"]
        },
        {
            name: "Elena Vasquez",
            status: "Unavailable",
            response: "< 12 hrs",
            skills: ["AI Signals", "Quant Models"]
        }
    ];

    const consultationTypes = [
        {
            name: "Technical Analysis",
            icon: TrendingUp
        },
        {
            name: "Portfolio Review",
            icon: Briefcase
        },
        {
            name: "Risk Assessment",
            icon: Shield
        },
        {
            name: "AI Signal Review",
            icon: TrendingUp
        },
        {
            name: "Entry / Exit",
            icon: LogOut
        },
        {
            name: "General Query",
            icon: MessageCircle
        }
    ];
    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <GeneralHeader />
            <main className="flex-1 p-8">

                {/* Top Bar */}
                <div className="flex justify-between items-center mb-6">

                    <div className="flex items-center gap-4">
                        <button
                            className="flex items-center gap-2 px-4 py-2 rounded-lg"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)"
                            }}
                            onClick={() => navigate("/investor/expertportfolio")}
                        >
                            <ArrowLeft size={14} />
                            Back
                        </button>

                        <div className="flex items-center gap-3">
                            <User size={18} />
                            <h1
                                style={{
                                    fontSize: "24px",
                                    fontWeight: 700
                                }}
                            >
                                Expert Consultation
                            </h1>
                        </div>
                    </div>

                    <div
                        style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            background: "rgba(59,130,246,0.12)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            color: "#60a5fa",
                            fontSize: "13px"
                        }}
                    >
                        Premium
                    </div>
                </div>


                {/* Consultation Type */}
                <h3 className="mb-3 text-sm font-semibold">
                    CONSULTATION TYPE
                </h3>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {consultationTypes.map((type) => {
                        const Icon = type.icon;

                        return (
                            <button
                                key={type.name}
                                onClick={() =>
                                    setSelectedType(type.name)
                                }
                                style={{
                                    height: "72px",
                                    borderRadius: "12px",
                                    background:
                                        selectedType === type.name
                                            ? "rgba(37,99,235,0.15)"
                                            : "rgba(255,255,255,0.03)",
                                    border:
                                        selectedType === type.name
                                            ? "1px solid #2563eb"
                                            : "1px solid rgba(255,255,255,0.08)"
                                }}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Icon size={18} />
                                    <span
                                        style={{
                                            fontSize: "13px"
                                        }}
                                    >
                                        {type.name}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Form */}
                <div className="grid grid-cols-2 gap-4 mb-4">

                    <div>
                        <label className="text-xs block mb-2">
                            TICKER(S)
                        </label>

                        <input
                            placeholder="e.g. AAPL, DBS.SI"
                            className="w-full px-4 h-11 rounded-lg bg-transparent"
                            style={{
                                border:
                                    "1px solid rgba(255,255,255,0.08)"
                            }}
                        />
                    </div>

                    <div>
                        <label className="text-xs block mb-2">
                            SUBJECT *
                        </label>

                        <input
                            placeholder="Brief title for your query"
                            className="w-full px-4 h-11 rounded-lg bg-transparent"
                            style={{
                                border:
                                    "1px solid rgba(255,255,255,0.08)"
                            }}
                        />
                    </div>
                </div>

                <div className="mb-5">
                    <label className="text-xs block mb-2">
                        YOUR QUESTION *
                    </label>

                    <textarea
                        rows={5}
                        placeholder="Describe your trading situation, issue, or question in detail..."
                        className="w-full p-4 rounded-lg bg-transparent resize-none"
                        style={{
                            border:
                                "1px solid rgba(255,255,255,0.08)"
                        }}
                    />
                </div>

                {/* Goal + Urgency */}

                <div style={{ marginBottom: "30px" }}>
                    <label className="text-xs block mb-2">
                        URGENCY
                    </label>

                    <select
                        className="w-full h-11 px-4 rounded-lg bg-slate-900"
                        style={{
                            border:
                                "1px solid rgba(255,255,255,0.08)"
                        }}
                    >
                        <option>Normal</option>
                        <option>High</option>
                        <option>Urgent</option>
                    </select>
                </div>


                {/* Recipient */}
                <div
                    className="p-4 rounded-xl mb-5"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)"
                    }}
                >
                    <div className="text-sm">
                        To: <strong>{selectedConsultant}</strong>
                    </div>

                    <div
                        className="text-xs mt-1"
                        style={{
                            color: "rgba(255,255,255,0.45)"
                        }}
                    >
                        Response expected within 4 hours
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3">

                    <button
                        style={{
                            padding: "10px 24px",
                            borderRadius: "10px",
                            background:
                                "rgba(255,255,255,0.05)",
                            border:
                                "1px solid rgba(255,255,255,0.08)",
                            cursor: "pointer"

                        }}
                        onClick={() => navigate("/investor/expertportfolio")}
                    >
                        Cancel
                    </button>

                    <button
                        style={{
                            padding: "10px 24px",
                            borderRadius: "10px",
                            background:
                                "linear-gradient(90deg,#0092b8,#155dfc)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        <Send size={14} />
                        Send
                    </button>
                </div>

            </main>
            <Footer />
        </motion.div >
    );
}
export default ExpertAdvice;