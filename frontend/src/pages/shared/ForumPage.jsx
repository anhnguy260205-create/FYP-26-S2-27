import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";

function ForumPage() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const isExpert = currentUser?.role?.toLowerCase() === "expert";
    return (
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            {isExpert ? <ConsultantHeader /> : <GeneralHeader />}
            <main className="flex-1 p-7.5">

            </main>
            <Footer />
        </motion.div>
    );
}
export default ForumPage; 