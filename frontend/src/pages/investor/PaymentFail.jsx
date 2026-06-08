import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";

import { useEffect } from "react";
function PaymentFail() {

    const navigate = useNavigate();
    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <GeneralHeader />
            <main className="flex-1 p-7.5">
                <div>
                    Payment Failed. Please try again.
                </div>
                <button onClick={() => navigate("/investor/subscription")} className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition">
                    Try Again
                </button>
                <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition">
                    Go Home
                </button>
            </main>
            <Footer />
        </motion.div>
    );
}
export default PaymentFail;