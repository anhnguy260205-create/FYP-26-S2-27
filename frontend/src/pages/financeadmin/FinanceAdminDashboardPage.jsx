import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle, FileText, ArrowRight, Eye } from "lucide-react";
import FinanceAdminLayout from "../../layout/FinanceAdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const API = `${import.meta.env.VITE_API_URL}/admin/experts`;

const statusConfig = {
  not_submitted: { label: "Unverified", color: "bg-gray-100 text-gray-500", icon: FileText },
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

function FinanceAdminDashboardPage() {
  const navigate = useNavigate();
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(API)
      .then((r) => r.json())
      .then((d) => { if (d.success) setExperts(d.experts); })
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    pending: experts.filter((e) => e.verification_status === "pending").length,
    approved: experts.filter((e) => e.verification_status === "approved").length,
    rejected: experts.filter((e) => e.verification_status === "rejected").length,
    not_submitted: experts.filter((e) => e.verification_status === "not_submitted").length,
  };

  const statCards = [
    { title: "Pending Review", value: counts.pending, icon: <Clock size={24} />, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Approved", value: counts.approved, icon: <CheckCircle size={24} />, color: "text-green-600", bg: "bg-green-50" },
    { title: "Rejected", value: counts.rejected, icon: <XCircle size={24} />, color: "text-red-600", bg: "bg-red-50" },
    { title: "Unverified", value: counts.not_submitted, icon: <FileText size={24} />, color: "text-gray-600", bg: "bg-gray-50" },
  ];

  const recentPending = experts
    .filter((e) => e.verification_status === "pending")
    .slice(0, 5);

  return (
    <FinanceAdminLayout title="Dashboard" subtitle="Overview of expert document verification status">
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.title} className="bg-white rounded-lg p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{card.title}</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{loading ? "—" : card.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${card.bg} ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Applications awaiting review</p>
            <button
              onClick={() => navigate("/finance-admin/document-verification")}
              className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : recentPending.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No applications pending review.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recentPending.map((app) => {
                  const { label, color, icon: StatusIcon } = statusConfig[app.verification_status];
                  const initials = (app.full_name || "??").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <tr key={app.expert_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">{initials}</div>
                          <div>
                            <p className="font-bold text-slate-900">{app.full_name || "—"}</p>
                            <p className="text-xs text-slate-400">{app.email_address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${color}`}>
                          <StatusIcon size={11} /> {label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate("/finance-admin/document-verification")}
                          className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:underline ml-auto"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </FinanceAdminLayout>
  );
}

export default FinanceAdminDashboardPage;
