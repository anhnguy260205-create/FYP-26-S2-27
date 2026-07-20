import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getArticles } from "../../api/knowledgeHubApi.js";

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

// ── Design tokens ─────────────────────────────────────────────────────────────
// Matches the Community Forum page's light theme (white cards, navy text,
// cyan brand accent) so the two shared pages read as one visual system.
const C = {
  card: "#FFFFFF",
  card2: "#F1F5F9",
  border: "rgba(11,29,79,0.25)",
  accent: "#00D3F2",
  accentText: "#004450",
  accentRgb: "0,211,242",
  cyan: "#0E7490",
  success: "#0F9D58",
  danger: "#DC2626",
  muted: "#5B6C88",
  text: "#0F172A",
  sub: "rgba(15,23,42,0.65)",
};

const PAGE = {
  heading: "#0B1D4F",
  sub: "#33477A",
  pillBorder: "rgba(11,29,79,0.3)",
  pillText: "#0B1D4F",
};

const CATEGORIES = ["All", "Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"];

const CAT_COLORS = {
  "Beginner": { bg: "rgba(15,157,88,0.1)", border: "rgba(15,157,88,0.3)", text: "#0F9D58" },
  "Technical Analysis": { bg: "rgba(14,116,144,0.1)", border: "rgba(14,116,144,0.3)", text: "#0E7490" },
  "Fundamental": { bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.3)", text: "#B45309" },
  "Risk Management": { bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.3)", text: "#DC2626" },
  "Market News": { bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)", text: "#7C3AED" },
  "Strategy": { bg: "rgba(194,65,12,0.1)", border: "rgba(194,65,12,0.3)", text: "#C2410C" },
};

function CategoryBadge({ cat }) {
  const c = CAT_COLORS[cat] ?? { bg: C.card2, border: C.border, text: C.muted };
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
      style={{ position: "fixed", inset: 0, background: "rgba(11,29,79,0.45)", zIndex: 50, overflowY: "auto", padding: "40px 20px" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 760, margin: "0 auto",
          background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 16,
          padding: "36px 40px",
          boxShadow: "0 20px 60px rgba(11,29,79,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <CategoryBadge cat={article.category} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <h1 style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: PAGE.heading, margin: "0 0 12px", lineHeight: 1.3 }}>{article.title}</h1>
        <div style={{ display: "flex", gap: 14, marginBottom: 22, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>By <b style={{ color: PAGE.sub }}>{article.author}</b></span>
          <span style={{ color: C.border }}>·</span>
          <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>
            {article.created_at ? new Date(article.created_at).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : ""}
          </span>
          {article.tags?.length > 0 && article.tags.map(t => (
            <span key={t} style={{ fontFamily: mono, fontSize: 9, color: C.accentText, background: `rgba(${C.accentRgb},0.12)`, border: `1px solid rgba(${C.accentRgb},0.3)`, borderRadius: 4, padding: "2px 7px" }}>{t}</span>
          ))}
        </div>
        <p style={{ fontFamily: sans, fontSize: 13, color: C.cyan, lineHeight: 1.7, margin: "0 0 24px", padding: "14px 18px", background: `rgba(${C.accentRgb},0.06)`, borderLeft: `3px solid rgba(${C.accentRgb},0.4)`, borderRadius: "0 8px 8px 0" }}>
          {article.summary}
        </p>
        <div style={{ fontFamily: sans, fontSize: 14, color: C.text, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{article.content}</div>
      </div>
    </motion.div>
  );
}

function EducationContent() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const role = String(currentUser?.role || "").toLowerCase();
  // Merged roles: experts are investors with the is_expert flag. The write
  // button is hidden from regular investors — only expert accounts see it.
  const isExpert = currentUser?.is_expert === true || role === "expert";
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
      <motion.div className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <RoleHeader />
        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>

          <div style={{ paddingBottom: 20, borderBottom: `1px solid ${C.border}`, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: PAGE.heading, margin: 0, letterSpacing: "0.04em" }}>Educational Content</h1>
              <p style={{ fontFamily: sans, fontSize: 13, color: PAGE.sub, margin: "4px 0 0" }}>Educational articles written by verified experts</p>
            </div>
            {canWrite && (
              <button onClick={() => navigate("/expert/knowledge-hub")} style={{
                padding: "10px 22px", borderRadius: 50, cursor: "pointer", border: "none",
                background: C.accent, color: C.accentText,
                fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
                boxShadow: `0 4px 14px rgba(${C.accentRgb},0.35)`,
              }}>My Article</button>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search articles, tags…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, height: 38, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontFamily: mono, fontSize: 12, outline: "none" }} />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{
                  height: 36, padding: "0 14px", borderRadius: 50, cursor: "pointer", transition: "all 0.15s",
                  border: category === c ? "none" : `1px solid ${PAGE.pillBorder}`,
                  background: category === c ? C.accent : "transparent",
                  color: category === c ? C.accentText : PAGE.pillText,
                  fontFamily: mono, fontSize: 11, fontWeight: 700,
                }}>{c}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontFamily: mono, fontSize: 13, color: PAGE.sub }}>
                {articles.length === 0 ? "No articles published yet — check back soon!" : "No articles match your search."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {filtered.map((a, i) => (
                <div key={a.article_id}
                  onClick={() => setSelected(a)}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`, borderRadius: 14,
                    padding: "20px 22px", cursor: "pointer",
                    transition: "border-color 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <CategoryBadge cat={a.category} />
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 8px", lineHeight: 1.4 }}>{a.title}</h3>
                  <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>{a.summary}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: sans, fontSize: 11, color: C.muted }}>By <b style={{ color: PAGE.sub }}>{a.author}</b></span>
                    <div style={{ display: "flex", gap: 5 }}>
                      {a.tags?.slice(0, 3).map(t => (
                        <span key={t} style={{ fontFamily: mono, fontSize: 9, color: C.accentText, background: `rgba(${C.accentRgb},0.12)`, border: `1px solid rgba(${C.accentRgb},0.3)`, borderRadius: 4, padding: "2px 7px" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontFamily: mono, fontSize: 9, color: C.muted, textAlign: "center", marginTop: 32 }}>
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
