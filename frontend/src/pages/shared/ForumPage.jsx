import Header from "../../components/Header.jsx";
import Footer from "../../components/Footer.jsx";
import { motion } from "framer-motion";

function ForumPage(){
    return(
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Header/>
            <Footer/>
        </motion.div>
    );
}
export default ForumPage; 