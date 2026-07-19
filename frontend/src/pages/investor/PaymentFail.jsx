import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";

import { useEffect } from "react";

const DANGER = "#DC2626";

function PaymentFail() {
    return (
        <motion.div
            className="min-h-screen flex flex-col"
            style={{
                fontFamily: "'DM Sans', sans-serif",
                background: "linear-gradient(to bottom, #73ADFF 0%, #FFFFFF 30%, #FFFFFF 100%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />
            <main className="flex-1 flex items-center justify-center p-4 sm:p-7.5">
                <div
                    className="w-full max-w-md rounded-2xl bg-white p-8 sm:p-10 flex flex-col items-center text-center gap-4"
                    style={{
                        border: "1px solid rgba(11,29,79,0.25)",
                        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(220,38,38,0.1)" }}
                    >
                        <XCircle size={36} style={{ color: DANGER }} />
                    </div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold"
                        style={{ fontFamily: "'DM Mono', monospace", color: DANGER }}
                    >
                        Payment Failed
                    </h1>
                    <p className="text-[#5B6C88] text-sm">Please try again.</p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
                        <button
                            onClick={() => navigate("/investor/subscription")}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer"
                            style={{ background: DANGER, color: "#FFFFFF", transition: "opacity 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer"
                            style={{ background: "#0F172A", transition: "background-color 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#1E293B")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#0F172A")}
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}
export default PaymentFail;
