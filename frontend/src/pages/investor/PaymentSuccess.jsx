import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
function PaymentSuccess() {
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
                    Payment Successful
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}
export default PaymentSuccess;