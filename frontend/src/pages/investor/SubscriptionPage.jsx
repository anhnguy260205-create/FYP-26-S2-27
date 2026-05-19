import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
function FreeTier(){
    return(
        <div style={{background: "linear-gradient(135deg #061642 0% #081B4D 45% #0A1E57 100%)",
                     border: "2px solid #1E90FF",
                     borderRadius: "32px",
                     boxShadow: "0 0 10px rgba(0, 217, 255, 0.5) 0 0 25px rgba(45, 125, 255, 0.25)",
                     height: "100px", width: "400px",
        }}>

        </div>
    );

}
function PremiumTier(){
    return(
        <div style={{background: "linear-gradient(135deg #061642 0% #081B4D 45% #0A1E57 100%)",
                     border: "2px solid #1E90FF",
                     borderRadius: "32px",
                     boxShadow: "0 0 10px rgba(0, 217, 255, 0.5) 0 0 25px rgba(45, 125, 255, 0.25)",
                     height: "100px", width:"400px",
        }}>

        </div>
    );
}
function SubscriptionPage(){
    return(
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <GeneralHeader/>
            <main className="flex-1 p-7.5">
                <div className="flex gap-50" style={{ justifyContent: "center", alignItems: "center",}}>
                    <FreeTier/>
                    <PremiumTier/>
                </div>
                
            </main>
            <Footer/>
        </motion.div>
    );
}
export default SubscriptionPage; 