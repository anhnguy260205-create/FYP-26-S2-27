import { motion } from "framer-motion";
import { getInvestorInformation } from "../../api/userApi.js";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { HandCoins, CircleDollarSign, Shield, User, ChartNoAxesColumn, SquarePen } from "lucide-react";

function GlassCard({ children }) {
    return (
        <div
            style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
                padding: "32px",

            }}
        >
            {children}
        </div>
    );
}
function InfoRow({ label, value }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
            </span>
            <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.88)" }}>
                {value || "—"}
            </span>
        </div>
    );
}

function MenuButton({ children, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex",
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                background: active ? "rgba(0,211,243,0.12)" : "transparent",
                border: active ? "1px solid rgba(0,211,243,0.5)" : "1px solid transparent",
                color: active ? "white" : "rgba(255,255,255,0.28)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease"
            }}
        >
            {children}
            {active && (
                <div
                    style={{
                        marginLeft: "auto",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#00D3F2"
                    }}
                />
            )}
        </button>
    );
}

// FIX 1: LeftSection is now a proper React component with destructured props
function LeftSection({ activeTab, setActiveTab, investorInfo, currentUser }) {
    const navigate = useNavigate();
    const initials = investorInfo?.full_name
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??";

    const subscriptionStatus = investorInfo?.investor_subscription_status?.toLowerCase();

    const subscriptionStyle =
        subscriptionStatus === "premium"
            ? { background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.5)", color: "#FFD700" }
            : subscriptionStatus === "basic"
                ? { background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(0, 211, 243, 0.4)", color: "#00D3F2" }
                : {};

    return (
        <div className="flex flex-col shrink-0" style={{ gap: "16px" }}>
            {/* Banner */}
            <div style={{ position: "relative", height: "78px", background: "linear-gradient(135deg,#020618 0%,#0d2d5e 45%,#0092b8 100%)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-22px", right: "-18px", width: "88px", height: "88px", borderRadius: "50%", background: "rgba(0,211,243,0.1)", border: "0.667px solid rgba(0,211,243,0.14)" }} />
                <div style={{ position: "absolute", bottom: "-32px", left: "14px", width: "68px", height: "68px", borderRadius: "50%", background: "rgba(81,162,255,0.09)", border: "0.667px solid rgba(81,162,255,0.1)" }} />
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} preserveAspectRatio="none" viewBox="0 0 256 78">
                    {[0, 32, 64, 96, 128, 160, 192, 224, 256].map(x => <line key={x} x1={x} y1="0" x2={x} y2="78" stroke="white" strokeWidth="0.5" />)}
                    {[0, 20, 40, 60, 78].map(y => <line key={y} x1="0" y1={y} x2="256" y2={y} stroke="white" strokeWidth="0.5" />)}
                </svg>
                <div style={{ position: "absolute", top: "9px", right: "9px", padding: "2px 9px", borderRadius: "100px", background: "rgba(0,0,0,0.35)", border: "0.667px solid rgba(0,211,243,0.4)", fontSize: "10px", fontWeight: 700, color: "#00D3F2", backdropFilter: "blur(8px)", ...subscriptionStyle }}>
                    ★ {subscriptionStatus === "premium" ? "Premium" : "Basic"}
                </div>
            </div>

            {/* Avatar */}
            <div style={{ padding: "0 18px", marginTop: "-34px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "10px" }}>
                <div className="relative group" style={{ cursor: "pointer" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #0092b8, #155dfc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>{initials}</span>
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
            </div>

            {/* Divider */}
            <div style={{ width: "80%", height: "0.667px", background: "rgba(255,255,255,0.07)", marginLeft: "18px", marginRight: "18px" }} />

            <div className="flex" style={{ gap: "7px", padding: "0 18px" }}>
                <div style={{ borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.08)", padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.06em" }}>MEMBER SINCE</span>
                    </div>
                    <p className="font-bold" style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                        {investorInfo?.join_date ? new Date(investorInfo.join_date).toLocaleDateString() : "N/A"}
                    </p>
                </div>
                <div style={{ borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.08)", padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.06em" }}>RISK LEVEL</span>
                    </div>
                    <p className="font-bold" style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                        {investorInfo?.stock_level || "N/A"}
                    </p>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: "80%", height: "0.667px", background: "rgba(255,255,255,0.07)", marginLeft: "18px", marginRight: "18px" }} />

            {/* Menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "0 18px", alignItems: "start" }}>
                <MenuButton active={activeTab === "personal"} onClick={() => setActiveTab("personal")}><User size={15} style={{ marginRight: "8px" }} /> Personal Information</MenuButton>
                <MenuButton active={activeTab === "account"} onClick={() => setActiveTab("account")}><ChartNoAxesColumn size={15} style={{ marginRight: "8px" }} /> Account Settings</MenuButton>
                <MenuButton active={activeTab === "security"} onClick={() => setActiveTab("security")}><Shield size={15} style={{ marginRight: "8px" }} /> Security</MenuButton>
                <MenuButton active={activeTab === "paper-money"} onClick={() => setActiveTab("paper-money")}><HandCoins size={15} style={{ marginRight: "8px" }} /> Paper Money</MenuButton>
                <MenuButton active={activeTab === "subscription"} onClick={() => setActiveTab("subscription")}><CircleDollarSign size={15} style={{ marginRight: "8px" }} /> Subscription</MenuButton>
            </div>
        </div>
    );
}

function DeleteAccountButton() {
    const navigate = useNavigate();
    const handleDeleteAccount = () => {
        navigate("/");
    };

    return (
        <div className="flex flex-col items-start gap-4 p-6">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Danger Zone</p>
            <div style={{ width: "85%", height: "0.667px", background: "rgba(255,255,255,0.07)", marginLeft: "15px", marginRight: "15px" }} />
            <button
                onClick={handleDeleteAccount}
                style={{ padding: "8px 16px", borderRadius: "6px", background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", color: "#FF6347", fontSize: "12px", fontWeight: 600, transition: "all 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "red"; e.currentTarget.style.border = "1px solid red"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#FF6347"; e.currentTarget.style.border = "1px solid rgba(255,0,0,0.3)"; }}
            >
                Delete Account
            </button>
        </div>
    );
}

function PersonalInformationCard({ investorInfo }) {
    // Generate initials from full name
    const initials = investorInfo?.full_name
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??";

    return (
        <GlassCard>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold">Personal Information</h1>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                        Your name, contact details and bio
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-[0.97]"
                    style={{
                        height: "38px", padding: "0 18px", borderRadius: "100px",
                        background: "linear-gradient(90deg,rgba(0,146,184,0.25),rgba(21,93,252,0.25))",
                        border: "0.667px solid rgba(0,211,243,0.35)", color: "#00D3F2",
                        fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    }}
                >
                    <SquarePen size={14} /> Edit
                </button>
            </div>

            {/* Avatar + name row */}
            <div className="flex items-center gap-4" style={{ margin: "24px 0" }}>
                <div style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #0092b8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", fontWeight: 700, color: "white", flexShrink: 0,
                }}>
                    {initials}
                </div>
                <div>
                    <p className="font-bold text-white" style={{ fontSize: "18px" }}>
                        {investorInfo?.full_name}
                    </p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                        @{investorInfo?.username}
                    </p>
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "24px" }} />

            {/* Info grid */}
            <div className="grid grid-cols-2" style={{ gap: "24px 32px" }}>
                <InfoRow label="Full Name" value={investorInfo?.full_name} />
                <InfoRow label="Phone Number" value={investorInfo?.phone_number} />
                <InfoRow label="Location" value={investorInfo?.address} />
                <InfoRow label="Email Address" value={investorInfo?.email} />
                <InfoRow label="Balance" value={investorInfo?.balance ? `$${investorInfo.balance.toLocaleString()}` : null} />
            </div>
        </GlassCard>
    );
}
function AccountSettingsCard() { return <div />; }
function SecurityCard() { return <div />; }
function PaperMoneyCard() { return <div />; }
function SubscriptionCard() { return <div />; }

function InvestorProfilePage() {
    const [activeTab, setActiveTab] = useState("personal");
    const [investorInfo, setInvestorInfo] = useState(null);
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser")));
    const userId = currentUser?.user_id;
    useEffect(() => {
        if (userId) {
            getInvestorInformation(userId)
                .then(data => {
                    if (data.success) {
                        setInvestorInfo(data.investor_information);
                    } else {
                        console.error("Failed to fetch investor information:", data.message || data);
                    }
                })
                .catch(error => {
                    console.error("Failed to fetch investor information:", error);
                });
        }
    }, [userId]); // stable primitive — no infinite loop
    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        >
            <GeneralHeader />
            <main className="flex-1 flex flex-col md:flex-row gap-8 px-6 py-10">
                {/* Left sidebar */}
                <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ width: "300px", borderRadius: "20px", border: "0.667px solid rgba(255,255,255,0.1)", overflow: "hidden", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
                        {/* FIX 1 applied here: JSX usage is now valid since LeftSection is a proper component */}
                        <LeftSection activeTab={activeTab} setActiveTab={setActiveTab} investorInfo={investorInfo} currentUser={currentUser} />
                    </div>
                    <div style={{ width: "300px", marginTop: "20px", borderRadius: "20px", border: "0.667px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
                        <DeleteAccountButton />
                    </div>
                </div>

                {/* Right content */}
                <div className="flex-1 flex flex-col">
                    {activeTab === "personal" && <PersonalInformationCard investorInfo={investorInfo} />}
                    {activeTab === "account" && <AccountSettingsCard />}
                    {activeTab === "security" && <SecurityCard />}
                    {activeTab === "paper-money" && <PaperMoneyCard />}
                    {activeTab === "subscription" && <SubscriptionCard />}
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}

export default InvestorProfilePage;