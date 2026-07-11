import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getMyArticles, createArticle, updateArticle, deleteArticle } from "../../api/knowledgeHubApi.js";

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";
const CATEGORIES = ["Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"];

const STATUS_TABS = ["All", "In Review", "Published", "Rejected"];

const STATUS_META = {
  pending: { label: "In Review", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
  published: { label: "Published", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" },
  rejected: { label: "Rejected", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: 20,
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
    }}>{m.label}</span>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.7)",
  color: "#e2e8f0", fontFamily: mono, fontSize: 13,
};

function ArticleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    summary: initial?.summary ?? "",
    content: initial?.content ?? "",
    category: initial?.category ?? "Beginner",
    tags: initial?.tags?.join(", ") ?? "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title && form.summary && form.content;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: "linear-gradient(145deg,rgba(15,23,42,0.9),rgba(30,41,59,0.75))", border: "1px solid rgba(99,179,237,0.2)", borderRadius: 14, padding: "28px 30px" }}>

      <h2 style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: "0 0 22px" }}>
        {initial ? "Edit Article" : "Write New Article"}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Title *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Article title" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Summary * (shown on card)</label>
          <textarea value={form.summary} onChange={e => set("summary", e.target.value)} placeholder="A 1-2 sentence summary visible on the article card" rows={2}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        <div>
          <label style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Full Content *</label>
          <textarea value={form.content} onChange={e => set("content", e.target.value)} placeholder="Write your full article here. Use blank lines to separate paragraphs." rows={14}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8, fontSize: 13 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Category *</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Stock Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="e.g. AAPL, NVDA, TSLA" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, flexWrap: "wrap" }}>
          <button onClick={onCancel} style={{
            padding: "10px 22px", borderRadius: 8, cursor: "pointer",
            border: "1px solid rgba(99,179,237,0.2)", background: "transparent",
            color: "#64748b", fontFamily: mono, fontSize: 12, fontWeight: 700,
          }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !valid} style={{
            padding: "10px 28px", borderRadius: 8, cursor: "pointer",
            border: "1px solid rgba(99,179,237,0.5)", background: "rgba(99,179,237,0.15)",
            color: "#63b3ed", fontFamily: mono, fontSize: 12, fontWeight: 700,
            opacity: saving || !valid ? 0.5 : 1,
          }}>{saving ? "Saving…" : "Submit for Review"}</button>
        </div>
      </div>
    </motion.div>
  );
}

function ArticleRow({ article, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      style={{ background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))", border: "1px solid rgba(99,179,237,0.1)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{article.title}</span>
          <span style={{ fontFamily: mono, fontSize: 9, color: "#64748b", background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 4, padding: "2px 8px", textTransform: "uppercase" }}>{article.category}</span>
          <StatusBadge status={article.status} />
        </div>
        <p style={{ fontFamily: sans, fontSize: 11, color: "#64748b", margin: 0 }}>
          {article.summary.slice(0, 100)}{article.summary.length > 100 ? "…" : ""}
          &nbsp;·&nbsp;
          {article.created_at ? new Date(article.created_at).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : ""}
        </p>
        {article.status === "rejected" && (
          <p style={{ fontFamily: mono, fontSize: 10, color: "#f87171", margin: "6px 0 0" }}>Rejected by admin — edit and resubmit for review.</p>
        )}
        {article.status === "pending" && (
          <p style={{ fontFamily: mono, fontSize: 10, color: "#fbbf24", margin: "6px 0 0" }}>Awaiting admin review.</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => onEdit(article)} style={{
          padding: "7px 16px", borderRadius: 7, cursor: "pointer",
          border: "1px solid rgba(99,179,237,0.3)", background: "rgba(99,179,237,0.08)",
          color: "#63b3ed", fontFamily: mono, fontSize: 11, fontWeight: 700,
        }}>Edit</button>
        <button onClick={() => onDelete(article)} style={{
          padding: "7px 16px", borderRadius: 7, cursor: "pointer",
          border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)",
          color: "#f87171", fontFamily: mono, fontSize: 11, fontWeight: 700,
        }}>Delete</button>
      </div>
    </motion.div>
  );
}

function VerificationWall({ status }) {
  const navigate = useNavigate();
  const isPending = status === "pending";

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <ExpertHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          style={{ maxWidth: 520, width: "100%", background: "linear-gradient(145deg,rgba(15,23,42,0.9),rgba(30,41,59,0.75))", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 18, padding: "44px 40px", textAlign: "center" }}>

          <div style={{ fontSize: 48, marginBottom: 20 }}>
            {isPending ? "⏳" : "🔒"}
          </div>

          <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px", letterSpacing: "0.03em" }}>
            {isPending ? "Verification Pending" : "Verification Required"}
          </h2>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#94a3b8", lineHeight: 1.7, margin: "0 0 28px" }}>
            {isPending
              ? "Your verification request is under review by the admin. You will be able to create and submit articles once approved."
              : "Only verified experts can create and publish educational content. Please submit your verification documents to get started."}
          </p>

          {!isPending && (
            <button onClick={() => navigate("/expert/documents")}
              style={{
                padding: "12px 32px", borderRadius: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
                border: "1px solid rgba(99,179,237,0.5)", background: "rgba(99,179,237,0.15)", color: "#63b3ed",
              }}>
              Apply for Verification
            </button>
          )}

          {isPending && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10,
              border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)", color: "#fbbf24",
              fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700
            }}>
              ⏳ Under Review
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </motion.div>
  );
}

function ExpertKnowledgeHub() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");
  const isVerified = currentUser?.verification_status === "approved";

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("list");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  const reload = () => {
    if (!currentUser?.user_id || !isVerified) return;
    setLoading(true);
    getMyArticles(currentUser.user_id)
      .then(res => { if (res.success) setArticles(res.articles); })
      .finally(() => setLoading(false));
  };

  useEffect(reload, [currentUser?.user_id, isVerified]);

  const tabFilter = (a) => {
    if (activeTab === "All") return true;
    if (activeTab === "In Review") return a.status === "pending";
    if (activeTab === "Published") return a.status === "published";
    if (activeTab === "Rejected") return a.status === "rejected";
    return true;
  };

  const counts = {
    All: articles.length,
    "In Review": articles.filter(a => a.status === "pending").length,
    Published: articles.filter(a => a.status === "published").length,
    Rejected: articles.filter(a => a.status === "rejected").length,
  };

  const filtered = articles.filter(tabFilter);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      let res;
      if (editing) {
        res = await updateArticle(editing.article_id, { ...form, status: "pending" });
      } else {
        res = await createArticle({ user_id: currentUser.user_id, ...form });
      }
      if (res.success) { setMode("list"); setEditing(null); reload(); }
      else alert(res.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article) => {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    const res = await deleteArticle(article.article_id);
    if (res.success) reload();
    else alert(res.message ?? "Failed to delete");
  };

  if (!isVerified) {
    return <VerificationWall status={currentUser?.verification_status} />;
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <ExpertHeader />
        <main className="flex flex-col gap-8" style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>

          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            style={{ paddingBottom: 20, borderBottom: "1px solid rgba(99,179,237,0.15)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "0.04em" }}>My Articles</h1>
              <p style={{ fontFamily: sans, fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Write and publish educational content for investors</p>
            </div>
            {mode === "list" && (
              <button onClick={() => { setEditing(null); setMode("create"); }} style={{
                padding: "10px 22px", borderRadius: 8, cursor: "pointer",
                border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.1)",
                color: "#34d399", fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
              }}>+ Write Article</button>
            )}
          </motion.div>

          {mode === "list" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {STATUS_TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontFamily: mono, fontSize: 11, fontWeight: 700, transition: "all 0.2s",
                  border: activeTab === tab ? "1px solid rgba(99,179,237,0.5)" : "1px solid rgba(99,179,237,0.15)",
                  background: activeTab === tab ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.5)",
                  color: activeTab === tab ? "#63b3ed" : "#475569",
                }}>
                  {tab} {counts[tab] > 0 ? <span style={{ opacity: 0.7 }}>({counts[tab]})</span> : ""}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {(mode === "create" || mode === "edit") && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ArticleForm
                  initial={editing}
                  onSave={handleSave}
                  onCancel={() => { setMode("list"); setEditing(null); }}
                  saving={saving}
                />
              </motion.div>
            )}

            {mode === "list" && (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {loading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                    <div style={{ width: 36, height: 36, border: "3px solid rgba(99,179,237,0.2)", borderTopColor: "#63b3ed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <p style={{ fontFamily: mono, fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
                      {articles.length === 0 ? "You haven't written any articles yet." : `No ${activeTab.toLowerCase()} articles.`}
                    </p>
                    {articles.length === 0 && (
                      <button onClick={() => setMode("create")} style={{
                        padding: "10px 24px", borderRadius: 8, cursor: "pointer",
                        border: "1px solid rgba(99,179,237,0.4)", background: "rgba(99,179,237,0.1)",
                        color: "#63b3ed", fontFamily: mono, fontSize: 12, fontWeight: 700,
                      }}>Write your first article</button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map(a => (
                      <ArticleRow key={a.article_id} article={a}
                        onEdit={art => { setEditing(art); setMode("edit"); }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </main>
        <Footer />
      </motion.div>
    </>
  );
}

export default ExpertKnowledgeHub;
