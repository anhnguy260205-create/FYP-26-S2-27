import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { verifySession, getSubscriptionStatus } from "../../api/userApi.js";

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
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />
            <main className="flex-1 flex flex-col items-center justify-center gap-6 p-7.5">
                {status === "loading" ? (
                    <>
                        <div className="text-3xl font-semibold text-white">Activating your subscription...</div>
                        <p className="text-slate-400">Please wait a moment.</p>
                    </>
                ) : error ? (
                    <>
                        <div className="text-3xl font-semibold text-red-400">Something went wrong</div>
                        <p className="text-slate-400">{error}</p>
                        <button
                            onClick={() => navigate("/investor")}
                            className="mt-4 px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-medium transition-colors"
                        >
                            Homepage
                        </button>
                    </>
                ) : (
                    <>
                        <div className="text-3xl font-semibold text-green-400">Payment Successful</div>
                        <p className="text-slate-400">Your subscription is now active.</p>
                        <button
                            onClick={() => navigate("/investor")}
                            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
                        >
                            Homepage
                        </button>
                    </>
                )}
            </main>
            <Footer />
        </motion.div>
    );
}

export default PaymentSuccess;
