import { useEffect, useState } from "react";
import { Eye, Edit, Trash2, ArrowLeft } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const API_URL = `${import.meta.env.VITE_API_URL}/admin/articles`;

const CATEGORIES = ["Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"];

const emptyForm = {
  title: "",
  summary: "",
  category: "Beginner",
  tags: "",
  content: "",
  status: "published",
};

function ArticleForm({ form, setForm, onSubmit, onCancel, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg p-8 max-w-4xl mx-auto space-y-5">
      <div>
        <label className="block text-sm font-semibold mb-2">Title *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full border rounded-lg px-4 py-3"
          placeholder="Enter article title"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Summary *</label>
        <input
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          required
          className="w-full border rounded-lg px-4 py-3"
          placeholder="A short description shown in the article card"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded-lg px-4 py-3"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full border rounded-lg px-4 py-3"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Tags <span className="text-slate-400 font-normal">(comma-separated, e.g. AAPL,basics)</span></label>
        <input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full border rounded-lg px-4 py-3"
          placeholder="e.g. investing,beginner,stocks"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Content *</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          required
          rows={10}
          className="w-full border rounded-lg px-4 py-3"
          placeholder="Write the full article content here..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="border px-6 py-3 rounded-lg text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function InvestmentGuidanceArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [mode, setMode] = useState("list"); // list | view | create | edit
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchArticles = async () => {
    const res = await authFetch(API_URL);
    const data = await res.json();
    if (data.success) setArticles(data.articles);
  };

  useEffect(() => { fetchArticles(); }, []);

  const openView = async (articleId) => {
    const res = await authFetch(`${API_URL}/${articleId}`);
    const data = await res.json();
    if (data.success) { setSelectedArticle(data.article); setMode("view"); }
    else alert(data.message || "Article not found");
  };

  const openEdit = async (articleId) => {
    const res = await authFetch(`${API_URL}/${articleId}`);
    const data = await res.json();
    if (data.success) {
      setSelectedArticle(data.article);
      setForm({
        title: data.article.title,
        summary: data.article.summary || "",
        category: data.article.category,
        tags: Array.isArray(data.article.tags) ? data.article.tags.join(",") : (data.article.tags || ""),
        content: data.article.content,
        status: data.article.status,
      });
      setMode("edit");
    } else alert(data.message || "Article not found");
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm("Delete this article?")) return;
    const res = await authFetch(`${API_URL}/${articleId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchArticles();
    else alert(data.message || "Failed to delete");
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await authFetch(`${API_URL}/${selectedArticle.article_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setMode("list");
      fetchArticles();
    } else alert(data.message || "Failed to update article");
  };

  // ── View ──
  if (mode === "view" && selectedArticle) {
    return (
      <AdminPage title="Article Details" subtitle="View article details.">
        <button onClick={() => setMode("list")} className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>
            <div className="flex gap-2 items-center">
              <span className={`px-3 py-1 rounded text-xs font-semibold ${selectedArticle.author_type === "admin" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                {selectedArticle.author_type === "admin" ? "Admin" : "Expert"}
              </span>
              <span className={`px-3 py-1 rounded text-xs font-semibold ${selectedArticle.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {selectedArticle.status}
              </span>
            </div>
          </div>
          <p className="text-slate-500 mb-6">{selectedArticle.summary}</p>
          <hr className="mb-6" />
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div><p className="text-xs font-bold text-slate-400 mb-1">CATEGORY</p><p>{selectedArticle.category}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">AUTHOR</p><p>{selectedArticle.author}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">TAGS</p><p>{Array.isArray(selectedArticle.tags) ? selectedArticle.tags.join(", ") : selectedArticle.tags || "—"}</p></div>
            <div><p className="text-xs font-bold text-slate-400 mb-1">PUBLISHED</p><p>{selectedArticle.created_at ? new Date(selectedArticle.created_at).toLocaleDateString() : "—"}</p></div>
          </div>
          <div><p className="text-xs font-bold text-slate-400 mb-2">CONTENT</p><p className="text-slate-600 leading-relaxed whitespace-pre-line">{selectedArticle.content}</p></div>
        </div>
      </AdminPage>
    );
  }

  // ── Edit ──
  if (mode === "edit" && selectedArticle) {
    return (
      <AdminPage title="Edit Article" subtitle="Update article content.">
        <button onClick={() => setMode("list")} className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
        <ArticleForm form={form} setForm={setForm} onSubmit={handleEdit} onCancel={() => setMode("list")} submitLabel="Save Changes" />
      </AdminPage>
    );
  }

  // ── List ──
  return (
    <AdminPage title="Education Articles" subtitle="Manage all articles — written by admin or experts.">
      <div className="bg-white rounded-lg overflow-x-auto">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold">All Articles ({articles.length})</h3>
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
            {articles.map((article) => (
              <tr key={article.article_id} className="border-t hover:bg-slate-50">
                <td className="p-4 font-medium max-w-xs truncate">{article.title}</td>
                <td className="p-4">{article.category}</td>
                <td className="p-4">{article.author}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${article.author_type === "admin" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {article.author_type === "admin" ? "Admin" : "Expert"}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${article.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {article.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : "—"}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openView(article.article_id)} className="flex items-center gap-1 border px-3 py-1.5 rounded text-xs">
                      <Eye size={13} /> View
                    </button>
                    <button onClick={() => openEdit(article.article_id)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs">
                      <Edit size={13} /> Edit
                    </button>
                    <button onClick={() => handleDelete(article.article_id)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">No articles yet. Click "Create Article" to write the first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

export default InvestmentGuidanceArticlesPage;
