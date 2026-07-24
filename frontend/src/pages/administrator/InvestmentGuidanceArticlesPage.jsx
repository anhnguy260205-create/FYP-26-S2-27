import { useEffect, useRef, useState } from "react";
import { Eye, Trash2, ArrowLeft, Check, X, Plus, Pencil, Upload, Download } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import { approveArticle, rejectArticle, adminCreateArticle, adminUpdateArticle } from "../../api/knowledgeHubApi.js";

const API_URL = `${import.meta.env.VITE_API_URL}/admin/articles`;
const STATUS_FILTERS = ["All", "Pending Review", "Published", "Rejected"];
const CATEGORIES = ["Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"];

const STATUS_STYLE = {
  published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
  pending:   { bg: "bg-amber-100", text: "text-amber-700", label: "In Review" },
  rejected:  { bg: "bg-red-100",   text: "text-red-700",   label: "Rejected"  },
  draft:     { bg: "bg-slate-100", text: "text-slate-600",  label: "Draft"     },
};

// Small CSV parser, handles quoted fields with commas/newlines/escaped
// quotes inside them. Good enough for the import template — didn't seem
// worth pulling in a whole library just for this.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

const CSV_TEMPLATE =
  'title,category,summary,tags,status,content\n' +
  '"How to Read a Candlestick Chart","Technical Analysis","A quick primer on candlestick patterns.","charts,beginner","published","Full article body goes here. Wrap any field containing a comma in double quotes."\n';

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "article_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
  );
}

// ── Create / Edit form (used for both "Add New Article" and row "Edit") ─────
function ArticleForm({ initial, onCancel, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title: initial?.title || "",
    category: initial?.category || CATEGORIES[0],
    summary: initial?.summary || "",
    content: initial?.content || "",
    tags: Array.isArray(initial?.tags) ? initial.tags.join(", ") : (initial?.tags || ""),
  });
  const [saving, setSaving] = useState(null); // "draft" | "published" | null
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (status) => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setError("");
    setSaving(status);
    try {
      const payload = { ...form, status };
      const res = isEdit
        ? await adminUpdateArticle(initial.article_id, payload)
        : await adminCreateArticle(payload);
      if (res.success) onSaved();
      else setError(res.message || "Failed to save article");
    } catch {
      setError("Failed to save article");
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminPage title={isEdit ? "Edit Article" : "Create New Article"} subtitle="Fields marked with an asterisk are required.">
      <button onClick={onCancel} className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="bg-white rounded-lg p-8 max-w-3xl mx-auto space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">TITLE *</label>
          <input value={form.title} onChange={set("title")} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">CATEGORY</label>
          <select value={form.category} onChange={set("category")} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">SHORT DESCRIPTION</label>
          <input value={form.summary} onChange={set("summary")} placeholder="One-sentence summary shown on the article card" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">CONTENT *</label>
          <textarea value={form.content} onChange={set("content")} rows={10} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">TAGS</label>
          <input value={form.tags} onChange={set("tags")} placeholder="comma, separated, tags" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={() => save("published")} disabled={!!saving}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
            <Check size={14} /> {saving === "published" ? "Publishing…" : "Publish"}
          </button>
          <button onClick={() => save("draft")} disabled={!!saving}
            className="flex items-center gap-1 border border-gray-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
            {saving === "draft" ? "Saving…" : "Save as Draft"}
          </button>
          <button onClick={onCancel} className="flex items-center gap-1 text-slate-500 px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
        </div>
      </div>
    </AdminPage>
  );
}

// ── Bulk CSV import ──────────────────────────────────────────────────────────
function CsvImportModal({ onClose, onDone }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null); // [{title, success, message}]
  const [parseError, setParseError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result));
        if (parsed.length === 0) { setParseError("No rows found in this file."); return; }
        const missingTitle = parsed.findIndex(r => !r.title);
        if (missingTitle !== -1) { setParseError(`Row ${missingTitle + 2} is missing a title.`); return; }
        setRows(parsed);
      } catch {
        setParseError("Couldn't parse this file — check it's a valid CSV.");
      }
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    setImporting(true);
    const out = [];
    for (const r of rows) {
      try {
        const res = await adminCreateArticle({
          title: r.title,
          category: CATEGORIES.includes(r.category) ? r.category : CATEGORIES[0],
          summary: r.summary || "",
          content: r.content || "",
          tags: r.tags || "",
          status: ["draft", "published", "pending"].includes(r.status) ? r.status : "published",
        });
        out.push({ title: r.title, success: !!res.success, message: res.message || "" });
      } catch {
        out.push({ title: r.title, success: false, message: "Request failed" });
      }
    }
    setResults(out);
    setImporting(false);
    if (out.every(r => r.success)) onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold">Import Articles from CSV</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-4">
          <p className="font-semibold mb-1">CSV format</p>
          <p>Columns: <code>title, category, summary, tags, status, content</code>. Only <code>title</code> is required.
             Category must match an existing category (falls back to "{CATEGORIES[0]}"); status defaults to "published"
             if omitted or unrecognised. Wrap any field containing a comma in double quotes.</p>
          <button onClick={downloadCsvTemplate} className="mt-2 flex items-center gap-1 text-blue-700 font-semibold underline">
            <Download size={13} /> Download template
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm mb-3" />
        {fileName && <p className="text-xs text-slate-400 mb-2">{fileName}</p>}
        {parseError && <p className="text-sm text-red-600 mb-2">{parseError}</p>}

        {rows.length > 0 && !results && (
          <>
            <p className="text-sm text-slate-600 mb-2">{rows.length} article{rows.length !== 1 ? "s" : ""} ready to import:</p>
            <ul className="text-sm text-slate-500 list-disc pl-5 mb-4 max-h-40 overflow-y-auto">
              {rows.map((r, i) => <li key={i}>{r.title}</li>)}
            </ul>
            <button onClick={runImport} disabled={importing}
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              <Upload size={14} /> {importing ? "Importing…" : `Import ${rows.length} article${rows.length !== 1 ? "s" : ""}`}
            </button>
          </>
        )}

        {results && (
          <div className="mt-2">
            <ul className="text-sm space-y-1 mb-4">
              {results.map((r, i) => (
                <li key={i} className={r.success ? "text-green-700" : "text-red-600"}>
                  {r.success ? "✓" : "✗"} {r.title} {r.message && `— ${r.message}`}
                </li>
              ))}
            </ul>
            <button onClick={onClose} className="border border-gray-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InvestmentGuidanceArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [mode, setMode] = useState("list");
  const [selectedArticle, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [actioning, setActioning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

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
    if (statusFilter === "All") return true;
    if (statusFilter === "Pending Review") return a.status === "pending";
    if (statusFilter === "Published") return a.status === "published";
    if (statusFilter === "Rejected") return a.status === "rejected";
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
    if (data.success) {
      await fetchArticles();
      setSelected(null);
      setMode("list");
    } else alert(data.message || "Failed to delete");
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
              {selectedArticle.author_type === "admin" && (
                <button onClick={() => setMode("edit")}
                  className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-1.5 rounded text-xs font-semibold">
                  <Pencil size={13} /> Edit
                </button>
              )}
              {selectedArticle.status === "published" && (
                <button onClick={() => handleDelete(selectedArticle.article_id)}
                  className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold">
                  <Trash2 size={13} /> Delete
                </button>
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

  // ── Create / Edit ──
  if (mode === "create" || (mode === "edit" && selectedArticle)) {
    return (
      <ArticleForm
        initial={mode === "edit" ? selectedArticle : null}
        onCancel={() => setMode(mode === "edit" ? "view" : "list")}
        onSaved={async () => {
          await fetchArticles();
          setSelected(null);
          setMode("list");
        }}
      />
    );
  }

  // ── List ──
  return (
    <AdminPage title="Article Management" subtitle="Review and manage articles written by experts.">

      <div className="flex justify-end gap-2 mb-5">
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-1 border border-gray-300 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold">
          <Upload size={14} /> Import CSV
        </button>
        <button onClick={() => { setSelected(null); setMode("create"); }}
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus size={14} /> Add New Article
        </button>
      </div>

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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onDone={async () => { await fetchArticles(); setShowImport(false); }}
        />
      )}
    </AdminPage>
  );
}

export default InvestmentGuidanceArticlesPage;
