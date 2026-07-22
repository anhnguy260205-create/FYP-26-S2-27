import { motion } from "framer-motion";
import { getInvestorInformation, deleteInvestor, getSubscriptionDetails, updateSubscriptionStatus, cancelSubscription } from "../../api/userApi.js";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPageBackground, getAvatarGradient, isExpertUser } from "../../utils/userRole.js";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { updateUserInformation, updateInvestorInterests, updateRiskTolerance } from "../../api/userApi.js";
import { HandCoins, CircleDollarSign, Shield, User, ChartNoAxesColumn, SquarePen, PiggyBank, Lock } from "lucide-react";
import { addPaperMoney } from "../../api/tradingApi.js";

/* ─── Light theme tokens ──────────────────────────────────── */
const ACCENT_TEXT = "#004450";
const HEADING = "#0B1D4F";
const TEXT_BODY = "#0F172A";
const TEXT_MUTED = "#33477A";
const TEXT_MUTED2 = "#5B6C88";
const TEXT_FAINT = "rgba(15,23,42,0.45)";
const CARD_BG = "#FFFFFF";
const CARD_BG_MUTED = "#F1F5F9";
const CARD_BORDER = "rgba(11,29,79,0.25)";
const DIVIDER = "rgba(15,23,42,0.1)";
const SUCCESS = "#0F9D58";
const DANGER = "#DC2626";
const GOLD = "#92400E";
const AMBER = "#B45309";
const BLUE = "#1D4ED8";
const CARD_SHADOW = "0 4px 20px rgba(15,23,42,0.06)";
const MODAL_SHADOW = "0 20px 60px rgba(15,23,42,0.25)";

const SPECIALTIES = [
    "Information Technology",
    "Financials",
    "Consumer Discretionary",
    "Communication Services",
    "Energy",
    "Real Estate",
    "Health Care",
    "Consumer Staples",
    "Industrials",
    "Materials",
    "Utilities",
];
/* ─── Editable field ──────────────────────────────────────── */
function FormField({ label, children, hint, htmlFor }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor={htmlFor} style={{ fontSize: "12px", fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
            {children}
            {hint && <p style={{ fontSize: "11px", color: TEXT_FAINT }}>{hint}</p>}
        </div>
    );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled = false, prefix, id }) {
    return (
        <div style={{ position: "relative" }}>
            {prefix && <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "rgba(15,23,42,0.4)" }}>{prefix}</span>}
            <input id={id} type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
                style={{
                    height: "44px", borderRadius: "10px",
                    border: "1px solid rgba(15,23,42,0.15)",
                    padding: prefix ? "0 14px 0 28px" : "0 14px",
                    fontSize: "14px", color: disabled ? "rgba(15,23,42,0.35)" : TEXT_BODY,
                    background: disabled ? CARD_BG_MUTED : "#F8FAFC",
                    width: "100%", outline: "none", transition: "all 0.15s",
                }}
                onFocus={e => { if (!disabled) { e.target.style.border = "1px solid rgba(0,211,243,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.15)"; } }}
                onBlur={e => { e.target.style.border = "1px solid rgba(15,23,42,0.15)"; e.target.style.boxShadow = "none"; }} />
        </div>
    );
}
function SaveRow({ onSave, onCancel }) {
    return (
        <div className="flex items-center justify-end gap-3" style={{ marginTop: "8px" }}>
            <button type="button" onClick={onCancel}
                className="font-medium hover:opacity-70 transition-opacity"
                style={{ height: "40px", padding: "0 20px", borderRadius: "10px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.15)", color: TEXT_MUTED, fontSize: "14px", cursor: "pointer" }}>
                Cancel
            </button>
            <button type="submit" onClick={onSave}
                className="font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                style={{ height: "40px", padding: "0 24px", borderRadius: "10px", backgroundImage: "linear-gradient(90deg,#0092b8,#155dfc)", fontSize: "14px", boxShadow: "0 8px 18px rgba(0,146,184,0.25)", cursor: "pointer" }}>
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
                background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: "24px",
                padding: "32px",
                boxShadow: CARD_SHADOW,

            }}
        >
            {children}
        </div>
    );
}
function InfoRow({ label, value }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
            </span>
            <span style={{ fontSize: "15px", color: TEXT_BODY }}>
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
                color: active ? ACCENT_TEXT : TEXT_MUTED2,
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
    const initials = investorInfo?.username?.slice(0, 2)?.toUpperCase() ?? "?";


    const subscriptionStatus = investorInfo?.investor_subscription_status?.toLowerCase();

    // Merged roles: verified experts show an orange Expert badge instead of
    // the yellow Premium one (they hold complimentary premium anyway).
    const isVerifiedExpert =
        currentUser?.is_expert === true &&
        ["approved", "active"].includes(String(currentUser?.verification_status || "").toLowerCase());

    const badgeLabel = isVerifiedExpert ? "Expert" : subscriptionStatus === "premium" ? "Premium" : "Basic";
    const subscriptionStyle = isVerifiedExpert
        ? { background: "rgba(249, 115, 22, 0.15)", border: "1px solid rgba(249, 115, 22, 0.55)", color: "#F97316" }
        : subscriptionStatus === "premium"
            ? { background: "rgba(255, 215, 0, 0.15)", border: "1px solid rgba(255, 215, 0, 0.5)", color: "#FFD700" }
            : subscriptionStatus === "basic"
                ? { background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(0, 211, 243, 0.4)", color: "#00D3F2" }
                : {};
    const savePersonal = async (e) => {
        e.preventDefault()
    }
    return (
        <div className="flex flex-col shrink-0" style={{ gap: "16px" }}>
            {/* Banner — kept as a deliberate dark cover panel (same pattern as Hero()) so the badge stays legible */}
            <div style={{ position: "relative", height: "78px", background: "linear-gradient(135deg,#020618 0%,#0d2d5e 45%,#0092b8 100%)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-22px", right: "-18px", width: "88px", height: "88px", borderRadius: "50%", background: "rgba(0,211,243,0.1)", border: "0.667px solid rgba(0,211,243,0.14)" }} />
                <div style={{ position: "absolute", bottom: "-32px", left: "14px", width: "68px", height: "68px", borderRadius: "50%", background: "rgba(81,162,255,0.09)", border: "0.667px solid rgba(81,162,255,0.1)" }} />
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} preserveAspectRatio="none" viewBox="0 0 256 78">
                    {[0, 32, 64, 96, 128, 160, 192, 224, 256].map(x => <line key={x} x1={x} y1="0" x2={x} y2="78" stroke="white" strokeWidth="0.5" />)}
                    {[0, 20, 40, 60, 78].map(y => <line key={y} x1="0" y1={y} x2="256" y2={y} stroke="white" strokeWidth="0.5" />)}
                </svg>
                <div style={{ position: "absolute", top: "9px", right: "9px", padding: "2px 9px", borderRadius: "100px", background: "rgba(0,0,0,0.35)", border: "0.667px solid rgba(0,211,243,0.4)", fontSize: "10px", fontWeight: 700, color: "#00D3F2", ...subscriptionStyle }}>
                    ★ {badgeLabel}
                </div>
            </div>

            {/* Avatar */}
            <div style={{ position: "relative", padding: "0 18px", marginTop: "-34px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "10px" }}>
                <div className="relative group" style={{ cursor: "pointer" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: getAvatarGradient(), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 3px #FFFFFF" }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>{initials}</span>
                    </div>
                </div>
            </div>

            {/* Username and email */}
            <div style={{ padding: "0 18px" }}>
                <p className="font-bold" style={{ fontSize: "15px", lineHeight: 1.2, color: HEADING }}>{investorInfo?.full_name}</p>
                <p style={{ fontSize: "11px", color: TEXT_MUTED2, marginTop: "2px" }}>@{investorInfo?.username}</p>
            </div>

            {/* Tags */}
            <div style={{ padding: "0 18px", display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.08)" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0092b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span style={{ fontSize: "10px", color: TEXT_MUTED2 }}>{investorInfo?.address}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.08)" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0092b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    {/* Gate on VERIFIED expert, not merely is_expert: an Expert row
                        exists from the moment someone applies, so isExpertUser()
                        would label a pending applicant "Expert" before review. */}
                    <span style={{ fontSize: "10px", color: isVerifiedExpert ? "#F97316" : TEXT_MUTED2, fontWeight: isVerifiedExpert ? 700 : 400 }}>
                        {isVerifiedExpert ? "Expert" : "Investor"}
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: "80%", height: "1px", background: DIVIDER, marginLeft: "18px", marginRight: "18px" }} />

            <div className="flex" style={{ gap: "7px", padding: "0 18px" }}>
                <div style={{ borderRadius: "10px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.08)", padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "9px", color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>MEMBER SINCE</span>
                    </div>
                    <p className="font-bold" style={{ fontSize: "11px", color: HEADING }}>
                        {investorInfo?.join_date ? new Date(investorInfo.join_date).toLocaleDateString() : "—"}
                    </p>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: "80%", height: "1px", background: DIVIDER, marginLeft: "18px", marginRight: "18px" }} />

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
        const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
        setLoading(true);
        try {
            const result = await deleteInvestor(currentUser?.user_id);
            if (result.success) {
                sessionStorage.removeItem("currentUser");
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
                <p style={{ fontSize: "14px", color: TEXT_MUTED, fontWeight: 500 }}>Danger Zone</p>
                <div style={{ width: "85%", height: "1px", background: DIVIDER }} />
                <button
                    onClick={() => setShowConfirm(true)}
                    style={{ padding: "8px 16px", borderRadius: "6px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", color: DANGER, fontSize: "12px", fontWeight: 600, transition: "all 0.2s ease", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#B91C1C"; e.currentTarget.style.border = "1px solid #B91C1C"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = DANGER; e.currentTarget.style.border = "1px solid rgba(220,38,38,0.3)"; }}
                >
                    Delete Account
                </button>
            </div>

            {showConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%", boxShadow: MODAL_SHADOW, textAlign: "center" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: HEADING, marginBottom: "12px" }}>Delete Account</h2>
                        <p style={{ fontSize: "14px", color: TEXT_MUTED, marginBottom: "24px", lineHeight: 1.6 }}>
                            This will permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                style={{ width: "100px", padding: "8px 20px", borderRadius: "8px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.15)", color: TEXT_MUTED, fontSize: "14px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                style={{ width: "100px", padding: "8px 20px", borderRadius: "8px", background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.45)", color: DANGER, fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
                            >
                                {loading ? "Deleting…" : "Yes"}
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
    const [draftEmail, setDraftEmail] = useState(investorInfo?.email_address || "");
    const [draftUser, setDraftUser] = useState(investorInfo?.username || "");
    const [draftPhone, setDraftPhone] = useState(investorInfo?.phone_number != null ? String(investorInfo.phone_number) : "");
    const [draftLoc, setDraftLoc] = useState(investorInfo?.address || "");
    const [editingSection, setEditingSection] = useState(null);
    const isEditing = (section) => editingSection === section;
    // Generate initials from username
    const initials = investorInfo?.username?.slice(0, 2)?.toUpperCase() ?? "??";

    useEffect(() => {
        setDraftFull(investorInfo?.full_name || "");
        setDraftEmail(investorInfo?.email_address || "");
        setDraftUser(investorInfo?.username || "");
        setDraftPhone(investorInfo?.phone_number != null ? String(investorInfo.phone_number) : "");
        setDraftLoc(investorInfo?.address || "");
    }, [investorInfo]);

    const cancelEdit = () => {
        setDraftFull(investorInfo?.full_name || "");
        setDraftEmail(investorInfo?.email_address || "");
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
                // Patch localStorage so header/other components reflect the change immediately
                const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
                stored.full_name = draftFull;
                stored.username = draftUser;
                stored.email_address = draftEmail;
                sessionStorage.setItem("currentUser", JSON.stringify(stored));

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
                            <h1 className="text-xl font-bold" style={{ color: HEADING }}>Personal Information</h1>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: TEXT_MUTED,
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
                                    "linear-gradient(90deg,rgba(0,146,184,0.14),rgba(21,93,252,0.14))",
                                border: "1px solid rgba(0,211,243,0.4)",
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
                                background: getAvatarGradient(),
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
                                className="font-bold"
                                style={{ fontSize: "18px", color: HEADING }}
                            >
                                {investorInfo?.full_name}
                            </p>

                            <p
                                style={{
                                    fontSize: "13px",
                                    color: TEXT_MUTED2,
                                }}
                            >
                                @{investorInfo?.username}
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            height: "1px",
                            background: DIVIDER,
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
                            value={investorInfo?.email_address}
                        />

                    </div>
                </>
            ) : (
                <>
                    {/* EDIT MODE */}
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: HEADING }}>
                            Edit Personal Information
                        </h1>
                        <p
                            style={{
                                fontSize: "13px",
                                color: TEXT_MUTED,
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
    const [selectedInterests, setSelectedInterests] = useState(
        () => investorInfo?.interests ? investorInfo.interests.split(",").map(s => s.trim()).filter(Boolean) : []
    );
    const [selectedRisk, setSelectedRisk] = useState(
        () => investorInfo?.risk_tolerance || ""
    );
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    const role = currentUser?.role;
    const userId = currentUser?.user_id;
    // Gate on VERIFIED expert, not merely is_expert — see the same pattern
    // used for the profile badge above.
    const isVerifiedExpert =
        currentUser?.is_expert === true &&
        ["approved", "active"].includes(String(currentUser?.verification_status || "").toLowerCase());
    const accountTypeLabel = isVerifiedExpert
        ? "Expert"
        : role ? role.charAt(0).toUpperCase() + role.slice(1) : "Investor";
    const isEditing = (section) => editingSection === section;

    useEffect(() => {
        setSelectedInterests(
            investorInfo?.interests ? investorInfo.interests.split(",").map(s => s.trim()).filter(Boolean) : []
        );
        setSelectedRisk(investorInfo?.risk_tolerance || "");
    }, [investorInfo]);

    const toggleInterest = (specialty) => {
        setSelectedInterests(prev =>
            prev.includes(specialty) ? prev.filter(s => s !== specialty) : [...prev, specialty]
        );
    };

    const cancelEdit = () => {
        setSelectedInterests(
            investorInfo?.interests ? investorInfo.interests.split(",").map(s => s.trim()).filter(Boolean) : []
        );
        setSelectedRisk(investorInfo?.risk_tolerance || "");
        setEditingSection(null);
    };

    const handleClick = async (e) => {
        e.preventDefault();
        try {
            const [interestResult, riskResult] = await Promise.all([
                updateInvestorInterests(userId, selectedInterests.join(",")),
                selectedRisk ? updateRiskTolerance(userId, selectedRisk) : Promise.resolve({ success: true }),
            ]);
            if (interestResult.success && riskResult.success) {
                const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
                stored.interests = selectedInterests.join(",");
                stored.risk_tolerance = selectedRisk;
                sessionStorage.setItem("currentUser", JSON.stringify(stored));

                alert("Account settings updated");
                setEditingSection(null);
                onUpdate();
            } else {
                alert("Failed to update settings");
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
                            <h1 className="text-xl font-bold" style={{ color: HEADING }}>Account Settings</h1>
                            <p style={{ fontSize: "13px", color: TEXT_MUTED, marginTop: "4px" }}>
                                Stock interests and account type
                            </p>
                        </div>
                        <button onClick={() => setEditingSection("account")}
                            className="flex items-center gap-2"
                            style={{ height: "38px", padding: "0 18px", borderRadius: "100px", background: "linear-gradient(90deg,rgba(0,146,184,0.14),rgba(21,93,252,0.14))", border: "1px solid rgba(0,211,243,0.4)", color: "#00D3F2", cursor: "pointer" }}>
                            <SquarePen size={14} />
                            Edit
                        </button>
                    </div>

                    {/* Stock Interests */}
                    <div style={{ marginTop: "32px" }}>
                        <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginBottom: "12px", fontWeight: 600 }}>
                            STOCK INTERESTS
                        </p>
                        {selectedInterests.length === 0 ? (
                            <p style={{ fontSize: "13px", color: TEXT_FAINT }}>No interests selected — edit to pick sectors you care about.</p>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {selectedInterests.map(s => (
                                    <span key={s} style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "rgba(0,211,243,0.12)", border: "1px solid rgba(0,211,243,0.35)", color: "#00D3F2" }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ height: "1px", background: DIVIDER, margin: "24px 0" }} />

                    {/* Risk Tolerance */}
                    <div>
                        <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginBottom: "12px", fontWeight: 600 }}>
                            RISK TOLERANCE
                        </p>
                        {selectedRisk ? (
                            <span style={{ padding: "4px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "rgba(0,211,243,0.12)", border: "1px solid rgba(0,211,243,0.35)", color: "#00D3F2" }}>
                                {selectedRisk}
                            </span>
                        ) : (
                            <p style={{ fontSize: "13px", color: TEXT_FAINT }}>Not set — edit to choose your risk profile.</p>
                        )}
                    </div>

                    <div style={{ height: "1px", background: DIVIDER, margin: "24px 0" }} />

                    {/* Account Type */}
                    <div>
                        <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginBottom: "16px", fontWeight: 600 }}>ACCOUNT TYPE</p>
                        <div className="flex items-center gap-4">
                            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,211,242,0.1)", border: "1px solid rgba(0,211,242,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00D3F2" }}>$</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "18px", color: HEADING }}>{accountTypeLabel}</div>
                                <div style={{ color: TEXT_MUTED2 }}>
                                    {isVerifiedExpert ? "Share your expertise & track your portfolio" : "Trade & track your portfolio"}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="text-xl font-bold" style={{ color: HEADING }}>Edit Account Settings</h1>
                    <div className="flex flex-col" style={{ gap: "24px", marginTop: "24px" }}>

                        {/* Stock Interests */}
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "10px" }}>
                                Stock Interests <span style={{ color: TEXT_FAINT, fontWeight: 400 }}>(select all that apply)</span>
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {SPECIALTIES.map(s => {
                                    const active = selectedInterests.includes(s);
                                    return (
                                        <button key={s} type="button" onClick={() => toggleInterest(s)}
                                            style={{
                                                padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                                                background: active ? "rgba(0,211,243,0.15)" : CARD_BG_MUTED,
                                                border: active ? "1px solid rgba(0,211,243,0.5)" : "1px solid rgba(15,23,42,0.15)",
                                                color: active ? "#00D3F2" : TEXT_MUTED2,
                                            }}>
                                            {active ? "✓ " : ""}{s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Risk Tolerance */}
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "10px" }}>
                                Risk Tolerance <span style={{ color: TEXT_FAINT, fontWeight: 400 }}>(select one)</span>
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {[
                                    { value: "Conservative", desc: "Preserve capital, low risk" },
                                    { value: "Moderate", desc: "Balanced growth and safety" },
                                    { value: "Aggressive", desc: "High growth, higher risk" },
                                ].map(({ value, desc }) => {
                                    const active = selectedRisk === value;
                                    return (
                                        <button key={value} type="button" title={desc}
                                            onClick={() => setSelectedRisk(active ? "" : value)}
                                            style={{
                                                padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                                                background: active ? "rgba(0,211,243,0.15)" : CARD_BG_MUTED,
                                                border: active ? "1px solid rgba(0,211,243,0.5)" : "1px solid rgba(15,23,42,0.15)",
                                                color: active ? "#00D3F2" : TEXT_MUTED2,
                                            }}>
                                            {active ? "✓ " : ""}{value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <SaveRow onSave={handleClick} onCancel={cancelEdit} />
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
                    <h1 className="text-xl font-bold" style={{ color: HEADING }}>
                        Security
                    </h1>

                    <p
                        style={{
                            fontSize: "13px",
                            color: TEXT_MUTED,
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
                            "linear-gradient(90deg,rgba(0,146,184,0.14),rgba(21,93,252,0.14))",
                        border:
                            "1px solid rgba(0,211,243,0.4)",
                        color: "#00D3F2",
                        cursor: "pointer",
                    }}
                >
                    <SquarePen size={14} />
                    Reset Password
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
                                color={SUCCESS}
                            />
                        </div>

                        <div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: "16px",
                                    color: HEADING,
                                }}
                            >
                                Password : {investorInfo?.password}
                            </div>
                            <div
                                style={{
                                    fontSize: "13px",
                                    color:
                                        TEXT_MUTED2,
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
                            color: SUCCESS,
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

function PaperMoneyCard({ investorInfo, onUpdate }) {
    const navigate = useNavigate();
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const isPremium = currentUser?.subscription_status?.toLowerCase() === "premium";

    const MAX_BALANCE = 10000;
    const paperMoney = investorInfo?.paper_money ?? 0;
    const usedAmount = investorInfo?.used_amount ?? 0;
    const progressPct = Math.min(100, (paperMoney / MAX_BALANCE) * 100);
    const maxAddable = Math.max(0, MAX_BALANCE - paperMoney);

    const [showModal, setShowModal] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState(1000);
    const [adding, setAdding] = useState(false);

    const presets = [500, 1000, 2000, 5000];

    const handleAddClick = () => {
        if (!isPremium) {
            setShowModal("upgrade");
        } else if (maxAddable <= 0) {
            setShowModal("capped");
        } else {
            setSelectedAmount(Math.min(1000, maxAddable));
            setShowModal("add");
        }
    };

    const handleConfirmAdd = async () => {
        setAdding(true);
        try {
            const result = await addPaperMoney(currentUser.user_id, selectedAmount);
            if (result.success) {
                setShowModal(false);
                onUpdate();
            } else {
                // result.message = our custom message
                // result.detail  = FastAPI validation / 404 / 500 format
                const msg = result.message
                    || (Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail)
                    || "Failed to add money";
                alert(msg);
            }
        } catch {
            alert("Could not reach backend");
        } finally {
            setAdding(false);
        }
    };

    return (
        <>
            <GlassCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: HEADING }}>Paper Money</h1>
                        <p style={{ fontSize: "13px", color: TEXT_MUTED, marginTop: "4px" }}>
                            Manage your virtual trading funds
                        </p>
                    </div>
                </div>

                <div style={{ height: "1px", background: DIVIDER, margin: "32px 0" }} />

                <div style={{ marginTop: "32px" }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <PiggyBank size={18} color={SUCCESS} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "16px", color: HEADING }}>
                                    Available Balance: ${paperMoney.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: "13px", color: TEXT_MUTED2, marginTop: "2px" }}>
                                    Use paper money to practice stock trading without risking real capital.
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAddClick}
                            style={{
                                display: "flex", alignItems: "center", gap: "6px",
                                padding: "6px 14px", borderRadius: "999px",
                                background: isPremium ? "rgba(34,197,94,0.12)" : CARD_BG_MUTED,
                                border: isPremium ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(15,23,42,0.15)",
                                color: isPremium ? SUCCESS : "rgba(15,23,42,0.4)",
                                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            {!isPremium && <Lock size={12} />}
                            Add Money
                        </button>
                    </div>

                    {/* Non-premium hint */}
                    {!isPremium && (
                        <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                            <p style={{ fontSize: "12px", color: AMBER, margin: 0 }}>
                                Adding paper money is a <strong>Premium</strong> feature.
                            </p>
                            <button
                                onClick={() => navigate("/investor/subscription")}
                                style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: AMBER, fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                                Upgrade →
                            </button>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div style={{ marginTop: "24px" }}>
                        <div className="flex justify-between" style={{ fontSize: "13px", marginBottom: "8px", color: "rgba(15,23,42,0.7)" }}>
                            <span>Paper Trading Capital</span>
                            <span>${paperMoney.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${MAX_BALANCE.toLocaleString()}</span>
                        </div>
                        <div style={{ width: "100%", height: "10px", borderRadius: "999px", background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
                            <div style={{ width: `${progressPct}%`, height: "100%", background: `linear-gradient(90deg,${SUCCESS},#00D3F2)`, borderRadius: "999px", transition: "width 0.4s ease" }} />
                        </div>
                        <div className="flex justify-between" style={{ marginTop: "8px", fontSize: "12px", color: TEXT_MUTED2 }}>
                            <span>Invested: ${usedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            <span>Cash: ${paperMoney.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* ── Add Money Modal ── */}
            {showModal === "add" && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%", boxShadow: MODAL_SHADOW }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: HEADING, marginBottom: "6px" }}>Add Paper Money</h2>
                        <p style={{ fontSize: "13px", color: TEXT_MUTED, marginBottom: "24px" }}>
                            Max you can add: <strong style={{ color: SUCCESS }}>${maxAddable.toLocaleString()}</strong>
                        </p>

                        <p style={{ fontSize: "11px", color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Select amount</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
                            {presets.map(p => {
                                const disabled = p > maxAddable;
                                return (
                                    <button key={p} disabled={disabled} onClick={() => setSelectedAmount(p)}
                                        style={{
                                            padding: "10px 0", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
                                            border: selectedAmount === p ? "1px solid rgba(34,197,94,0.6)" : "1px solid rgba(15,23,42,0.15)",
                                            background: selectedAmount === p ? "rgba(34,197,94,0.15)" : CARD_BG_MUTED,
                                            color: disabled ? "rgba(15,23,42,0.3)" : selectedAmount === p ? SUCCESS : "rgba(15,23,42,0.7)",
                                        }}>
                                        ${p.toLocaleString()}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", marginBottom: "20px" }}>
                            <p style={{ fontSize: "12px", color: TEXT_MUTED2, margin: "0 0 4px" }}>New balance after top-up</p>
                            <p style={{ fontSize: "20px", fontWeight: 700, color: SUCCESS, margin: 0 }}>
                                ${(paperMoney + selectedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} disabled={adding}
                                style={{ flex: 1, padding: "10px", borderRadius: "8px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.15)", color: TEXT_MUTED, fontSize: "14px", cursor: "pointer" }}>
                                Cancel
                            </button>
                            <button onClick={handleConfirmAdd} disabled={adding || selectedAmount > maxAddable}
                                style={{ flex: 2, padding: "10px", borderRadius: "8px", background: "linear-gradient(90deg,rgba(34,197,94,0.3),rgba(0,211,242,0.2))", border: "1px solid rgba(34,197,94,0.4)", color: SUCCESS, fontSize: "14px", fontWeight: 700, cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.6 : 1 }}>
                                {adding ? "Adding…" : `Add $${selectedAmount.toLocaleString()}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Upgrade Prompt Modal ── */}
            {showModal === "upgrade" && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: CARD_BG, border: "1px solid rgba(251,191,36,0.35)", borderRadius: "16px", padding: "32px", maxWidth: "380px", width: "90%", textAlign: "center", boxShadow: MODAL_SHADOW }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <Lock size={20} color={AMBER} />
                        </div>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: HEADING, marginBottom: "8px" }}>Premium Feature</h2>
                        <p style={{ fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.6, marginBottom: "24px" }}>
                            Adding paper money is only available to <strong style={{ color: AMBER }}>Premium</strong> subscribers. Upgrade your plan to top up your virtual trading balance.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)}
                                style={{ flex: 1, padding: "10px", borderRadius: "8px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.15)", color: TEXT_MUTED, fontSize: "14px", cursor: "pointer" }}>
                                Cancel
                            </button>
                            <button onClick={() => navigate("/investor/subscription")}
                                style={{ flex: 2, padding: "10px", borderRadius: "8px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: AMBER, fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                                Upgrade to Premium
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Balance Capped Modal ── */}
            {showModal === "capped" && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: CARD_BG, border: "1px solid rgba(29,78,216,0.25)", borderRadius: "16px", padding: "32px", maxWidth: "360px", width: "90%", textAlign: "center", boxShadow: MODAL_SHADOW }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: HEADING, marginBottom: "8px" }}>Balance at Maximum</h2>
                        <p style={{ fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.6, marginBottom: "24px" }}>
                            Your paper money balance has reached the <strong style={{ color: BLUE }}>${MAX_BALANCE.toLocaleString()}</strong> cap. Sell some holdings to free up cash.
                        </p>
                        <button onClick={() => setShowModal(false)}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(29,78,216,0.1)", border: "1px solid rgba(29,78,216,0.3)", color: BLUE, fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
function SubscriptionCard({ investorInfo, onUpdate }) {
    const navigate = useNavigate();
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const userId = currentUser?.user_id;
    const plan = investorInfo?.investor_subscription_status?.toLowerCase() || "inactive";
    // Verified experts get premium access as a complimentary perk of their
    // expert status, not a purchased/renewable plan — no renewal countdown
    // or cancel/renew buttons make sense for them.
    const isVerifiedExpert =
        currentUser?.is_expert === true &&
        ["approved", "active"].includes(String(currentUser?.verification_status || "").toLowerCase());

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        getSubscriptionDetails(userId)
            .then(data => { if (data.success) setDetails(data); })
            .finally(() => setLoading(false));
    }, [userId, plan]);

    const handleUpgrade = () => updateSubscriptionStatus(userId, "premium");

    const handleCancel = async () => {
        setCancelling(true);
        try {
            const result = await cancelSubscription(userId);
            if (result.success) {
                const newStatus = result.new_status || "inactive";
                const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
                stored.subscription_status = newStatus;
                stored.investor_subscription_status = newStatus;
                sessionStorage.setItem("currentUser", JSON.stringify(stored));
                setShowCancelConfirm(false);
                onUpdate();
            } else {
                alert(result.message || "Failed to cancel subscription");
            }
        } catch {
            alert("Could not reach backend");
        } finally {
            setCancelling(false);
        }
    };

    const CancelModal = () => (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: CARD_BG, border: "1px solid rgba(220,38,38,0.3)", borderRadius: "16px", padding: "32px", maxWidth: "380px", width: "90%", textAlign: "center", boxShadow: MODAL_SHADOW }}>
                <p style={{ fontSize: "18px", fontWeight: 700, color: HEADING, marginBottom: "10px" }}>Cancel Subscription?</p>
                <p style={{ fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.6, marginBottom: "24px" }}>
                    Your plan will be cancelled immediately and your account will revert to no active subscription. This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <button onClick={() => setShowCancelConfirm(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.15)", color: TEXT_MUTED, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                        Keep Plan
                    </button>
                    <button onClick={handleCancel} disabled={cancelling} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: DANGER, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                        {cancelling ? "Cancelling…" : "Yes, Cancel"}
                    </button>
                </div>
            </div>
        </div>
    );

    const history = details?.history || [];

    /* ── Verified expert: complimentary, no renewal ──────────── */
    if (isVerifiedExpert) {
        return (
            <GlassCard>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <p style={{ fontSize: "20px", fontWeight: 700, color: HEADING }}>Expert Access</p>
                            <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginTop: "4px" }}>
                                Full premium access, complimentary for verified experts
                            </p>
                        </div>
                        <div style={{ padding: "4px 14px", borderRadius: "100px", background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.5)", color: "#F97316", fontSize: "12px", fontWeight: 700 }}>
                            ★ Expert
                        </div>
                    </div>

                    <p style={{ fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.6 }}>
                        As a verified expert, you have full access to every premium investor feature automatically —
                        no subscription to renew or manage. This stays active for as long as your expert verification does.
                    </p>

                    {/* Past subscription history, if any (e.g. from before becoming an expert) */}
                    {!loading && history.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Past Subscriptions</p>
                            <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(15,23,42,0.12)" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: CARD_BG_MUTED }}>
                                            {["Plan", "Date", "Renewal", "Status"].map(h => (
                                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((row, i) => (
                                            <tr key={i} style={{ borderTop: `1px solid ${DIVIDER}`, background: i % 2 === 0 ? "transparent" : "#F8FAFC" }}>
                                                <td style={{ padding: "10px 14px", fontSize: "13px", color: row.plan_type === "premium" ? GOLD : "#00D3F2", fontWeight: 600, textTransform: "capitalize" }}>{row.plan_type}</td>
                                                <td style={{ padding: "10px 14px", fontSize: "12px", color: TEXT_MUTED }}>{row.sub_date ? new Date(row.sub_date).toLocaleDateString() : "—"}</td>
                                                <td style={{ padding: "10px 14px", fontSize: "12px", color: TEXT_MUTED }}>{row.sub_renewal_date ? new Date(row.sub_renewal_date).toLocaleDateString() : "—"}</td>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <span style={{ padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: row.sub_status === "active" ? "rgba(34,197,94,0.12)" : CARD_BG_MUTED, color: row.sub_status === "active" ? SUCCESS : TEXT_MUTED2, border: `1px solid ${row.sub_status === "active" ? "rgba(34,197,94,0.25)" : "rgba(15,23,42,0.12)"}` }}>
                                                        {row.sub_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        );
    }

    /* ── Inactive ───────────────────────────────────────────── */
    if (plan === "inactive") {
        return (
            <GlassCard>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "16px 0", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: CARD_BG_MUTED, border: "1px solid rgba(15,23,42,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                        💳
                    </div>
                    <div>
                        <p style={{ fontSize: "18px", fontWeight: 700, color: HEADING, marginBottom: "8px" }}>No Active Subscription</p>
                        <p style={{ fontSize: "13px", color: TEXT_MUTED, maxWidth: "340px", lineHeight: 1.6 }}>
                            Choose a plan to unlock AI stock predictions, expert portfolios, and more.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/investor/subscription")}
                        style={{ padding: "10px 28px", borderRadius: "10px", background: "linear-gradient(135deg,#0092b8,#155dfc)", border: "none", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                    >
                        View Plans
                    </button>
                </div>

                {/* Past subscription history */}
                {!loading && history.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Past Subscriptions</p>
                        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(15,23,42,0.12)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: CARD_BG_MUTED }}>
                                        {["Plan", "Date", "Renewal", "Status"].map(h => (
                                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((row, i) => (
                                        <tr key={i} style={{ borderTop: `1px solid ${DIVIDER}`, background: i % 2 === 0 ? "transparent" : "#F8FAFC" }}>
                                            <td style={{ padding: "10px 14px", fontSize: "13px", color: row.plan_type === "premium" ? GOLD : "#00D3F2", fontWeight: 600, textTransform: "capitalize" }}>{row.plan_type}</td>
                                            <td style={{ padding: "10px 14px", fontSize: "12px", color: TEXT_MUTED }}>{row.sub_date ? new Date(row.sub_date).toLocaleDateString() : "—"}</td>
                                            <td style={{ padding: "10px 14px", fontSize: "12px", color: TEXT_MUTED }}>{row.sub_renewal_date ? new Date(row.sub_renewal_date).toLocaleDateString() : "—"}</td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{ padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: row.sub_status === "active" ? "rgba(34,197,94,0.12)" : CARD_BG_MUTED, color: row.sub_status === "active" ? SUCCESS : TEXT_MUTED2, border: `1px solid ${row.sub_status === "active" ? "rgba(34,197,94,0.25)" : "rgba(15,23,42,0.12)"}` }}>
                                                    {row.sub_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                </div>
            </GlassCard>
        );
    }

    /* ── Basic ──────────────────────────────────────────────── */
    if (plan === "basic") {
        const FEATURES = [
            { label: "Real-Time Market Dashboard", included: true },
            { label: "Paper Trading", included: true },
            { label: "Knowledge Hub Access", included: true },
            { label: "AI Investment Chatbot", included: true },
            { label: "Limited AI Stock Predictions", included: true },
            { label: "Limited Watchlist Management", included: true },
            { label: "Unlimited AI Stock Predictions", included: false },
            { label: "Expert Consultation Access", included: false },
            { label: "Advanced Portfolio Analytics", included: false },
            { label: "Top Up Paper Money", included: false },
        ];
        const startDate = details?.latest?.sub_date
            ? new Date(details.latest.sub_date).toLocaleDateString()
            : "—";
        return (
            <>
            <GlassCard>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <p style={{ fontSize: "20px", fontWeight: 700, color: HEADING }}>Basic Plan</p>
                            <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginTop: "4px" }}>Active since {loading ? "…" : startDate}</p>
                        </div>
                        <div style={{ padding: "4px 14px", borderRadius: "100px", background: "rgba(0,211,243,0.1)", border: "1px solid rgba(0,211,243,0.4)", color: "#00D3F2", fontSize: "12px", fontWeight: 700 }}>
                            ● Basic
                        </div>
                    </div>

                    {/* Feature list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Plan Features</p>
                        {FEATURES.map(f => (
                            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "14px", color: f.included ? SUCCESS : "rgba(15,23,42,0.25)" }}>
                                    {f.included ? "✓" : "✕"}
                                </span>
                                <span style={{ fontSize: "13px", color: f.included ? "#334155" : "rgba(15,23,42,0.35)" }}>
                                    {f.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Upgrade CTA */}
                    <div style={{ borderRadius: "14px", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: GOLD }}>Upgrade to Premium</p>
                            <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginTop: "4px" }}>Unlock unlimited predictions, expert access & more</p>
                        </div>
                        <button
                            onClick={handleUpgrade}
                            style={{ padding: "9px 22px", borderRadius: "10px", background: "linear-gradient(135deg,#b8860b,#FFD700)", border: "none", color: "#0f1b2d", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                            Upgrade Now
                        </button>
                    </div>

                    {/* Cancel */}
                    <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: "16px" }}>
                        <button onClick={() => setShowCancelConfirm(true)} style={{ background: "none", border: "none", color: "rgba(220,38,38,0.75)", fontSize: "13px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                            Cancel plan
                        </button>
                    </div>
                </div>
            </GlassCard>
            {showCancelConfirm && <CancelModal />}
        </>
        );
    }

    /* ── Premium ─────────────────────────────────────────────── */
    const latest = details?.latest;

    const startDate = latest?.sub_date ? new Date(latest.sub_date).toLocaleDateString() : "—";
    const renewalDate = latest?.sub_renewal_date ? new Date(latest.sub_renewal_date).toLocaleDateString() : "—";

    let daysRemaining = null;
    let progressPct = 0;
    if (latest?.sub_date && latest?.sub_renewal_date) {
        const now = Date.now();
        const start = new Date(latest.sub_date).getTime();
        const end = new Date(latest.sub_renewal_date).getTime();
        const total = end - start;
        const elapsed = now - start;
        daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        progressPct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    }

    return (
        <GlassCard>
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <p style={{ fontSize: "20px", fontWeight: 700, color: HEADING }}>Premium Plan</p>
                        <p style={{ fontSize: "12px", color: TEXT_MUTED2, marginTop: "4px" }}>Active since {loading ? "…" : startDate}</p>
                    </div>
                    <div style={{ padding: "4px 14px", borderRadius: "100px", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.5)", color: GOLD, fontSize: "12px", fontWeight: 700 }}>
                        ★ Premium
                    </div>
                </div>

                {/* 30-day renewal tracker */}
                {!loading && daysRemaining !== null && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>30-Day Renewal Period</p>
                            <p style={{ fontSize: "12px", color: daysRemaining <= 5 ? DANGER : GOLD, fontWeight: 700 }}>
                                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                            </p>
                        </div>
                        <div style={{ height: "8px", borderRadius: "100px", background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${progressPct}%`, borderRadius: "100px", background: daysRemaining <= 5 ? "linear-gradient(90deg,#DC2626,#EF4444)" : "linear-gradient(90deg,#b8860b,#FFD700)", transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: TEXT_FAINT }}>{startDate}</span>
                            <span style={{ fontSize: "11px", color: TEXT_FAINT }}>Renews {renewalDate}</span>
                        </div>
                    </div>
                )}

                {/* Renew */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <button
                        onClick={handleUpgrade}
                        style={{ padding: "9px 22px", borderRadius: "10px", background: "linear-gradient(135deg,#b8860b,#FFD700)", border: "none", color: "#0f1b2d", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                    >
                        Renew Premium
                    </button>
                </div>

                {/* Subscription history */}
                {!loading && history.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subscription History</p>
                        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(15,23,42,0.12)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: CARD_BG_MUTED }}>
                                        {["Plan", "Date", "Renewal", "Status"].map(h => (
                                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: TEXT_MUTED2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((row, i) => (
                                        <tr key={i} style={{ borderTop: `1px solid ${DIVIDER}`, background: i % 2 === 0 ? "transparent" : "#F8FAFC" }}>
                                            <td style={{ padding: "10px 14px", fontSize: "13px", color: row.plan_type === "premium" ? GOLD : "#00D3F2", fontWeight: 600, textTransform: "capitalize" }}>{row.plan_type}</td>
                                            <td style={{ padding: "10px 14px", fontSize: "12px", color: TEXT_MUTED }}>{row.sub_date ? new Date(row.sub_date).toLocaleDateString() : "—"}</td>
                                            <td style={{ padding: "10px 14px", fontSize: "12px", color: TEXT_MUTED }}>{row.sub_renewal_date ? new Date(row.sub_renewal_date).toLocaleDateString() : "—"}</td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{ padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: row.sub_status === "active" ? "rgba(34,197,94,0.12)" : CARD_BG_MUTED, color: row.sub_status === "active" ? SUCCESS : TEXT_MUTED2, border: `1px solid ${row.sub_status === "active" ? "rgba(34,197,94,0.25)" : "rgba(15,23,42,0.12)"}` }}>
                                                    {row.sub_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}

function InvestorProfilePage() {
    const [activeTab, setActiveTab] = useState("personal");
    const [investorInfo, setInvestorInfo] = useState(null);
    const [currentUser] = useState(() => JSON.parse(sessionStorage.getItem("currentUser")));
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
            className="min-h-screen flex flex-col"
            style={{
                fontFamily: "'DM Sans', sans-serif",
                background: getPageBackground(),
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <GeneralHeader />
            <main className="flex-1 flex flex-col md:flex-row gap-8 px-6 py-10">
                {/* Left sidebar */}
                <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ width: "300px", borderRadius: "20px", border: `1px solid ${CARD_BORDER}`, overflow: "hidden", background: CARD_BG, boxShadow: CARD_SHADOW }}>
                        <LeftSection activeTab={activeTab} setActiveTab={setActiveTab} investorInfo={investorInfo} currentUser={currentUser} />
                    </div>
                    <div style={{ width: "300px", marginTop: "20px", borderRadius: "20px", border: `1px solid ${CARD_BORDER}`, background: CARD_BG, boxShadow: CARD_SHADOW }}>
                        <DeleteAccountButton />
                    </div>
                </div>

                {/* Right content */}
                <div className="flex-1 flex flex-col">
                    {activeTab === "personal" && <PersonalInformationCard investorInfo={investorInfo} onUpdate={fetchInvestorInfo} />}
                    {activeTab === "account" && <AccountSettingsCard investorInfo={investorInfo} onUpdate={fetchInvestorInfo} />}
                    {activeTab === "security" && <SecurityCard investorInfo={investorInfo} />}
                    {activeTab === "paper-money" && <PaperMoneyCard investorInfo={investorInfo} onUpdate={fetchInvestorInfo} />}
                    {activeTab === "subscription" && <SubscriptionCard investorInfo={investorInfo} onUpdate={fetchInvestorInfo} />}
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}

export default InvestorProfilePage;
