import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, User, Mail, Phone, MapPin, Briefcase } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertInformation, updateUserInformation } from "../../api/userApi.js";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

export default function ExpertProfilePage() {
  const currentUser = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ username: "", full_name: "", email_address: "", phone_number: "", address: "" });

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser?.user_id) {
        setLoading(false);
        setMessage("Please log in again.");
        return;
      }
      try {
        const data = await getExpertInformation(currentUser.user_id);
        const info = data.expert || data.user || data;
        setForm({
          username: info.username || currentUser.username || "",
          full_name: info.full_name || currentUser.full_name || "",
          email_address: info.email_address || info.email || currentUser.email_address || "",
          phone_number: info.phone_number || "",
          address: info.address || "",
        });
      } catch (error) {
        setMessage(error.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [currentUser?.user_id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser?.user_id) return;
    if (!form.username.trim() || !form.full_name.trim() || !form.email_address.trim()) {
      setMessage("Username, full name, and email are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await updateUserInformation(
        currentUser.user_id,
        form.username.trim(),
        form.full_name.trim(),
        form.email_address.trim(),
        form.phone_number.trim(),
        form.address.trim()
      );
      if (result.success === false) throw new Error(result.message || "Update failed.");
      const updatedUser = { ...currentUser, username: form.username.trim(), full_name: form.full_name.trim(), email_address: form.email_address.trim() };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Edit Consultant Profile</h1>
            <p className="text-gray-400">Update your account details used across the expert dashboard and forum.</p>
          </div>

          {message && <div className={`mb-6 rounded-xl border p-4 ${message.includes("successfully") ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>{message}</div>}

          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-3xl p-8">
            {loading ? (
              <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" /></div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold">
                    {(form.full_name || form.username || "EX").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{form.full_name || "Consultant"}</h2>
                    <p className="text-gray-400 flex items-center gap-2"><Briefcase size={15} /> Consultant / Expert</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileField icon={<User size={18} />} label="Username *" value={form.username} onChange={(v) => update("username", v)} />
                  <ProfileField icon={<User size={18} />} label="Full Name *" value={form.full_name} onChange={(v) => update("full_name", v)} />
                  <ProfileField icon={<Mail size={18} />} label="Email Address *" type="email" value={form.email_address} onChange={(v) => update("email_address", v)} />
                  <ProfileField icon={<Phone size={18} />} label="Phone Number" value={form.phone_number} onChange={(v) => update("phone_number", v)} />
                  <div className="md:col-span-2"><ProfileField icon={<MapPin size={18} />} label="Address" value={form.address} onChange={(v) => update("address", v)} /></div>
                </div>

                <div className="flex justify-end mt-8">
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold hover:opacity-90 disabled:opacity-50"><Save size={18} /> {saving ? "Saving..." : "Save Profile"}</button>
                </div>
              </>
            )}
          </form>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

function ProfileField({ icon, label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500">
        <span className="text-cyan-400">{icon}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent focus:outline-none text-white placeholder-gray-500" />
      </div>
    </div>
  );
}
