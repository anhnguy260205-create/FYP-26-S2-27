import { useEffect, useState } from "react";
import { Eye, Trash2, ArrowLeft, Check, X } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import { approveArticle, rejectArticle } from "../../api/knowledgeHubApi.js";

const API_URL = `${import.meta.env.VITE_API_URL}/admin/articles`;
const STATUS_FILTERS = ["All", "Pending Review", "Published", "Rejected"];

const STATUS_STYLE = {
  published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
  pending:   { bg: "bg-amber-100", text: "text-amber-700", label: "In Review" },
  rejected:  { bg: "bg-red-100",   text: "text-red-700",   label: "Rejected"  },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
  );
}

function InvestmentGuidanceArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [mode, setMode] = useState("list");
  const [selectedArticle, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [actioning, setActioning] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    const res = await authFetch(API_URL);
    const data = await res.json();
    if (data.success) setArticles(data.articles);
  };

  useEffect(() => {
    setLoading(true);
    fetchArticles().finally(() => setLoading(false));
  }, []);

  const filtered = articles.filter(a => {
    if (statusFilter === "All")            return true;
    if (statusFilter === "Pending Review") return a.status === "pending";
    if (statusFilter === "Published")      return a.status === "published";
    if (statusFilter === "Rejected")       return a.status === "rejected";
    return true;
  });

  const pendingCount = articles.filter(a => a.status === "pending").length;

  const openView = async (articleId) => {
    const res = await authFetch(`${API_URL}/${articleId}`);
    const data = await res.json();
    if (data.success) { setSelected(data.article); setMode("view"); }
    else alert(data.message || "Article not found");
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm("Delete this article?")) return;
    const res = await authFetch(`${API_URL}/${articleId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchArticles();
    else alert(data.message || "Failed to delete");
  };

  const handleApprove = async (articleId) => {
    setActioning(articleId);
    try {
      const res = await approveArticle(articleId);
      if (res.success) {
        fetchArticles();
        if (selectedArticle?.article_id === articleId) setSelected(s => ({ ...s, status: "published" }));
      } else alert(res.message ?? "Failed to approve");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (articleId) => {
    setActioning(articleId);
    try {
      const res = await rejectArticle(articleId);
      if (res.success) {
        fetchArticles();
        if (selectedArticle?.article_id === articleId) setSelected(s => ({ ...s, status: "rejected" }));
      } else alert(res.message ?? "Failed to reject");
    } finally {
      setActioning(null);
    }
  };

  // ── View ──
  if (mode === "view" && selectedArticle) {
    const isPending = selectedArticle.status === "pending";
    return (
      <AdminPage title="Article Details" subtitle="View article details.">
        <button onClick={() => setMode("list")} className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
            <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>
            <div className="flex gap-2 items-center flex-wrap">
              <span className={`px-3 py-1 rounded text-xs font-semibold ${selectedArticle.author_type === "admin" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                {selectedArticle.author_type === "admin" ? "Admin" : "Expert"}
              </span>
              <StatusBadge status={selectedArticle.status} />
              {isPending && (
                <>
                  <button onClick={() => handleApprove(selectedArticle.article_id)} disabled={!!actioning}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-semibold">
                    <Check size={13} /> Approve
                  </button>
                  <button onClick={() => handleReject(selectedArticle.article_id)} disabled={!!actioning}
                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold">
                    <X size={13} /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-slate-500 mb-6">{selectedArticle.summary}</p>
          <hr className="mb-6" />
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div><p className="text-xs font-bold text-slate-400 mb-1">CATEGORY</p><p>{selectedArticle.category}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">AUTHOR</p><p>{selectedArticle.author}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">TAGS</p><p>{Array.isArray(selectedArticle.tags) ? selectedArticle.tags.join(", ") : selectedArticle.tags || "—"}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">DATE</p><p>{selectedArticle.created_at ? new Date(selectedArticle.created_at).toLocaleDateString() : "—"}</p></div>
          </div>
          <div><p className="text-xs font-bold text-slate-400 mb-2">CONTENT</p><p className="text-slate-600 leading-relaxed whitespace-pre-line">{selectedArticle.content}</p></div>
        </div>
      </AdminPage>
    );
  }

  // ── List ──
  return (
    <AdminPage title="Education Articles" subtitle="Review and manage articles written by experts.">

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 mb-5 text-sm text-amber-700 font-medium">
          {pendingCount} article{pendingCount !== 1 ? "s" : ""} pending review.
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${statusFilter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-slate-600"}`}>
            {f}{f === "Pending Review" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg overflow-x-auto">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold">Articles ({filtered.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-4">TITLE</th>
              <th className="text-left p-4">CATEGORY</th>
              <th className="text-left p-4">AUTHOR</th>
              <th className="text-left p-4">TYPE</th>
              <th className="text-left p-4">STATUS</th>
              <th className="text-left p-4">DATE</th>
              <th className="text-left p-4">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading articles…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">No articles match this filter.</td></tr>
            ) : filtered.map(article => (
              <tr key={article.article_id} className="border-t hover:bg-slate-50">
                <td className="p-4 font-medium max-w-xs truncate">{article.title}</td>
                <td className="p-4">{article.category}</td>
                <td className="p-4">{article.author}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${article.author_type === "admin" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {article.author_type === "admin" ? "Admin" : "Expert"}
                  </span>
                </td>
                <td className="p-4"><StatusBadge status={article.status} /></td>
                <td className="p-4 text-slate-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : "—"}</td>
                <td className="p-4">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => openView(article.article_id)} className="flex items-center gap-1 border px-3 py-1.5 rounded text-xs">
                      <Eye size={13} /> View
                    </button>
                    {article.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(article.article_id)} disabled={actioning === article.article_id}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-semibold">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => handleReject(article.article_id)} disabled={actioning === article.article_id}
                          className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold">
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}
                    {article.status === "published" && (
                      <button onClick={() => handleDelete(article.article_id)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs">
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

export default InvestmentGuidanceArticlesPage;
