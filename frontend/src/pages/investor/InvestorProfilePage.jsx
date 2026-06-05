import { motion } from "framer-motion";
import { getInvestorInformation } from "../../api/userApi.js";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function LeftSection() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const [investorInfo, setInvestorInfo] = useState(null);
    useEffect(() => {
        if (currentUser?.user_id) {
            getInvestorInformation(currentUser.user_id).then(data => {
                if (data.success) {
                    setInvestorInfo(data.investor_information);
                } else {
                    console.error("Failed to fetch investor information:", data.message || data);
                }
            }).catch(error => {
                console.error("Failed to fetch investor information:", error);
            });
        }
    }, [currentUser?.user_id]);

    // get subscription status desgin:
    const subscriptionStatus =
        investorInfo?.investor_subscription_status?.toLowerCase();

    const subscriptionStyle =
        subscriptionStatus === "premium"
            ? {
                background: "rgba(255, 215, 0, 0.15)",
                border: "1px solid rgba(255, 215, 0, 0.5)",
                color: "#FFD700"
            }
            : {
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(0, 211, 243, 0.4)",
                color: "#00D3F2"
            };
    return (
        <div className="flex flex-col shrink-0" style={{ width: "256px", gap: "16px" }}>
            {/* Banner */}
            <div style={{ position: "relative", height: "78px", background: "linear-gradient(135deg,#020618 0%,#0d2d5e 45%,#0092b8 100%)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-22px", right: "-18px", width: "88px", height: "88px", borderRadius: "50%", background: "rgba(0,211,243,0.1)", border: "0.667px solid rgba(0,211,243,0.14)" }} />
                <div style={{ position: "absolute", bottom: "-32px", left: "14px", width: "68px", height: "68px", borderRadius: "50%", background: "rgba(81,162,255,0.09)", border: "0.667px solid rgba(81,162,255,0.1)" }} />
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} preserveAspectRatio="none" viewBox="0 0 256 78">
                    {[0, 32, 64, 96, 128, 160, 192, 224, 256].map(x => <line key={x} x1={x} y1="0" x2={x} y2="78" stroke="white" strokeWidth="0.5" />)}
                    {[0, 20, 40, 60, 78].map(y => <line key={y} x1="0" y1={y} x2="256" y2={y} stroke="white" strokeWidth="0.5" />)}
                </svg>
                <div style={{ position: "absolute", top: "9px", right: "9px", padding: "2px 9px", borderRadius: "100px", background: "rgba(0,0,0,0.35)", border: "0.667px solid rgba(0,211,243,0.4)", fontSize: "10px", fontWeight: 700, color: "#00D3F2", backdropFilter: "blur(8px)", ...subscriptionStyle }}>
                    ★ {investorInfo?.investor_subscription_status || "Free Plan"}
                </div>
            </div>
            {/* Avatar */}
            <div style={{ padding: "0 18px", marginTop: "-34px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "10px" }}>
                <div className="relative group" style={{ cursor: "pointer" }} >
                    <div style={{
                        width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #0092b8, #155dfc)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Username and email */}
            <div style={{ padding: "0 18px" }}>
                <p className="font-bold text-white" style={{ fontSize: "15px", lineHeight: 1.2 }}>{investorInfo?.full_name}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px" }}>@{investorInfo?.username}</p>
            </div>

            {/* Tags */}
            <div style={{ padding: "0 18px", display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "0.667px solid rgba(255,255,255,0.08)" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(0,211,243,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)" }}>{investorInfo?.address}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "0.667px solid rgba(255,255,255,0.08)" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(0,211,243,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)" }}>{currentUser?.role}</span>
                </div>
            </div >
            {/* Divider */}
            <div style={{ width: "80%", height: "0.667px", background: "rgba(255,255,255,0.07)", marginLeft: "18px", marginRight: "18px" }} />


        </div >

    )
}

function InvestorProfilePage() {
    return (
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <GeneralHeader />
            <main className="flex-1 p-7.5 flex">
                <div style={{ borderRadius: "20px", border: "0.667px solid rgba(255,255,255,0.1)", overflow: "hidden", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
                    <LeftSection />
                </div>
            </main>
            <Footer />
        </motion.div>
    )
}
export default InvestorProfilePage;