import { motion } from "framer-motion";
import { getInvestorInformation, deleteInvestor } from "../../api/userApi.js";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { updateUserInformation, updateStockLevel } from "../../api/userApi.js";
import { HandCoins, CircleDollarSign, Shield, User, ChartNoAxesColumn, SquarePen, PiggyBank } from "lucide-react";
/* ─── Editable field ──────────────────────────────────────── */
function FormField({ label, children, hint, htmlFor }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor={htmlFor} style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
            {children}
            {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{hint}</p>}
        </div>
    );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled = false, prefix, id }) {
    return (
        <div style={{ position: "relative" }}>
            {prefix && <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "rgba(255,255,255,0.35)" }}>{prefix}</span>}
            <input id={id} type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
                style={{
                    height: "44px", borderRadius: "10px",
                    border: "0.667px solid rgba(255,255,255,0.15)",
                    padding: prefix ? "0 14px 0 28px" : "0 14px",
                    fontSize: "14px", color: disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)",
                    background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                    width: "100%", outline: "none", transition: "all 0.15s",
                }}
                onFocus={e => { if (!disabled) { e.target.style.border = "0.667px solid rgba(0,211,243,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; } }}
                onBlur={e => { e.target.style.border = "0.667px solid rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }} />
        </div>
    );
}
function SaveRow({ onSave, onCancel }) {
    return (
        <div className="flex items-center justify-end gap-3" style={{ marginTop: "8px" }}>
            <button type="button" onClick={onCancel}
                className="font-medium hover:opacity-70 transition-opacity"
                style={{ height: "40px", padding: "0 20px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", border: "0.667px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer" }}>
                Cancel
            </button>
            <button type="submit" onClick={onSave}
                className="font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                style={{ height: "40px", padding: "0 24px", borderRadius: "10px", backgroundImage: "linear-gradient(90deg,#0092b8,#155dfc)", fontSize: "14px", boxShadow: "0 8px 18px rgba(0,184,219,0.2)", cursor: "pointer" }}>
                Save Changes
            </button>
        </div>
    );
}
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

// LeftSection is now a proper React component with destructured props
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
    const savePersonal = async (e) => {
        e.preventDefault()
    }
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
            <div style={{ position: "relative", padding: "0 18px", marginTop: "-34px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "10px" }}>
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
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = async () => {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        setLoading(true);
        try {
            const result = await deleteInvestor(currentUser?.user_id);
            if (result.success) {
                localStorage.removeItem("currentUser");
                navigate("/");
            } else {
                alert(result.message || "Failed to delete account");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to delete account");
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <div className="flex flex-col items-start gap-4 p-6">
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Danger Zone</p>
                <div style={{ width: "85%", height: "0.667px", background: "rgba(255,255,255,0.07)" }} />
                <button
                    onClick={() => setShowConfirm(true)}
                    style={{ padding: "8px 16px", borderRadius: "6px", background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", color: "#FF6347", fontSize: "12px", fontWeight: 600, transition: "all 0.2s ease", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "red"; e.currentTarget.style.border = "1px solid red"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#FF6347"; e.currentTarget.style.border = "1px solid rgba(255,0,0,0.3)"; }}
                >
                    Delete Account
                </button>
            </div>

            {showConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#0f1b2d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "12px" }}>Delete Account</h2>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "24px", lineHeight: 1.6 }}>
                            This will permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                style={{ padding: "8px 20px", borderRadius: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                style={{ padding: "8px 20px", borderRadius: "8px", background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.5)", color: "#f87171", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
                            >
                                {loading ? "Deleting…" : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function PersonalInformationCard({ investorInfo, onUpdate }) {
    const [draftFull, setDraftFull] = useState(investorInfo?.full_name || "");
    const [draftEmail, setDraftEmail] = useState(investorInfo?.email || "");
    const [draftUser, setDraftUser] = useState(investorInfo?.username || "");
    const [draftPhone, setDraftPhone] = useState(investorInfo?.phone_number != null ? String(investorInfo.phone_number) : "");
    const [draftLoc, setDraftLoc] = useState(investorInfo?.address || "");
    const [editingSection, setEditingSection] = useState(null);
    const isEditing = (section) => editingSection === section;
    // Generate initials from full name
    const initials = investorInfo?.full_name
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??";

    useEffect(() => {
        setDraftFull(investorInfo?.full_name || "");
        setDraftEmail(investorInfo?.email || "");
        setDraftUser(investorInfo?.username || "");
        setDraftPhone(investorInfo?.phone_number != null ? String(investorInfo.phone_number) : "");
        setDraftLoc(investorInfo?.address || "");
    }, [investorInfo]);

    const cancelEdit = () => {
        setDraftFull(investorInfo?.full_name || "");
        setDraftEmail(investorInfo?.email || "");
        setDraftUser(investorInfo?.username || "");
        setDraftPhone(investorInfo?.phone_number != null ? String(investorInfo.phone_number) : "");
        setDraftLoc(investorInfo?.address || "");
        setEditingSection(null);
    };
    const handleChange = async () => {
        try {

            const result = await updateUserInformation(
                investorInfo.user_id,
                draftUser,
                draftFull,
                draftEmail,
                draftPhone,
                draftLoc
            );

            if (result.success) {
                alert("Profile updated");
                setEditingSection(null);
                onUpdate();
            } else {
                alert(result.message);
            }

        } catch (error) {
            console.error(error);
            alert("Update failed");
        }
    };
    return (
        <GlassCard>
            {!isEditing("personal") ? (
                <>
                    {/* HEADER */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold">Personal Information</h1>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.5)",
                                    marginTop: "4px",
                                }}
                            >
                                Your name, contact details and bio
                            </p>
                        </div>

                        <button
                            className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-[0.97]"
                            style={{
                                height: "38px",
                                padding: "0 18px",
                                borderRadius: "100px",
                                background:
                                    "linear-gradient(90deg,rgba(0,146,184,0.25),rgba(21,93,252,0.25))",
                                border: "0.667px solid rgba(0,211,243,0.35)",
                                color: "#00D3F2",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                            onClick={() => setEditingSection("personal")}
                        >
                            <SquarePen size={14} />
                            Edit
                        </button>
                    </div>

                    {/* Avatar */}
                    <div
                        className="flex items-center gap-4"
                        style={{ margin: "24px 0" }}
                    >
                        <div
                            style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background:
                                    "linear-gradient(135deg, #3b82f6, #0092b8)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "white",
                                flexShrink: 0,
                            }}
                        >
                            {initials}
                        </div>

                        <div>
                            <p
                                className="font-bold text-white"
                                style={{ fontSize: "18px" }}
                            >
                                {investorInfo?.full_name}
                            </p>

                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.4)",
                                }}
                            >
                                @{investorInfo?.username}
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.06)",
                            marginBottom: "24px",
                        }}
                    />

                    {/* Info Grid */}
                    <div
                        className="grid grid-cols-2"
                        style={{ gap: "24px 32px" }}
                    >
                        <InfoRow
                            label="Full Name"
                            value={investorInfo?.full_name}
                        />
                        <InfoRow
                            label="Phone Number"
                            value={investorInfo?.phone_number}
                        />
                        <InfoRow
                            label="Location"
                            value={investorInfo?.address}
                        />
                        <InfoRow
                            label="Email Address"
                            value={investorInfo?.email}
                        />
                        <InfoRow
                            label="Balance"
                            value={
                                investorInfo?.balance
                                    ? `$${investorInfo.balance.toLocaleString()}`
                                    : null
                            }
                        />
                    </div>
                </>
            ) : (
                <>
                    {/* EDIT MODE */}
                    <div>
                        <h1 className="text-xl font-bold">
                            Edit Personal Information
                        </h1>
                        <p
                            style={{
                                fontSize: "13px",
                                color: "rgba(255,255,255,0.5)",
                                marginTop: "4px",
                            }}
                        >
                            Update your profile details
                        </p>
                    </div>

                    <div
                        className="flex flex-col"
                        style={{ gap: "20px", marginTop: "24px" }}
                    >
                        <div>
                            <FormField label="Full Name *" htmlFor="field-full-name">
                                <TextInput
                                    id="field-full-name"
                                    value={draftFull}
                                    onChange={setDraftFull}
                                    placeholder="Full name"
                                />
                            </FormField>
                        </div>

                        <div
                            className="grid grid-cols-2"
                            style={{ gap: "16px" }}
                        >
                            <FormField label="Username *" htmlFor="field-username">
                                <TextInput
                                    id="field-username"
                                    value={draftUser}
                                    onChange={setDraftUser}
                                    placeholder="username"
                                    prefix="@"
                                />
                            </FormField>

                            <FormField
                                label="Email Address"

                                htmlFor="field-email"
                            >
                                <TextInput id="field-email"
                                    value={draftEmail}
                                    onChange={setDraftEmail}
                                    placeholder="email@example.com"
                                    type="email" />
                            </FormField>
                        </div>

                        <div
                            className="grid grid-cols-2"
                            style={{ gap: "16px" }}
                        >
                            <FormField label="Phone Number" htmlFor="field-phone">
                                <TextInput
                                    id="field-phone"
                                    value={draftPhone}
                                    onChange={setDraftPhone}
                                    placeholder="+1 (555) 000-0000"
                                    type="tel"
                                />
                            </FormField>

                            <FormField label="Location" htmlFor="field-location">
                                <TextInput
                                    id="field-location"
                                    value={draftLoc}
                                    onChange={setDraftLoc}
                                    placeholder="City, Country"
                                />
                            </FormField>
                        </div>

                        <SaveRow
                            onSave={handleChange}
                            onCancel={cancelEdit}
                        />
                    </div>
                </>
            )}
        </GlassCard>
    );
}
function AccountSettingsCard({ investorInfo, onUpdate }) {
    const [editingSection, setEditingSection] = useState(null);
    const [riskLevel, setRiskLevel] = useState(investorInfo?.stock_level);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const role = currentUser?.role;
    const userId = currentUser?.user_id
    const isEditing = (section) => editingSection === section;


    const cancelEdit = () => {
        setEditingSection(null);
    };

    const handleClick = async (e) => {
        e.preventDefault();

        try {
            const result = await updateStockLevel(userId, riskLevel);
            if (result.success) {
                alert("Risk level updated");
                setEditingSection(null);
                onUpdate();
            } else {
                alert(result.message || "Failed to update risk level");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update information");
        }
    };

    return (
        <GlassCard>
            {!isEditing("account") ? (
                <>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold">
                                Account Settings
                            </h1>

                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "rgba(255,255,255,0.5)",
                                    marginTop: "4px",
                                }}
                            >
                                Trading preferences and account type
                            </p>
                        </div>

                        <button
                            onClick={() =>
                                setEditingSection("account")
                            }
                            className="flex items-center gap-2"
                            style={{
                                height: "38px",
                                padding: "0 18px",
                                borderRadius: "100px",
                                background:
                                    "linear-gradient(90deg,rgba(0,146,184,0.25),rgba(21,93,252,0.25))",
                                border:
                                    "0.667px solid rgba(0,211,243,0.35)",
                                color: "#00D3F2",
                                cursor: "pointer",
                            }}
                        >
                            <SquarePen size={14} />
                            Edit
                        </button>
                    </div>

                    <div style={{ marginTop: "32px" }}>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "rgba(255,255,255,0.4)",
                                marginBottom: "16px",
                                fontWeight: 600,
                            }}
                        >
                            RISK LEVEL
                        </p>

                        <div className="flex items-center gap-3">
                            <div
                                style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    background: "#3B82F6",
                                }}
                            />

                            <span
                                style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                }}
                            >
                                {riskLevel}
                            </span>

                            <span
                                style={{
                                    color:
                                        "rgba(255,255,255,0.4)",
                                }}
                            >
                                · Balanced risk & reward
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            height: "1px",
                            background:
                                "rgba(255,255,255,0.06)",
                            margin: "32px 0",
                        }}
                    />

                    <div>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "rgba(255,255,255,0.4)",
                                marginBottom: "16px",
                                fontWeight: 600,
                            }}
                        >
                            ACCOUNT TYPE
                        </p>

                        <div className="flex items-center gap-4">
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "10px",
                                    background:
                                        "rgba(0,211,242,0.1)",
                                    border:
                                        "1px solid rgba(0,211,242,0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                $
                            </div>

                            <div>
                                <div
                                    style={{
                                        fontWeight: 700,
                                        fontSize: "18px",
                                    }}
                                >
                                    {role}
                                </div>

                                <div
                                    style={{
                                        color:
                                            "rgba(255,255,255,0.45)",
                                    }}
                                >
                                    Trade & track your portfolio
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="text-xl font-bold">
                        Edit Account Settings
                    </h1>

                    <div
                        className="flex flex-col"
                        style={{
                            gap: "20px",
                            marginTop: "24px",
                        }}
                    >
                        <FormField label="Risk Level" htmlFor="field-risk-level">
                            <select
                                id="field-risk-level"
                                value={riskLevel}
                                onChange={(e) =>
                                    setRiskLevel(e.target.value)
                                }
                                className="w-full h-11 rounded-lg bg-slate-800 border border-slate-600 px-3"
                            >
                                <option>Basic</option>
                                <option>Intermediate</option>
                                <option>Advanced</option>
                            </select>
                        </FormField>

                        <SaveRow
                            onSave={handleClick}
                            onCancel={cancelEdit}
                        />
                    </div>
                </>
            )}
        </GlassCard>
    );
}
function SecurityCard({ investorInfo }) {
    const navigate = useNavigate();


    return (
        <GlassCard>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">
                        Security
                    </h1>

                    <p
                        style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.5)",
                            marginTop: "4px",
                        }}
                    >
                        Password and account protection
                    </p>
                </div>

                <button
                    onClick={() => navigate("/change-password")}
                    className="flex items-center gap-2"
                    style={{
                        height: "38px",
                        padding: "0 18px",
                        borderRadius: "100px",
                        background:
                            "linear-gradient(90deg,rgba(0,146,184,0.25),rgba(21,93,252,0.25))",
                        border:
                            "0.667px solid rgba(0,211,243,0.35)",
                        color: "#00D3F2",
                        cursor: "pointer",
                    }}
                >
                    <SquarePen size={14} />
                    Change Password
                </button>
            </div>

            <div style={{ marginTop: "32px" }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "12px",
                                background:
                                    "rgba(34,197,94,0.08)",
                                border:
                                    "1px solid rgba(34,197,94,0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Shield
                                size={18}
                                color="#22c55e"
                            />
                        </div>

                        <div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: "16px",
                                }}
                            >
                                Password : {investorInfo?.password}
                            </div>
                            <div
                                style={{
                                    fontSize: "13px",
                                    color:
                                        "rgba(255,255,255,0.4)",
                                    marginTop: "2px",
                                }}
                            >
                                Last changed 3 months ago
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            background:
                                "rgba(34,197,94,0.12)",
                            border:
                                "1px solid rgba(34,197,94,0.25)",
                            color: "#22c55e",
                            fontSize: "13px",
                            fontWeight: 600,
                        }}
                    >
                        Secure
                    </div>
                </div>
            </div>
        </GlassCard>
    );


}

function PaperMoneyCard({ investorInfo }) {
    const navigate = useNavigate();
    return (
        <GlassCard>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">
                        Paper Money
                    </h1>

                    <p
                        style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.5)",
                            marginTop: "4px",
                        }}
                    >
                        Manage your virtual trading funds
                    </p>
                </div>


            </div>
            <div
                style={{
                    height: "1px",
                    background:
                        "rgba(255,255,255,0.06)",
                    margin: "32px 0",
                }}
            />

            <div style={{ marginTop: "32px" }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "12px",
                                background:
                                    "rgba(34,197,94,0.08)",
                                border:
                                    "1px solid rgba(34,197,94,0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <PiggyBank
                                size={18}
                                color="yellow"
                            />
                        </div>

                        <div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: "16px",
                                }}
                            >
                                Available Balance : $ {investorInfo?.paper_money}.00
                            </div>
                            <div
                                style={{
                                    fontSize: "13px",
                                    color:
                                        "rgba(255,255,255,0.4)",
                                    marginTop: "2px",
                                }}
                            >
                                Use paper money to practice stock trading
                                without risking real capital.
                            </div>
                        </div>
                    </div>

                    <button
                        style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            background:
                                "rgba(34,197,94,0.12)",
                            border:
                                "1px solid rgba(34,197,94,0.25)",
                            color: "#22c55e",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Add Money
                    </button>
                </div>
                <div style={{ marginTop: "24px" }}>
                    <div
                        className="flex justify-between"
                        style={{
                            fontSize: "13px",
                            marginBottom: "8px",
                            color: "rgba(255,255,255,0.7)"
                        }}
                    >
                        <span>Paper Trading Capital</span>
                        <span>$2,000 / $10,000</span>
                    </div>

                    <div
                        style={{
                            width: "100%",
                            height: "10px",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.08)",
                            overflow: "hidden"
                        }}
                    >
                        <div
                            style={{
                                width: "20%", // hardcoded
                                height: "100%",
                                background:
                                    "linear-gradient(90deg,#22c55e,#00D3F2)",
                                borderRadius: "999px"
                            }}
                        />
                    </div>

                    <div
                        className="flex justify-between"
                        style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.4)"
                        }}
                    >
                        <span>Used: $8,000</span>
                        <span>Remaining: $2,000</span>
                    </div>
                </div>
            </div>
        </GlassCard>);
}
function SubscriptionCard() { return <div />; }

function InvestorProfilePage() {
    const [activeTab, setActiveTab] = useState("personal");
    const [investorInfo, setInvestorInfo] = useState(null);
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser")));
    const userId = currentUser?.user_id;

    const fetchInvestorInfo = () => {
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
    };

    useEffect(() => {
        fetchInvestorInfo();
    }, [userId]);

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
                        <LeftSection activeTab={activeTab} setActiveTab={setActiveTab} investorInfo={investorInfo} currentUser={currentUser} />
                    </div>
                    <div style={{ width: "300px", marginTop: "20px", borderRadius: "20px", border: "0.667px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
                        <DeleteAccountButton />
                    </div>
                </div>

                {/* Right content */}
                <div className="flex-1 flex flex-col">
                    {activeTab === "personal" && <PersonalInformationCard investorInfo={investorInfo} onUpdate={fetchInvestorInfo} />}
                    {activeTab === "account" && <AccountSettingsCard investorInfo={investorInfo} onUpdate={fetchInvestorInfo} />}
                    {activeTab === "security" && <SecurityCard investorInfo={investorInfo} />}
                    {activeTab === "paper-money" && <PaperMoneyCard investorInfo={investorInfo} />}
                    {activeTab === "subscription" && <SubscriptionCard />}
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}

export default InvestorProfilePage;