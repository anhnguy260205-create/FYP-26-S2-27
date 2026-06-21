import { useEffect, useState } from "react";
import { Eye, Edit, Trash2, ArrowLeft } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const API_URL = "http://127.0.0.1:8000/admin/articles";

function InvestmentGuidanceArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [mode, setMode] = useState("list");
  const [selectedArticle, setSelectedArticle] = useState(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    content: "",
    status: "draft",
  });

  const fetchArticles = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (data.success) setArticles(data.articles);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const openView = async (articleId) => {
    const res = await fetch(`${API_URL}/${articleId}`);
    const data = await res.json();
    if (data.success) {
      setSelectedArticle(data.article);
      setMode("view");
    } else {
      alert(data.message || "Article not found");
    }
  };

  const openEdit = async (articleId) => {
    const res = await fetch(`${API_URL}/${articleId}`);
    const data = await res.json();
    if (data.success) {
      setSelectedArticle(data.article);
      setForm({
        title: data.article.title,
        category: data.article.category,
        content: data.article.content,
        status: data.article.status,
      });
      setMode("edit");
    } else {
      alert(data.message || "Article not found");
    }
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm("Delete this article?")) return;
    const res = await fetch(`${API_URL}/${articleId}`, { method: "DELETE" });
    const data = await res.json();
    alert(data.message || "Done");
    fetchArticles();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/${selectedArticle.article_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message || "Article updated successfully");
      setMode("list");
      fetchArticles();
    } else {
      alert(data.message || "Failed to update article");
    }
  };

  if (mode === "view" && selectedArticle) {
    return (
      <AdminPage title="Article Details" subtitle="View investment guidance article details.">
        <button
          onClick={() => setMode("list")}
          className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Articles
        </button>

        <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{selectedArticle.title}</h1>
            <span
              className={`px-3 py-1 rounded text-xs font-semibold ${
                selectedArticle.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {selectedArticle.status}
            </span>
          </div>

          <hr className="mb-6" />

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">ARTICLE ID</p>
              <p>{selectedArticle.article_id}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">CATEGORY</p>
              <p>{selectedArticle.category}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">AUTHOR</p>
              <p>{selectedArticle.author}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">DATE PUBLISHED</p>
              <p>{selectedArticle.date_published}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">CONTENT</p>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {selectedArticle.content}
            </p>
          </div>
        </div>
      </AdminPage>
    );
  }

  if (mode === "edit" && selectedArticle) {
    return (
      <AdminPage title="Edit Article" subtitle="Update investment guidance content.">
        <button
          onClick={() => setMode("list")}
          className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Articles
        </button>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg p-8 max-w-4xl mx-auto space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-3"
              placeholder="Enter article title"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-3"
              placeholder="Beginner, Education, Strategy..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border rounded-lg px-4 py-3"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
              rows={8}
              className="w-full border rounded-lg px-4 py-3"
              placeholder="Write article content..."
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold"
          >
            Update Article
          </button>
        </form>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Investment Guidance Articles"
      subtitle="Manage and publish investment education content."
    >
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold">All Articles</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-4">ARTICLE ID</th>
              <th className="text-left p-4">TITLE</th>
              <th className="text-left p-4">CATEGORY</th>
              <th className="text-left p-4">AUTHOR</th>
              <th className="text-left p-4">STATUS</th>
              <th className="text-left p-4">DATE PUBLISHED</th>
              <th className="text-left p-4">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {articles.map((article) => (
              <tr key={article.article_id} className="border-t">
                <td className="p-4 font-semibold">{article.article_id}</td>
                <td className="p-4">{article.title}</td>
                <td className="p-4">{article.category}</td>
                <td className="p-4">{article.author}</td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      article.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {article.status}
                  </span>
                </td>
                <td className="p-4">{article.date_published}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openView(article.article_id)}
                      className="flex items-center gap-1 border px-3 py-2 rounded text-sm"
                    >
                      <Eye size={14} /> View
                    </button>

                    <button
                      onClick={() => openEdit(article.article_id)}
                      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"
                    >
                      <Edit size={14} /> Edit
                    </button>

                    <button
                      onClick={() => handleDelete(article.article_id)}
                      className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded text-sm"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {articles.length === 0 && (
              <tr>
                <td colSpan="7" className="p-6 text-center text-slate-500">
                  No articles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

export default InvestmentGuidanceArticlesPage;
