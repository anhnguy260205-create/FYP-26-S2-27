import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getArticles } from "../../api/knowledgeHubApi.js";

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

const CATEGORIES = ["All", "Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"];

const CAT_COLORS = {
  "Beginner": { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "#34d399" },
  "Technical Analysis": { bg: "rgba(99,179,237,0.12)", border: "rgba(99,179,237,0.35)", text: "#63b3ed" },
  "Fundamental": { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", text: "#fbbf24" },
  "Risk Management": { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", text: "#f87171" },
  "Market News": { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)", text: "#a78bfa" },
  "Strategy": { bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)", text: "#fb923c" },
};

function CategoryBadge({ cat }) {
  const c = CAT_COLORS[cat] ?? { bg: "rgba(99,179,237,0.1)", border: "rgba(99,179,237,0.2)", text: "#94a3b8" };
  return (
    <span style={{
      fontFamily: mono, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: 20,
      color: c.text, background: c.bg, border: `1px solid ${c.border}`,
    }}>{cat}</span>
  );
}

function ArticleReader({ article, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, overflowY: "auto", padding: "40px 20px" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 760, margin: "0 auto",
          background: "linear-gradient(145deg,rgba(10,18,38,0.98),rgba(20,30,58,0.98))",
          border: "1px solid rgba(99,179,237,0.2)", borderRadius: 16,
          padding: "36px 40px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <CategoryBadge cat={article.category} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <h1 style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px", lineHeight: 1.3 }}>{article.title}</h1>
        <div style={{ display: "flex", gap: 14, marginBottom: 22, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: sans, fontSize: 12, color: "#64748b" }}>By <b style={{ color: "#94a3b8" }}>{article.author}</b></span>
          <span style={{ color: "#334155" }}>·</span>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#475569" }}>
            {article.created_at ? new Date(article.created_at).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : ""}
          </span>
          {article.tags?.length > 0 && article.tags.map(t => (
            <span key={t} style={{ fontFamily: mono, fontSize: 9, color: "#3b82f6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 4, padding: "2px 7px" }}>{t}</span>
          ))}
        </div>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#63b3ed", lineHeight: 1.7, margin: "0 0 24px", padding: "14px 18px", background: "rgba(99,179,237,0.06)", borderLeft: "3px solid rgba(99,179,237,0.4)", borderRadius: "0 8px 8px 0" }}>
          {article.summary}
        </p>
        <div style={{ fontFamily: sans, fontSize: 14, color: "#cbd5e1", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{article.content}</div>
      </div>
    </motion.div>
  );
}

function EducationContent() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const role = String(currentUser?.role || "").toLowerCase();
  const isExpert = role === "expert";
  // Unverified experts still see the button — clicking through to
  // /expert/knowledge-hub is what prompts them to submit documents
  // (ExpertKnowledgeHub's own VerificationWall handles that gate).
  const canWrite = isExpert;

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // `silent` skips the loading spinner — used for background polling so
  // newly-approved articles show up without the reader reloading the page.
  const fetchArticles = ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    getArticles({ category: category === "All" ? undefined : category })
      .then(res => { if (res.success) setArticles(res.articles); })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    fetchArticles();
    const interval = setInterval(() => fetchArticles({ silent: true }), 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filtered = articles.filter(a =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.summary.toLowerCase().includes(search.toLowerCase()) ||
    a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {isExpert ? <ExpertHeader /> : <GeneralHeader />}
        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>

          <div style={{ paddingBottom: 20, borderBottom: "1px solid rgba(99,179,237,0.15)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "0.04em" }}>Educational Content</h1>
              <p style={{ fontFamily: sans, fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Educational articles written by verified experts</p>
            </div>
            {canWrite && (
              <button onClick={() => navigate("/expert/knowledge-hub")} style={{
                padding: "10px 22px", borderRadius: 8, cursor: "pointer",
                border: "1px solid rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.1)",
                color: "#a855f7", fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
              }}>My Article</button>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search articles, tags…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", fontFamily: mono, fontSize: 12 }} />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{
                  height: 36, padding: "0 14px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                  border: category === c ? "1px solid rgba(99,179,237,0.5)" : "1px solid rgba(99,179,237,0.12)",
                  background: category === c ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.5)",
                  color: category === c ? "#63b3ed" : "#64748b",
                  fontFamily: mono, fontSize: 11, fontWeight: 700,
                }}>{c}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
              <div style={{ width: 36, height: 36, border: "3px solid rgba(99,179,237,0.2)", borderTopColor: "#63b3ed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontFamily: mono, fontSize: 13, color: "#94a3b8" }}>
                {articles.length === 0 ? "No articles published yet — check back soon!" : "No articles match your search."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {filtered.map((a, i) => (
                <div key={a.article_id}
                  onClick={() => setSelected(a)}
                  style={{
                    background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
                    border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
                    padding: "20px 22px", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <CategoryBadge cat={a.category} />
                    <span style={{ fontFamily: mono, fontSize: 10, color: "#475569" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px", lineHeight: 1.4 }}>{a.title}</h3>
                  <p style={{ fontFamily: sans, fontSize: 12, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.6 }}>{a.summary}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: sans, fontSize: 11, color: "#64748b" }}>By <b style={{ color: "#cbd5e1" }}>{a.author}</b></span>
                    <div style={{ display: "flex", gap: 5 }}>
                      {a.tags?.slice(0, 3).map(t => (
                        <span key={t} style={{ fontFamily: mono, fontSize: 9, color: "#3b82f6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 4, padding: "2px 7px" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontFamily: mono, fontSize: 9, color: "#334155", textAlign: "center", marginTop: 32 }}>
            {filtered.length} article{filtered.length !== 1 ? "s" : ""} · Content by verified experts · Not financial advice
          </p>
        </main>
        <Footer />
      </motion.div>
      <AnimatePresence>
        {selected && <ArticleReader article={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}

export default EducationContent;
