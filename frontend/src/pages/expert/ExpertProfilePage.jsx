import { motion } from "framer-motion";
import { getExpertInformation } from "../../api/userApi.js";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { updateUserInformation } from "../../api/userApi.js";
import { Shield, User, ChartNoAxesColumn, SquarePen, Star, Briefcase, Verified, BadgeCheck, FileText, Plus, Trash2 } from "lucide-react";
const API_BASE = import.meta.env.VITE_API_URL;

/* ─── Shared UI components ──────────────────────────────────────── */
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
        <div style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "32px",
        }}>
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
                <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#00D3F2" }} />
            )}
        </button>
    );
}

function LeftSection({ activeTab, setActiveTab, expertInfo, currentUser }) {
    const initials = expertInfo?.username?.slice(0, 2)?.toUpperCase() ?? "?";


    const expertStatus = expertInfo?.verification_status?.toLowerCase();

    const statusStyle =
        expertStatus === "active"
            ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.5)", color: "#22c55e" }
            : expertStatus === "pending"
                ? { background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.5)", color: "#FFA500" }
                : { background: "rgba(0,0,0,0.35)", border: "1px solid rgba(0,211,243,0.4)", color: "#00D3F2" };

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
                <div style={{ position: "absolute", top: "9px", right: "9px", padding: "2px 9px", borderRadius: "100px", background: "rgba(0,0,0,0.35)", fontSize: "10px", fontWeight: 700, color: "#00D3F2", ...statusStyle }}>
                    ★ {expertInfo?.verification_status || "Verified"}
                </div>
            </div>

            {/* Avatar */}
            <div style={{ position: "relative", padding: "0 18px", marginTop: "-34px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ cursor: "pointer" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #4338ca, #7e22ce)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>{initials}</span>
                    </div>
                </div>
            </div>

            {/* Name and username */}
            <div style={{ padding: "0 18px" }}>
                <p className="font-bold text-white" style={{ fontSize: "15px", lineHeight: 1.2 }}>{expertInfo?.full_name}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px" }}>@{expertInfo?.username}</p>
            </div>

            {/* Tags */}
            <div style={{ padding: "0 18px", display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "0.667px solid rgba(255,255,255,0.08)" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(0,211,243,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)" }}>{expertInfo?.address}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "0.667px solid rgba(255,255,255,0.08)" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(0,211,243,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)" }}>{currentUser?.role}</span>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: "80%", height: "0.667px", background: "rgba(255,255,255,0.07)", marginLeft: "18px", marginRight: "18px" }} />

            {/* Stats */}
            <div className="flex" style={{ gap: "7px", padding: "0 18px" }}>
                <div style={{ borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.08)", padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.06em" }}>MEMBER SINCE</span>
                    </div>
                    <p className="font-bold" style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                        {expertInfo?.join_date ? new Date(expertInfo.join_date).toLocaleDateString() : "N/A"}
                    </p>
                </div>
                <div style={{ borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.08)", padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.06em" }}>RATING</span>
                    </div>
                    <p className="font-bold" style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                        {expertInfo?.rating != null ? `${expertInfo.rating} / 5` : "N/A"}
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
                <MenuButton active={activeTab === "verified"} onClick={() => setActiveTab("verified")}><BadgeCheck size={15} style={{ marginRight: "8px" }} /> Verified Account</MenuButton>

            </div>
        </div>
    );
}

function PersonalInformationCard({ expertInfo, onUpdate }) {
    const [draftFull, setDraftFull] = useState(expertInfo?.full_name || "");
    const [draftEmail, setDraftEmail] = useState(expertInfo?.email_address || "");
    const [draftUser, setDraftUser] = useState(expertInfo?.username || "");
    const [draftPhone, setDraftPhone] = useState(expertInfo?.phone_number != null ? String(expertInfo.phone_number) : "");
    const [draftLoc, setDraftLoc] = useState(expertInfo?.address || "");
    const [editingSection, setEditingSection] = useState(null);
    const isEditing = (section) => editingSection === section;

    const initials = expertInfo?.username?.slice(0, 2)?.toUpperCase() ?? "?";


    useEffect(() => {
        setDraftFull(expertInfo?.full_name || "");
        setDraftEmail(expertInfo?.email_address || "");
        setDraftUser(expertInfo?.username || "");
        setDraftPhone(expertInfo?.phone_number != null ? String(expertInfo.phone_number) : "");
        setDraftLoc(expertInfo?.address || "");
    }, [expertInfo]);

    const cancelEdit = () => {
        setDraftFull(expertInfo?.full_name || "");
        setDraftEmail(expertInfo?.email_address || "");
        setDraftUser(expertInfo?.username || "");
        setDraftPhone(expertInfo?.phone_number != null ? String(expertInfo.phone_number) : "");
        setDraftLoc(expertInfo?.address || "");
        setEditingSection(null);
    };

    const handleChange = async () => {
        try {
            const result = await updateUserInformation(
                expertInfo.user_id,
                draftUser,
                draftFull,
                draftEmail,
                draftPhone,
                draftLoc
            );
            if (result.success) {
                // Patch localStorage so header/other components reflect the change immediately
                const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
                stored.full_name = draftFull;
                stored.username = draftUser;
                stored.email_address = draftEmail;
                localStorage.setItem("currentUser", JSON.stringify(stored));

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
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold">Personal Information</h1>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                                Your name, contact details and profile
                            </p>
                        </div>
                        <button
                            className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-[0.97]"
                            style={{ height: "38px", padding: "0 18px", borderRadius: "100px", background: "linear-gradient(90deg,rgba(0,146,184,0.25),rgba(21,93,252,0.25))", border: "0.667px solid rgba(0,211,243,0.35)", color: "#00D3F2", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                            onClick={() => setEditingSection("personal")}
                        >
                            <SquarePen size={14} />
                            Edit
                        </button>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center gap-4" style={{ margin: "24px 0" }}>
                        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #4338ca, #7e22ce)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "white", flexShrink: 0 }}>
                            {initials}
                        </div>
                        <div>
                            <p className="font-bold text-white" style={{ fontSize: "18px" }}>{expertInfo?.full_name}</p>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>@{expertInfo?.username}</p>
                        </div>
                    </div>

                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "24px" }} />

                    {/* Info Grid */}
                    <div className="grid grid-cols-2" style={{ gap: "24px 32px" }}>
                        <InfoRow label="Full Name" value={expertInfo?.full_name} />
                        <InfoRow label="Phone Number" value={expertInfo?.phone_number} />
                        <InfoRow label="Location" value={expertInfo?.address} />
                        <InfoRow label="Email Address" value={expertInfo?.email_address} />
                        <InfoRow label="Expert Status" value={expertInfo?.expert_status} />
                        <InfoRow label="Rating" value={expertInfo?.rating != null ? `${expertInfo.rating} / 5` : null} />
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <h1 className="text-xl font-bold">Edit Personal Information</h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>Update your profile details</p>
                    </div>

                    <div className="flex flex-col" style={{ gap: "20px", marginTop: "24px" }}>
                        <FormField label="Full Name *" htmlFor="field-full-name">
                            <TextInput id="field-full-name" value={draftFull} onChange={setDraftFull} placeholder="Full name" />
                        </FormField>

                        <div className="grid grid-cols-2" style={{ gap: "16px" }}>
                            <FormField label="Username *" htmlFor="field-username">
                                <TextInput id="field-username" value={draftUser} onChange={setDraftUser} placeholder="username" prefix="@" />
                            </FormField>
                            <FormField label="Email Address" htmlFor="field-email">
                                <TextInput id="field-email" value={draftEmail} onChange={setDraftEmail} placeholder="email@example.com" type="email" />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2" style={{ gap: "16px" }}>
                            <FormField label="Phone Number" htmlFor="field-phone">
                                <TextInput id="field-phone" value={draftPhone} onChange={setDraftPhone} placeholder="+1 (555) 000-0000" type="tel" />
                            </FormField>
                            <FormField label="Location" htmlFor="field-location">
                                <TextInput id="field-location" value={draftLoc} onChange={setDraftLoc} placeholder="City, Country" />
                            </FormField>
                        </div>

                        <SaveRow onSave={handleChange} onCancel={cancelEdit} />
                    </div>
                </>
            )}
        </GlassCard>
    );
}

function AccountSettingsCard({ expertInfo }) {
    return (
        <GlassCard>
            <div>
                <h1 className="text-xl font-bold">Account Settings</h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                    Expert profile details and credentials
                </p>
            </div>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "28px 0" }} />

            {/* Experience */}
            <div style={{ marginBottom: "28px" }}>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px", fontWeight: 600 }}>
                    EXPERIENCE
                </p>
                <div className="flex items-center gap-4">
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,211,242,0.1)", border: "1px solid rgba(0,211,242,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Briefcase size={16} color="#00D3F2" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: "18px" }}>
                            {expertInfo?.experience_years != null ? `${expertInfo.experience_years} year${expertInfo.experience_years !== 1 ? "s" : ""}` : "N/A"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px" }}>Years of experience</div>
                    </div>
                </div>
            </div>

            {/* Rating */}
            <div style={{ marginBottom: "28px" }}>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px", fontWeight: 600 }}>
                    RATING
                </p>
                <div className="flex items-center gap-3">
                    <Star size={18} color="#FFD700" fill="#FFD700" />
                    <span style={{ fontSize: "18px", fontWeight: 700 }}>
                        {expertInfo?.rating != null ? expertInfo.rating : "N/A"}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>/ 5.0</span>
                </div>
            </div>

            {/* LinkedIn */}
            <div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px", fontWeight: 600 }}>
                    LINKEDIN
                </p>
                <div className="flex items-center gap-3">
                    <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.85)" }}>
                        {expertInfo?.linked_in_url || "—"}
                    </span>
                    {expertInfo?.linked_in_url && (
                        <a
                            href={expertInfo.linked_in_url.startsWith("http") ? expertInfo.linked_in_url : `https://${expertInfo.linked_in_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "12px", color: "#00D3F2", textDecoration: "underline" }}
                        >
                            Visit
                        </a>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}

function SecurityCard({ expertInfo }) {
    const navigate = useNavigate();
    return (
        <GlassCard>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Security</h1>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                        Password and account protection
                    </p>
                </div>
                <button
                    onClick={() => navigate("/reset-password")}
                    className="flex items-center gap-2"
                    style={{ height: "38px", padding: "0 18px", borderRadius: "100px", background: "linear-gradient(90deg,rgba(0,146,184,0.25),rgba(21,93,252,0.25))", border: "0.667px solid rgba(0,211,243,0.35)", color: "#00D3F2", cursor: "pointer" }}
                >
                    <SquarePen size={14} />
                    Reset Password
                </button>
            </div>

            <div style={{ marginTop: "32px" }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Shield size={18} color="#22c55e" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "16px" }}>Password</div>
                            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                                Last changed 3 months ago
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: "6px 14px", borderRadius: "999px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: "13px", fontWeight: 600 }}>
                        Secure
                    </div>
                </div>
            </div>
        </GlassCard>
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
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#0f1b2d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "12px" }}>Delete Account</h2>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "24px", lineHeight: 1.6 }}>
                            This will permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                style={{ width: "100px", padding: "8px 20px", borderRadius: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                style={{ width: "100px", padding: "8px 20px", borderRadius: "8px", background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.5)", color: "#f87171", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
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

function VerifiedCard({ expertInfo, onUpdate }) {
    const status = expertInfo?.verification_status?.toLowerCase();
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    // ── Verification form state ──
    const [linkedIn, setLinkedIn] = useState(expertInfo?.linked_in_url || "");
    const [experience, setExperience] = useState(expertInfo?.experience_years != null ? String(expertInfo.experience_years) : "");
    const [specialization, setSpecialization] = useState("");
    const [bio, setBio] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // ── Documents state ──
    const [docs, setDocs] = useState(() => expertInfo?.documents?.length ? expertInfo.documents : []);
    const [docForm, setDocForm] = useState({ name: "", url: "", type: "certification" });
    const [savingDocs, setSavingDocs] = useState(false);
    const [docMsg, setDocMsg] = useState("");

    useEffect(() => {
        if (expertInfo?.documents) setDocs(expertInfo.documents);
    }, [expertInfo]);

    const addDoc = () => {
        if (!docForm.name.trim() || !docForm.url.trim()) return;
        setDocs(prev => [...prev, { ...docForm }]);
        setDocForm({ name: "", url: "", type: "certification" });
    };
    const removeDoc = (i) => setDocs(prev => prev.filter((_, idx) => idx !== i));

    const saveDocs = async () => {
        setSavingDocs(true); setDocMsg("");
        try {
            const res = await fetch(`${API_BASE}/expert/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUser.user_id, documents: docs }),
            });
            const data = await res.json();
            if (data.success) { setDocMsg("Saved!"); onUpdate?.(); }
            else setDocMsg(data.message || "Failed to save");
        } catch { setDocMsg("Could not reach backend"); }
        finally { setSavingDocs(false); }
    };

    const docTypeColor = (type) => {
        if (type === "certification") return { color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" };
        if (type === "degree")        return { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" };
        if (type === "employment")    return { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" };
        return { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await new Promise(r => setTimeout(r, 1200));
        setSubmitting(false);
        setSubmitted(true);
    };

    /* ── Verified / Active state ───────────────────────────── */
    if (status === "active") {
        return (
            <GlassCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Expert Verification</h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                            Your professional credentials
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "999px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: "13px", fontWeight: 700 }}>
                        <BadgeCheck size={15} />
                        Verified Expert
                    </div>
                </div>

                <div style={{ marginTop: "32px", padding: "28px", borderRadius: "16px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <BadgeCheck size={32} color="#22c55e" />
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: "#22c55e", marginBottom: "8px" }}>Account Verified</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: "360px", margin: "0 auto" }}>
                        Your expert credentials have been reviewed and approved. You now appear as a verified expert on the platform.
                    </p>
                </div>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "28px 0" }} />

                <div className="grid grid-cols-2" style={{ gap: "24px 32px", marginBottom: "28px" }}>
                    <InfoRow label="LinkedIn" value={expertInfo?.linked_in_url || "—"} />
                    <InfoRow label="Experience" value={expertInfo?.experience_years != null ? `${expertInfo.experience_years} year${expertInfo.experience_years !== 1 ? "s" : ""}` : "—"} />
                </div>

                {DocumentsSection()}
            </GlassCard>
        );
    }

    /* ── Pending state ─────────────────────────────────────── */
    if (status === "pending" || submitted) {
        return (
            <GlassCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Expert Verification</h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                            Verification in progress
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "999px", background: "rgba(255,165,0,0.12)", border: "1px solid rgba(255,165,0,0.4)", color: "#FFA500", fontSize: "13px", fontWeight: 700 }}>
                        <Shield size={14} />
                        Under Review
                    </div>
                </div>

                <div style={{ marginTop: "32px", padding: "28px", borderRadius: "16px", background: "rgba(255,165,0,0.05)", border: "1px solid rgba(255,165,0,0.2)", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Shield size={28} color="#FFA500" />
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: "#FFA500", marginBottom: "8px" }}>Application Submitted</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: "380px", margin: "0 auto 24px" }}>
                        Our team is reviewing your credentials. This typically takes 2–5 business days. You'll be notified once a decision is made.
                    </p>
                </div>

                <div style={{ marginTop: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>Review Steps</p>
                    {[
                        { label: "Application received", done: true },
                        { label: "Document review", done: false },
                        { label: "Background check", done: false },
                        { label: "Final approval", done: false },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3" style={{ marginBottom: "12px" }}>
                            <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: step.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", border: step.done ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.12)" }}>
                                {step.done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    : <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />}
                            </div>
                            <span style={{ fontSize: "13px", color: step.done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>{step.label}</span>
                        </div>
                    ))}
                </div>

                {DocumentsSection()}
            </GlassCard>
        );
    }

    /* ── Unsubmitted form state ────────────────────────────── */
    return (
        <GlassCard>
            <div>
                <h1 className="text-xl font-bold">Expert Verification</h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                    Submit your credentials for review to become a verified expert.
                </p>
            </div>

            {/* Info banner */}
            <div style={{ marginTop: "20px", padding: "14px 18px", borderRadius: "12px", background: "rgba(0,211,243,0.06)", border: "1px solid rgba(0,211,243,0.2)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <BadgeCheck size={16} color="#00D3F2" style={{ flexShrink: 0, marginTop: "1px" }} />
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    Verified experts gain a trust badge, appear higher in search results, and can accept premium consultations. Fill in the form below and our team will review your application.
                </p>
            </div>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "24px 0" }} />

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col" style={{ gap: "20px" }}>

                    <div className="grid grid-cols-2" style={{ gap: "16px" }}>
                        <FormField label="LinkedIn Profile URL" htmlFor="v-linkedin">
                            <TextInput id="v-linkedin" value={linkedIn} onChange={setLinkedIn} placeholder="linkedin.com/in/yourprofile" />
                        </FormField>
                        <FormField label="Years of Experience" htmlFor="v-experience">
                            <TextInput id="v-experience" value={experience} onChange={setExperience} placeholder="e.g. 8" type="number" />
                        </FormField>
                    </div>

                    <FormField label="Area of Specialization" htmlFor="v-spec">
                        <TextInput id="v-spec" value={specialization} onChange={setSpecialization} placeholder="e.g. Equity Research, Portfolio Management, Risk Analysis" />
                    </FormField>

                    <FormField label="Professional Bio" htmlFor="v-bio">
                        <textarea
                            id="v-bio"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Briefly describe your professional background, achievements, and areas of expertise…"
                            rows={4}
                            style={{
                                borderRadius: "10px",
                                border: "0.667px solid rgba(255,255,255,0.15)",
                                padding: "12px 14px",
                                fontSize: "14px",
                                color: "rgba(255,255,255,0.9)",
                                background: "rgba(255,255,255,0.08)",
                                width: "100%",
                                outline: "none",
                                resize: "vertical",
                                lineHeight: 1.6,
                            }}
                            onFocus={e => { e.target.style.border = "0.667px solid rgba(0,211,243,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; }}
                            onBlur={e => { e.target.style.border = "0.667px solid rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
                        />
                    </FormField>

                    {/* Submit */}
                    <div className="flex items-center justify-between" style={{ marginTop: "8px" }}>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                            By submitting you agree to our verification terms.
                        </p>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                            style={{
                                height: "42px", padding: "0 28px", borderRadius: "10px",
                                backgroundImage: submitting ? "none" : "linear-gradient(90deg,#0092b8,#155dfc)",
                                background: submitting ? "rgba(255,255,255,0.08)" : undefined,
                                border: "none", fontSize: "14px",
                                boxShadow: submitting ? "none" : "0 8px 18px rgba(0,184,219,0.2)",
                                cursor: submitting ? "not-allowed" : "pointer",
                                color: submitting ? "rgba(255,255,255,0.4)" : "white",
                            }}
                        >
                            {submitting ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Submitting…
                                </>
                            ) : (
                                <>
                                    <BadgeCheck size={15} />
                                    Submit for Verification
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </form>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {DocumentsSection()}
        </GlassCard>
    );

    // ── Documents section (shared across all states) ────────────────────────────
    function DocumentsSection() {
        return (
            <>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "28px 0" }} />
                <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FileText size={14} /> Supporting Documents
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                        Add links to your certificates, degrees, and employment letters. The admin will review these during verification.
                    </p>
                </div>

                {/* Existing docs */}
                {docs.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                        {docs.map((doc, i) => {
                            const c = docTypeColor(doc.type);
                            return (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.1)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                        <FileText size={14} color={c.color} style={{ flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.88)", fontWeight: 600 }}>{doc.name}</p>
                                            <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#00D3F2", textDecoration: "underline" }}>
                                                {doc.url.length > 45 ? doc.url.slice(0, 45) + "…" : doc.url}
                                            </a>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: c.bg, border: `1px solid ${c.border}`, color: c.color, textTransform: "uppercase" }}>{doc.type}</span>
                                        <button onClick={() => removeDoc(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.7)", padding: 0 }}><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add doc form */}
                <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(0,211,243,0.04)", border: "1px solid rgba(0,211,243,0.12)", marginBottom: "14px" }}>
                    <div className="grid grid-cols-2" style={{ gap: "10px", marginBottom: "10px" }}>
                        <TextInput value={docForm.name} onChange={v => setDocForm(f => ({ ...f, name: v }))} placeholder="Document name (e.g. CFA Certificate)" />
                        <select value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full h-11 rounded-lg bg-slate-800 border border-slate-600 px-3 text-white text-sm">
                            <option value="certification">Certification</option>
                            <option value="degree">Degree</option>
                            <option value="employment">Employment Letter</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                            <TextInput value={docForm.url} onChange={v => setDocForm(f => ({ ...f, url: v }))} placeholder="Document URL (Google Drive, Dropbox…)" />
                        </div>
                        <button type="button" onClick={addDoc} disabled={!docForm.name.trim() || !docForm.url.trim()}
                            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 14px", borderRadius: "10px", background: "rgba(0,211,243,0.12)", border: "1px solid rgba(0,211,243,0.3)", color: "#00D3F2", fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0, opacity: (!docForm.name.trim() || !docForm.url.trim()) ? 0.4 : 1 }}>
                            <Plus size={13} /> Add
                        </button>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={saveDocs} disabled={savingDocs}
                        className="font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                        style={{ height: "38px", padding: "0 22px", borderRadius: "10px", backgroundImage: "linear-gradient(90deg,#0092b8,#155dfc)", border: "none", fontSize: "13px", cursor: savingDocs ? "not-allowed" : "pointer", opacity: savingDocs ? 0.6 : 1 }}>
                        {savingDocs ? "Saving…" : "Save Documents"}
                    </button>
                    {docMsg && <span style={{ fontSize: "12px", color: docMsg === "Saved!" ? "#22c55e" : "#f87171" }}>{docMsg}</span>}
                </div>
            </>
        );
    }
}


function ExpertProfilePage() {
    const [activeTab, setActiveTab] = useState("personal");
    const [expertInfo, setExpertInfo] = useState(null);
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser")));
    const userId = currentUser?.user_id;

    const fetchExpertInfo = () => {
        if (userId) {
            getExpertInformation(userId)
                .then(data => {
                    if (data.success) {
                        setExpertInfo(data.expert_information);
                    } else {
                        console.error("Failed to fetch expert information:", data.message || data);
                    }
                })
                .catch(error => {
                    console.error("Failed to fetch expert information:", error);
                });
        }
    };

    useEffect(() => {
        fetchExpertInfo();
    }, [userId]);

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <ConsultantHeader />
            <main className="flex-1 flex flex-col md:flex-row gap-8 px-6 py-10">
                {/* Left sidebar */}
                <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ width: "300px", borderRadius: "20px", border: "0.667px solid rgba(255,255,255,0.1)", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                        <LeftSection activeTab={activeTab} setActiveTab={setActiveTab} expertInfo={expertInfo} currentUser={currentUser} />
                    </div>

                    <div style={{ width: "300px", marginTop: "20px", borderRadius: "20px", border: "0.667px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                        <DeleteAccountButton />
                    </div>
                </div>

                {/* Right content */}
                <div className="flex-1 flex flex-col">
                    {activeTab === "personal" && <PersonalInformationCard expertInfo={expertInfo} onUpdate={fetchExpertInfo} />}
                    {activeTab === "account" && <AccountSettingsCard expertInfo={expertInfo} />}
                    {activeTab === "security" && <SecurityCard expertInfo={expertInfo} />}
                    {activeTab === "verified" && <VerifiedCard expertInfo={expertInfo} onUpdate={fetchExpertInfo} />}
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}

export default ExpertProfilePage;
