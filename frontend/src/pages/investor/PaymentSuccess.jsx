import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { verifySession, getSubscriptionStatus } from "../../api/userApi.js";

const SUCCESS = "#0F9D58";
const DANGER = "#DC2626";

function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState(null);

    useEffect(() => {
        const activate = async () => {
            const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
            if (!user?.user_id) {
                setStatus("done");
                return;
            }

            const sessionId = searchParams.get("session_id");

            if (sessionId) {
                // Premium: verify the Stripe session and activate subscription directly
                const result = await verifySession(sessionId);
                if (!result.success) {
                    setError(result.message || result.detail || "Could not verify payment.");
                    setStatus("done");
                    return;
                }
            }

            // Refresh subscription status from DB and update localStorage
            try {
                const result = await getSubscriptionStatus(user.user_id);
                if (result.success) {
                    sessionStorage.setItem(
                        "currentUser",
                        JSON.stringify({ ...user, subscription_status: result.subscription_status })
                    );
                }
            } catch (_) { }

            setStatus("done");
        };

        activate();
    }, []);

    return (
        <motion.div
            className="min-h-screen flex flex-col"
            style={{
                fontFamily: "'DM Sans', sans-serif",
                background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />
            <main className="flex-1 flex items-center justify-center p-4 sm:p-7.5" style={{ minHeight: "calc(100vh)" }}>
                <div
                    className="w-full max-w-md rounded-2xl bg-white p-8 sm:p-10 flex flex-col items-center text-center gap-4"
                    style={{
                        border: "1px solid rgba(11,29,79,0.25)",
                        boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                    }}
                >
                    {status === "loading" ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-[#00D3F2]/10 flex items-center justify-center">
                                <Loader2 size={32} className="text-[#00D3F2] animate-spin" />
                            </div>
                            <h1
                                className="text-xl sm:text-2xl font-bold text-[#0B1D4F]"
                                style={{ fontFamily: "'DM Mono', monospace" }}
                            >
                                Activating your subscription...
                            </h1>
                            <p className="text-[#5B6C88] text-sm">Please wait a moment.</p>
                        </>
                    ) : error ? (
                        <>
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
                                Something went wrong
                            </h1>
                            <p className="text-[#5B6C88] text-sm">{error}</p>
                            <button
                                onClick={() => navigate("/investor")}
                                className="mt-2 px-6 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer"
                                style={{ background: "#0F172A", transition: "background-color 0.2s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#1E293B")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#0F172A")}
                            >
                                Homepage
                            </button>
                        </>
                    ) : (
                        <>
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(15,157,88,0.1)" }}
                            >
                                <CheckCircle2 size={36} style={{ color: SUCCESS }} />
                            </div>
                            <h1
                                className="text-2xl sm:text-3xl font-bold"
                                style={{ fontFamily: "'DM Mono', monospace", color: SUCCESS }}
                            >
                                Payment Successful
                            </h1>
                            <p className="text-[#5B6C88] text-sm">Your subscription is now active.</p>
                            <button
                                onClick={() => navigate("/investor")}
                                className="mt-2 px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer"
                                style={{ background: SUCCESS, color: "#FFFFFF", transition: "opacity 0.2s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                            >
                                Homepage
                            </button>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}

export default PaymentSuccess;
