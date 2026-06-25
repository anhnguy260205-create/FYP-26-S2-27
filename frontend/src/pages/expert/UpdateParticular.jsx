import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { updateUserInformation } from "../../api/userApi.js";

const API_BASE = import.meta.env.VITE_API_URL;

function UpdateParticularPage() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [linkedIn, setLinkedIn] = useState("");
    const [experience, setExperience] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) { setError("Please enter your full name."); return; }

        setSaving(true);
        setError("");
        try {
            // Save personal details
            await updateUserInformation(
                currentUser.user_id,
                currentUser.username,
                fullName.trim(),
                currentUser.email_address,
                phone,
                address
            );

            // Save expert-specific fields
            if (linkedIn || experience) {
                await fetch(`${API_BASE}/expert/update-profile`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: currentUser.user_id,
                        linked_in_url: linkedIn || null,
                        experience_years: experience ? parseInt(experience) : null,
                    }),
                });
            }

            // Patch localStorage
            const updated = { ...currentUser, full_name: fullName.trim() };
            localStorage.setItem("currentUser", JSON.stringify(updated));

            // Go to document submission page next
            navigate("/expert/documents");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const inputCls = "w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition";
    const inputStyle = { height: "44px" };

    return (
        <motion.div
            className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div
                className="bg-[rgba(255,255,255,0.92)] w-full max-w-130 flex flex-col"
                style={{ borderRadius: "30px", padding: "36px 28px" }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="font-bold text-black text-3xl leading-tight mb-2">
                        Welcome, {currentUser.username}! 👋
                    </h1>
                    <p className="text-gray-500 text-[15px]">
                        Complete your expert profile before you start.
                    </p>
                    <p className="text-[12px] text-gray-400 mb-3">Expert Information (optional — you can update this later)</p>

                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                    {/* Full Name */}
                    <div className="flex flex-col gap-1">
                        <label className="font-semibold text-[13px] text-gray-600 pl-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input type="text" placeholder="e.g. Dr. Sarah Chen" value={fullName}
                            onChange={(e) => { setFullName(e.target.value); setError(""); }}
                            className={inputCls} style={inputStyle} />
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-1">
                        <label className="font-semibold text-[13px] text-gray-600 pl-1">Phone Number</label>
                        <input type="tel" placeholder="e.g. +65 9123 4567" value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={inputCls} style={inputStyle} />
                    </div>

                    {/* Address */}
                    <div className="flex flex-col gap-1">
                        <label className="font-semibold text-[13px] text-gray-600 pl-1">Location</label>
                        <input type="text" placeholder="e.g. Singapore" value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={inputCls} style={inputStyle} />
                    </div>



                    {/* LinkedIn */}
                    <div className="flex flex-col gap-1">
                        <label className="font-semibold text-[13px] text-gray-600 pl-1">LinkedIn Profile URL</label>
                        <input type="text" placeholder="https://linkedin.com/in/yourprofile" value={linkedIn}
                            onChange={(e) => setLinkedIn(e.target.value)}
                            className={inputCls} style={inputStyle} />
                    </div>

                    {/* Experience */}
                    <div className="flex flex-col gap-1">
                        <label className="font-semibold text-[13px] text-gray-600 pl-1">Years of Experience</label>
                        <input type="number" placeholder="e.g. 8" min="0" max="60" value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            className={inputCls} style={inputStyle} />
                    </div>

                    {error && <p className="text-red-500 text-[13px] font-medium">{error}</p>}

                    <button type="submit" disabled={saving}
                        className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60"
                        style={{ height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}>
                        {saving ? "Saving…" : "Get Started →"}
                    </button>

                    <button type="button" onClick={() => navigate("/expert")}
                        className="w-full text-gray-400 text-[14px] hover:text-gray-600 transition-colors">
                        Skip for now
                    </button>
                </form>
            </div>
        </motion.div>
    );
}

export default UpdateParticularPage;
