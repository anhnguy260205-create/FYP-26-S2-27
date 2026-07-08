import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye, FileText, User, Briefcase, ExternalLink } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const API = `${import.meta.env.VITE_API_URL}/admin/experts`;

const statusConfig = {
  pending:  { label: "Pending Review", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "Approved",       color: "bg-green-100 text-green-700",  icon: CheckCircle },
  rejected: { label: "Rejected",       color: "bg-red-100 text-red-700",      icon: XCircle },
};

const scoreColor = (score) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const docTypeColor = (type) => {
  if (type === "certification") return "bg-purple-100 text-purple-700";
  if (type === "degree")        return "bg-blue-100 text-blue-700";
  if (type === "employment")    return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
};

function DetailView({ application, onBack, onApprove, onReject }) {
  const { label, color, icon: StatusIcon } = statusConfig[application.verification_status] || statusConfig.pending;
  const initials = (application.full_name || "??").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <button onClick={onBack} className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-700">
        <ArrowLeft size={16} /> Back to Applications
      </button>

      <div className="bg-white rounded-lg p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{application.full_name || application.email_address}</h2>
              <p className="text-slate-500 text-sm mt-1">{application.experience_years ? `${application.experience_years} years experience` : "Experience not specified"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${color}`}>
                  <StatusIcon size={12} /> {label}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Verification Score</p>
            <p className={`text-4xl font-black ${scoreColor(application.verification_score)}`}>
              {application.verification_score}<span className="text-lg font-medium text-slate-400">/100</span>
            </p>
          </div>
        </div>

        {/* Personal Info */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <User size={14} /> Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-5">
            <div><p className="text-xs font-bold text-slate-400 uppercase">Email</p><p className="text-slate-800 mt-1">{application.email_address || "—"}</p></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">Phone</p><p className="text-slate-800 mt-1">{application.phone_number || "—"}</p></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">Address</p><p className="text-slate-800 mt-1">{application.address || "—"}</p></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">LinkedIn</p>
              {application.linked_in_url
                ? <a href={application.linked_in_url} target="_blank" rel="noreferrer" className="text-blue-600 mt-1 flex items-center gap-1 text-sm">View Profile <ExternalLink size={12} /></a>
                : <p className="text-slate-400 mt-1">Not provided</p>
              }
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <Briefcase size={14} /> Professional Background
          </h3>
          <div><p className="text-xs font-bold text-slate-400 uppercase">Years of Experience</p><p className="text-slate-800 mt-1">{application.experience_years ? `${application.experience_years} years` : "—"}</p></div>
        </div>

        {/* Documents */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <FileText size={14} /> Submitted Documents
          </h3>
          {application.documents && application.documents.length > 0 ? (
            <div className="space-y-3">
              {application.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg px-5 py-4">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${docTypeColor(doc.type)}`}>{doc.type}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 text-sm hover:underline">
                        <Eye size={14} /> View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No documents submitted yet.</p>
          )}
        </div>

        {/* Action Buttons */}
        {application.verification_status === "pending" && (
          <div className="flex gap-4 pt-4 border-t">
            <button onClick={() => onApprove(application.expert_id)} className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700">
              <CheckCircle size={18} /> Approve
            </button>
            <button onClick={() => onReject(application.expert_id)} className="flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700">
              <XCircle size={18} /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyDocumentationPage() {
  const [experts, setExperts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const res = await authFetch(API);
      const data = await res.json();
      if (data.success) setExperts(data.experts);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExperts(); }, []);

  const handleApprove = async (expertId) => {
    if (!window.confirm("Approve this expert?")) return;
    await authFetch(`${API}/${expertId}/approve`, { method: "POST" });
    setExperts(prev => prev.map(e => e.expert_id === expertId ? { ...e, verification_status: "approved" } : e));
    setSelected(prev => ({ ...prev, verification_status: "approved" }));
  };

  const handleReject = async (expertId) => {
    if (!window.confirm("Reject this expert?")) return;
    await authFetch(`${API}/${expertId}/reject`, { method: "POST" });
    setExperts(prev => prev.map(e => e.expert_id === expertId ? { ...e, verification_status: "rejected" } : e));
    setSelected(prev => ({ ...prev, verification_status: "rejected" }));
  };

  const filtered = filter === "all" ? experts : experts.filter(e => e.verification_status === filter);
  const counts = {
    all:      experts.length,
    pending:  experts.filter(e => e.verification_status === "pending").length,
    approved: experts.filter(e => e.verification_status === "approved").length,
    rejected: experts.filter(e => e.verification_status === "rejected").length,
  };

  if (selected) {
    return (
      <AdminLayout title="Expert Application Review" subtitle="Review expert credentials and supporting documents">
        <DetailView application={selected} onBack={() => setSelected(null)} onApprove={handleApprove} onReject={handleReject} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Expert Verification" subtitle="Review and verify expert account applications">
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "all",      label: "Total",    color: "border-blue-200 bg-blue-50 text-blue-700" },
            { key: "pending",  label: "Pending",  color: "border-yellow-200 bg-yellow-50 text-yellow-700" },
            { key: "approved", label: "Approved", color: "border-green-200 bg-green-50 text-green-700" },
            { key: "rejected", label: "Rejected", color: "border-red-200 bg-red-50 text-red-700" },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`border-2 rounded-lg px-5 py-4 text-left transition-all ${color} ${filter === key ? "ring-2 ring-offset-1 ring-blue-400" : "opacity-80 hover:opacity-100"}`}>
              <p className="text-3xl font-black">{counts[key]}</p>
              <p className="text-xs font-semibold mt-1">{label}</p>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg overflow-x-auto">
          <div className="px-6 py-4 border-b"><p className="text-sm font-semibold text-slate-700">{filtered.length} application{filtered.length !== 1 ? "s" : ""}</p></div>
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Expert</th>
                  <th className="px-6 py4">Experience</th>
                  <th className="px-6 py-4">Documents</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const { label, color, icon: StatusIcon } = statusConfig[app.verification_status] || statusConfig.pending;
                  const initials = (app.full_name || "??").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <tr key={app.expert_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold">{initials}</div>
                          <div>
                            <p className="font-bold text-slate-900">{app.full_name || "—"}</p>
                            <p className="text-xs text-slate-400">{app.email_address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-600">{app.experience_years ? `${app.experience_years} yrs` : "—"}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${app.documents?.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {app.documents?.length || 0} file{app.documents?.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`font-black text-lg ${scoreColor(app.verification_score)}`}>{app.verification_score}</span>
                        <span className="text-xs text-slate-400">/100</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${color}`}>
                          <StatusIcon size={11} /> {label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <button onClick={() => setSelected(app)} className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                          <Eye size={15} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No applications found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default VerifyDocumentationPage;
