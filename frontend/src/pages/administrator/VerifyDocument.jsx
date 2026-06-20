import { useState } from "react";
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye, FileText, User, Briefcase, Star, ExternalLink } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";

const applications = [
  {
    expert_id: "expert_001",
    user_id: "user_101",
    full_name: "Dr. Sarah Chen",
    email_address: "sarah.chen@financemail.com",
    phone_number: "+60 12-345 6789",
    address: "14 Jalan Ampang, Kuala Lumpur, 50450",
    experience_years: 12,
    linked_in_url: "https://linkedin.com/in/sarahchen-finance",
    verification_status: "pending",
    verification_score: 87,
    submitted_date: "2026-06-15",
    specialisation: "Equity Analysis & Portfolio Management",
    qualifications: ["CFA Level III", "MBA (Finance), NUS", "BSc Economics, UM"],
    documents: [
      { name: "CFA Certificate.pdf", type: "certification", size: "1.2 MB" },
      { name: "MBA Degree.pdf", type: "degree", size: "890 KB" },
      { name: "Employment Letter – Maybank.pdf", type: "employment", size: "450 KB" },
    ],
    bio: "Senior portfolio manager with 12 years of experience across equity markets in Asia-Pacific. Previously at Maybank Investment Bank and CIMB Principal Asset Management.",
  },
  {
    expert_id: "expert_002",
    user_id: "user_102",
    full_name: "Marcus Lim Wei Jian",
    email_address: "marcus.lim@wealthpro.my",
    phone_number: "+60 17-654 3210",
    address: "88 Jalan Pudu, Kuala Lumpur, 55100",
    experience_years: 7,
    linked_in_url: "https://linkedin.com/in/marcuslimwj",
    verification_status: "pending",
    verification_score: 74,
    submitted_date: "2026-06-17",
    specialisation: "Fixed Income & Derivatives",
    qualifications: ["FRM Part II", "BSc Finance, Monash Malaysia"],
    documents: [
      { name: "FRM Certificate.pdf", type: "certification", size: "780 KB" },
      { name: "Degree Transcript.pdf", type: "degree", size: "1.1 MB" },
    ],
    bio: "Fixed income analyst specialising in bond markets and interest rate derivatives. 7 years at RHB Bank and AmBank Group.",
  },
  {
    expert_id: "expert_003",
    user_id: "user_103",
    full_name: "Priya Nair Subramaniam",
    email_address: "priya.nair@capitalwise.com",
    phone_number: "+60 11-222 8899",
    address: "32 Jalan SS 21/37, Damansara Utama, 47400",
    experience_years: 9,
    linked_in_url: "https://linkedin.com/in/priyanairfinance",
    verification_status: "approved",
    verification_score: 93,
    submitted_date: "2026-06-10",
    specialisation: "Retirement Planning & Wealth Management",
    qualifications: ["CFP", "ACCA", "BSc Accounting, UPM"],
    documents: [
      { name: "CFP Certificate.pdf", type: "certification", size: "640 KB" },
      { name: "ACCA Certificate.pdf", type: "certification", size: "720 KB" },
      { name: "Degree Certificate.pdf", type: "degree", size: "950 KB" },
    ],
    bio: "Certified Financial Planner with expertise in retirement and estate planning. Serves high-net-worth clients across Klang Valley.",
  },
  {
    expert_id: "expert_004",
    user_id: "user_104",
    full_name: "Jason Tan Kok Wei",
    email_address: "jasontan@techfinance.io",
    phone_number: "+60 16-789 0011",
    address: "5 Persiaran KLCC, Kuala Lumpur, 50088",
    experience_years: 4,
    linked_in_url: "https://linkedin.com/in/jasontanfin",
    verification_status: "rejected",
    verification_score: 42,
    submitted_date: "2026-06-12",
    specialisation: "Cryptocurrency & DeFi Investments",
    qualifications: ["BSc Computer Science, UTM"],
    documents: [
      { name: "Degree Certificate.pdf", type: "degree", size: "820 KB" },
    ],
    bio: "Self-taught crypto investor and DeFi enthusiast with 4 years of personal trading experience. Runs a YouTube channel on Web3 investing.",
  },
];

const statusConfig = {
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

const scoreColor = (score) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const docTypeLabel = (type) => {
  if (type === "certification") return "bg-purple-100 text-purple-700";
  if (type === "degree") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
};

function DetailView({ application, onBack, onApprove, onReject }) {
  const { label, color, icon: StatusIcon } = statusConfig[application.verification_status];

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-700"
      >
        <ArrowLeft size={16} /> Back to Applications
      </button>

      <div className="bg-white rounded-lg p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {application.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{application.full_name}</h2>
              <p className="text-slate-500 text-sm mt-1">{application.specialisation}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${color}`}>
                  <StatusIcon size={12} />
                  {label}
                </span>
                <span className="text-xs text-slate-400">Submitted: {application.submitted_date}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Verification Score</p>
            <p className={`text-4xl font-black ${scoreColor(application.verification_score)}`}>
              {application.verification_score}
              <span className="text-lg font-medium text-slate-400">/100</span>
            </p>
          </div>
        </div>

        {/* Personal Info */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <User size={14} /> Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-x-20 gap-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Email Address</p>
              <p className="text-slate-800 mt-1">{application.email_address}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Phone Number</p>
              <p className="text-slate-800 mt-1">{application.phone_number}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Address</p>
              <p className="text-slate-800 mt-1">{application.address}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">LinkedIn Profile</p>
              <a
                href={application.linked_in_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 mt-1 flex items-center gap-1 text-sm"
              >
                View Profile <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <Briefcase size={14} /> Professional Background
          </h3>
          <div className="grid grid-cols-2 gap-x-20 gap-y-6 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Years of Experience</p>
              <p className="text-slate-800 mt-1">{application.experience_years} years</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Specialisation</p>
              <p className="text-slate-800 mt-1">{application.specialisation}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Bio</p>
            <p className="text-slate-600 text-sm leading-relaxed">{application.bio}</p>
          </div>
        </div>

        {/* Qualifications */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <Star size={14} /> Qualifications
          </h3>
          <div className="flex flex-wrap gap-2">
            {application.qualifications.map((q) => (
              <span key={q} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-medium">
                {q}
              </span>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <FileText size={14} /> Submitted Documents
          </h3>
          <div className="space-y-3">
            {application.documents.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                    <p className="text-xs text-slate-400">{doc.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${docTypeLabel(doc.type)}`}>
                    {doc.type}
                  </span>
                  <button className="flex items-center gap-1 text-blue-600 text-sm hover:underline">
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {application.verification_status === "pending" && (
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={() => onApprove(application.expert_id)}
              className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              <CheckCircle size={18} /> Approve Application
            </button>
            <button
              onClick={() => onReject(application.expert_id)}
              className="flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              <XCircle size={18} /> Reject Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyDocumentationPage() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(applications);

  const handleApprove = (expertId) => {
    if (!window.confirm("Approve this expert application?")) return;
    setData((prev) =>
      prev.map((a) => a.expert_id === expertId ? { ...a, verification_status: "approved" } : a)
    );
    setSelected((prev) => ({ ...prev, verification_status: "approved" }));
  };

  const handleReject = (expertId) => {
    if (!window.confirm("Reject this expert application?")) return;
    setData((prev) =>
      prev.map((a) => a.expert_id === expertId ? { ...a, verification_status: "rejected" } : a)
    );
    setSelected((prev) => ({ ...prev, verification_status: "rejected" }));
  };

  const filtered = filter === "all" ? data : data.filter((a) => a.verification_status === filter);

  const counts = {
    all: data.length,
    pending: data.filter((a) => a.verification_status === "pending").length,
    approved: data.filter((a) => a.verification_status === "approved").length,
    rejected: data.filter((a) => a.verification_status === "rejected").length,
  };

  if (selected) {
    return (
      <AdminLayout title="Expert Application Review" subtitle="Review expert credentials and supporting documents">
        <DetailView
          application={selected}
          onBack={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Expert Application Review" subtitle="Review and approve expert account applications">
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { key: "all", label: "Total Applications", color: "border-blue-200 bg-blue-50 text-blue-700" },
            { key: "pending", label: "Pending Review", color: "border-yellow-200 bg-yellow-50 text-yellow-700" },
            { key: "approved", label: "Approved", color: "border-green-200 bg-green-50 text-green-700" },
            { key: "rejected", label: "Rejected", color: "border-red-200 bg-red-50 text-red-700" },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`border-2 rounded-lg px-5 py-4 text-left transition-all ${color} ${filter === key ? "ring-2 ring-offset-1 ring-blue-400" : "opacity-80 hover:opacity-100"}`}
            >
              <p className="text-3xl font-black">{counts[key]}</p>
              <p className="text-xs font-semibold mt-1">{label}</p>
            </button>
          ))}
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-slate-700">
              {filter === "all" ? "All Applications" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Applications`}
              <span className="ml-2 text-slate-400 font-normal">({filtered.length})</span>
            </p>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Specialisation</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const { label, color, icon: StatusIcon } = statusConfig[app.verification_status];
                return (
                  <tr key={app.expert_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold">
                          {app.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{app.full_name}</p>
                          <p className="text-xs text-slate-400">{app.email_address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-600 text-xs">{app.specialisation}</td>
                    <td className="px-6 py-5 text-slate-600">{app.experience_years} yrs</td>
                    <td className="px-6 py-5">
                      <span className={`font-black text-lg ${scoreColor(app.verification_score)}`}>
                        {app.verification_score}
                      </span>
                      <span className="text-xs text-slate-400">/100</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${color}`}>
                        <StatusIcon size={11} />
                        {label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-500 text-xs">{app.submitted_date}</td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => setSelected(app)}
                        className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline"
                      >
                        <Eye size={15} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

export default VerifyDocumentationPage;
