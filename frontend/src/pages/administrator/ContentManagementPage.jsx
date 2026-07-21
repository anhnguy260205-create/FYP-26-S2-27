import { useEffect, useState } from "react";
import { Edit, Check, X, Image, ArrowUp, ArrowDown, Rocket, Sparkles, CreditCard, Link2, LayoutGrid, Eye } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import imgTechnical from "../../images/techinical analysis.jpg";
import imgAI from "../../images/aiprediction.jpg";
import imgStrategy from "../../images/strategy.jpg";
import imgNews from "../../images/news.jpg";
import imgBeginner from "../../images/beginner.jpg";
import imgTrading from "../../images/trading tip.jpg";
import imgIT from "../../images/information technology.jpg";
import imgFinancials from "../../images/financials.jpg";
import imgConsumer from "../../images/consumer discretionary.jpg";
import imgComm from "../../images/communication services.jpg";
import imgEnergy from "../../images/energy.jpeg";
import imgRealEstate from "../../images/real estate.jpg";

const ROOM_IMAGES = {
  "Technical Analysis": imgTechnical,
  "AI Predictions": imgAI,
  "Portfolio Strategy": imgStrategy,
  "Market News": imgNews,
  "Beginners Corner": imgBeginner,
  "Trading Tips": imgTrading,
  "Information Technology": imgIT,
  "Financials": imgFinancials,
  "Consumer Discretionary": imgConsumer,
  "Communication Services": imgComm,
  "Energy": imgEnergy,
  "Real Estate": imgRealEstate,
};

const API = `${import.meta.env.VITE_API_URL}/admin/content`;

const TABS = [
  { key: "hero",       label: "Landing Page",    icon: Rocket,      hint: "Hero title and subtitle shown to guests on the home page." },
  { key: "feature",    label: "Feature Bubbles", icon: Sparkles,    hint: "Floating feature cards on the landing and investor home pages." },
  { key: "membership", label: "Membership Plans", icon: CreditCard, hint: "Feature lists shown on the Free and Premium plan cards in the Subscription page." },
  { key: "expert",     label: "Expert",           icon: Rocket,      hint: "Hero title and subtitle shown on the Expert home page after login." },
  { key: "footer",     label: "Footer",           icon: Link2,       hint: "Brand name, tagline, and all footer links (Product, Company, Contact)." },
  { key: "forum",      label: "Forum Rooms",      icon: LayoutGrid,  hint: "Cover images assigned to each forum room. Images are bundled with the app." },
];

// Sections where item order is meaningful and can be nudged up/down.
const ORDERABLE_SECTIONS = new Set([
  "feature", "free_investor", "premium_investor",
  "footer_product", "footer_company", "footer_contact", "forum_room",
]);

// ── Live preview mockups — lightweight, brand-matched approximations of how
// each section actually renders on the real site, so edits can be sanity
// checked without switching tabs/logging out to view the public pages. ─────

function PreviewFrame({ label, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-slate-50 text-slate-500">
        <Eye size={13} />
        <span className="text-xs font-bold uppercase tracking-wider">Live Preview</span>
        <span className="text-xs text-slate-400 ml-auto">{label}</span>
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

function HeroPreview({ title, description, tone = "investor" }) {
  const bg = tone === "expert"
    ? "linear-gradient(135deg, #0B1D4F 0%, #0E7490 100%)"
    : "linear-gradient(135deg, #73ADFF 0%, #0B1D4F 100%)";
  return (
    <div style={{ background: bg }} className="p-8 text-center">
      <p className="text-white text-xl font-bold leading-tight mb-2">{title || "Your headline goes here"}</p>
      <p className="text-white/80 text-sm mb-4">{description || "Your subtitle goes here"}</p>
      <span className="inline-block bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-full">Get Started</span>
    </div>
  );
}

function FeaturePreview({ items }) {
  return (
    <div className="p-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="flex flex-wrap gap-2 justify-center">
        {(items.length ? items : [{ content_id: "placeholder", title: "Feature", description: "Description" }]).map(it => (
          <div key={it.content_id} className="bg-white rounded-full border border-blue-100 shadow-sm px-4 py-2 text-center min-w-[110px]">
            <p className="text-[11px] font-bold text-slate-800 leading-tight">{it.title}</p>
            <p className="text-[9px] text-slate-400 leading-tight">{it.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembershipCard({ name, price, sub, features, highlight }) {
  return (
    <div className={`flex-1 rounded-xl border p-5 ${highlight ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-white"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{name || "Plan"}</p>
      <p className="text-2xl font-bold text-slate-800 mb-0.5">{price || "$0"}</p>
      <p className="text-[10px] text-slate-400 mb-3">{sub}</p>
      <ul className="space-y-1.5">
        {(features.length ? features : [{ content_id: "ph", title: "Feature" }]).slice(0, 5).map(f => (
          <li key={f.content_id} className="text-[10px] text-slate-600 flex items-center gap-1.5">
            <Check size={10} className={highlight ? "text-yellow-600" : "text-green-600"} /> {f.title}
          </li>
        ))}
        {features.length > 5 && <li className="text-[10px] text-slate-400">+ {features.length - 5} more</li>}
      </ul>
    </div>
  );
}

function MembershipPreview({ freeName, freePrice, freePriceSub, premName, premPrice, premPriceSub, freeFeatures, premFeatures }) {
  return (
    <div className="p-5 bg-slate-50 flex gap-3">
      <MembershipCard name={freeName} price={freePrice} sub={freePriceSub} features={freeFeatures} />
      <MembershipCard name={premName} price={premPrice} sub={premPriceSub} features={premFeatures} highlight />
    </div>
  );
}

function FooterCol({ label, items }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">{label}</p>
      <ul className="space-y-1">
        {items.length ? items.map(i => <li key={i.content_id} className="text-[10px] text-white/70">{i.title}</li>)
                      : <li className="text-[10px] text-white/30 italic">No links yet</li>}
      </ul>
    </div>
  );
}

function FooterPreview({ brand, brandTagline, product, company, contact }) {
  return (
    <div className="p-6" style={{ background: "#0B1D4F" }}>
      <p className="text-white text-sm font-bold mb-1">{brand || "Brand Name"}</p>
      <p className="text-white/50 text-[10px] mb-4">{brandTagline}</p>
      <div className="grid grid-cols-3 gap-3">
        <FooterCol label="Product" items={product} />
        <FooterCol label="Company" items={company} />
        <FooterCol label="Contact" items={contact} />
      </div>
    </div>
  );
}

function ForumPreview({ rooms }) {
  return (
    <div className="p-4 bg-slate-50 grid grid-cols-2 gap-2">
      {(rooms.length ? rooms : []).slice(0, 4).map(r => {
        const src = r.description || ROOM_IMAGES[r.title];
        return (
          <div key={r.content_id} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
            <div className="h-14 bg-slate-200">
              {src && <img src={src} alt={r.title} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />}
            </div>
            <p className="text-[9px] font-semibold text-slate-700 px-2 py-1 truncate">{r.title}</p>
          </div>
        );
      })}
    </div>
  );
}

function ContentManagementPage() {
  const [content, setContent] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(null); // content_id currently moving
  const [activeTab, setActiveTab] = useState("hero");
  const [loading, setLoading] = useState(true);

  const fetchContent = async () => {
    const res = await authFetch(API);
    const data = await res.json();
    if (data.success) setContent(data.content);
  };

  useEffect(() => {
    setLoading(true);
    fetchContent().finally(() => setLoading(false));
  }, []);

  const startEdit = (item) => {
    setEditing(item.content_id);
    setForm({ title: item.title, description: item.description || "" });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async (content_id) => {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/${content_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        await fetchContent();
        setEditing(null);
      } else {
        alert(data.message || "Failed to save");
      }
    } catch {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const move = async (content_id, direction) => {
    setReordering(content_id);
    try {
      const res = await authFetch(`${API}/${content_id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (data.success) await fetchContent();
      // silently ignore edge-of-list no-ops — button will just be disabled next render
    } finally {
      setReordering(null);
    }
  };

  const freePlanInfo    = content.filter((c) => c.section === "free_plan");
  const premiumPlanInfo = content.filter((c) => c.section === "premium_plan");
  const freeItems       = content.filter((c) => c.section === "free_investor");
  const premiumItems    = content.filter((c) => c.section === "premium_investor");
  const footerBrand     = content.filter((c) => c.section === "footer_brand");
  const footerProduct   = content.filter((c) => c.section === "footer_product");
  const footerCompany   = content.filter((c) => c.section === "footer_company");
  const footerContact   = content.filter((c) => c.section === "footer_contact");
  const forumRooms      = content.filter((c) => c.section === "forum_room");
  const activeItems = ["membership", "footer", "forum"].includes(activeTab)
    ? []
    : content.filter((c) => c.section === activeTab);

  const activeTabInfo = TABS.find((t) => t.key === activeTab);

  // sections that show the description/subtitle field when editing
  const showDescription = (section) => ["hero", "expert", "feature", "footer_brand", "footer_product", "footer_company", "footer_contact"].includes(section);

  const renderRow = (item, list) => {
    const isEditing = editing === item.content_id;
    const idx = list.findIndex(i => i.content_id === item.content_id);
    const orderable = ORDERABLE_SECTIONS.has(item.section) && list.length > 1;
    return (
      <div key={item.content_id} className="bg-white rounded-lg p-5 border border-gray-100 hover:border-blue-200 transition-colors">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">TITLE</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {showDescription(item.section) && (
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">
                  {item.section === "hero" ? "SUBTITLE" : ["footer_product", "footer_company", "footer_contact"].includes(item.section) ? "URL" : "DESCRIPTION"}
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => saveEdit(item.content_id)}
                disabled={saving}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                <Check size={14} /> Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 border border-gray-300 text-slate-600 px-4 py-2 rounded-lg text-sm"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {orderable && (
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button onClick={() => move(item.content_id, "up")} disabled={idx === 0 || !!reordering}
                    className="text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-slate-400">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(item.content_id, "down")} disabled={idx === list.length - 1 || !!reordering}
                    className="text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-slate-400">
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => startEdit(item)}
              className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-1.5 rounded text-sm shrink-0"
            >
              <Edit size={13} /> Edit
            </button>
          </div>
        )}
      </div>
    );
  };

  // Live values fed into the preview — while editing, reflect the in-progress
  // form so the preview updates as you type; otherwise use the saved values.
  const liveTitle = (item) => (editing === item?.content_id ? form.title : item?.title) || "";
  const liveDesc  = (item) => (editing === item?.content_id ? form.description : item?.description) || "";

  const renderPreview = () => {
    if (activeTab === "hero") {
      const hero = activeItems[0];
      return <PreviewFrame label="Landing page"><HeroPreview title={liveTitle(hero)} description={liveDesc(hero)} /></PreviewFrame>;
    }
    if (activeTab === "expert") {
      const hero = activeItems[0];
      return <PreviewFrame label="Expert home"><HeroPreview title={liveTitle(hero)} description={liveDesc(hero)} tone="expert" /></PreviewFrame>;
    }
    if (activeTab === "feature") {
      const items = editing
        ? activeItems.map(it => it.content_id === editing ? { ...it, title: form.title, description: form.description } : it)
        : activeItems;
      return <PreviewFrame label="Feature bubbles"><FeaturePreview items={items} /></PreviewFrame>;
    }
    if (activeTab === "membership") {
      const withEdit = (list) => editing ? list.map(it => it.content_id === editing ? { ...it, title: form.title, description: form.description } : it) : list;
      const fp = withEdit(freePlanInfo), pp = withEdit(premiumPlanInfo);
      return (
        <PreviewFrame label="Subscription page">
          <MembershipPreview
            freeName={fp.find(i => i.content_id === "free_plan_name")?.title}
            freePrice={fp.find(i => i.content_id === "free_plan_price")?.title}
            freePriceSub={fp.find(i => i.content_id === "free_plan_price")?.description}
            premName={pp.find(i => i.content_id === "premium_plan_name")?.title}
            premPrice={pp.find(i => i.content_id === "premium_plan_price")?.title}
            premPriceSub={pp.find(i => i.content_id === "premium_plan_price")?.description}
            freeFeatures={withEdit(freeItems)}
            premFeatures={withEdit(premiumItems)}
          />
        </PreviewFrame>
      );
    }
    if (activeTab === "footer") {
      const withEdit = (list) => editing ? list.map(it => it.content_id === editing ? { ...it, title: form.title, description: form.description } : it) : list;
      return (
        <PreviewFrame label="Site footer">
          <FooterPreview
            brand={withEdit(footerBrand)[0]?.title}
            brandTagline={withEdit(footerBrand)[0]?.description}
            product={withEdit(footerProduct)}
            company={withEdit(footerCompany)}
            contact={withEdit(footerContact)}
          />
        </PreviewFrame>
      );
    }
    if (activeTab === "forum") {
      const withEdit = editing ? forumRooms.map(it => it.content_id === editing ? { ...it, title: form.title, description: form.description } : it) : forumRooms;
      return <PreviewFrame label="Community Forum"><ForumPreview rooms={withEdit} /></PreviewFrame>;
    }
    return null;
  };

  return (
    <AdminLayout title="Content Management" subtitle="Edit landing page and role-specific content">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mb-6 text-sm text-blue-700">
        Changes made here will appear on the corresponding page immediately after saving.
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditing(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-slate-600 hover:border-blue-300"
                }`}
            >
              <TabIcon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      {activeTabInfo?.hint && (
        <p className="text-xs text-slate-400 mb-4">{activeTabInfo.hint}</p>
      )}

      {loading ? (
        <div className="bg-white rounded-lg p-10 text-center text-gray-400">Loading content…</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div>
      {/* Membership Plans — two columns */}
      {activeTab === "membership" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Free Plan</p>

            {/* Plan Details */}
            <div className="space-y-3 mb-5">
              <p className="text-xs text-slate-400 font-semibold">Plan Details</p>
              {freePlanInfo.map((item) => (
                <div key={item.content_id} className="bg-white rounded-lg p-4 border border-blue-100">
                  {editing === item.content_id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">
                          {item.content_id === "free_plan_name" ? "PLAN NAME" : "PRICE"}
                        </label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      {item.content_id === "free_plan_price" && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 mb-1 block">PRICE SUBTITLE</label>
                          <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold">
                          <Check size={13} /> Save
                        </button>
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1 border border-gray-300 text-slate-600 px-3 py-1.5 rounded text-sm">
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          {item.content_id === "free_plan_name" ? "Plan Name" : "Price"}
                        </p>
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                      </div>
                      <button onClick={() => startEdit(item)}
                        className="flex items-center gap-1 border border-blue-500 text-blue-600 px-2 py-1 rounded text-xs shrink-0">
                        <Edit size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Free Features */}
            <p className="text-xs text-slate-400 font-semibold mb-3">Features</p>
            <div className="space-y-3">
              {freeItems.length === 0
                ? <p className="text-slate-400 text-sm">No free features found.</p>
                : freeItems.map((item) => renderRow(item, freeItems))
              }
            </div>
          </div>

          {/* Premium Plan */}
          <div>
            <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-3">Premium Plan</p>

            {/* Plan Details */}
            <div className="space-y-3 mb-5">
              <p className="text-xs text-slate-400 font-semibold">Plan Details</p>
              {premiumPlanInfo.map((item) => (
                <div key={item.content_id} className="bg-white rounded-lg p-4 border border-yellow-100">
                  {editing === item.content_id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">
                          {item.content_id === "premium_plan_name" ? "PLAN NAME" : "PRICE"}
                        </label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      {item.content_id === "premium_plan_price" && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 mb-1 block">PRICE SUBTITLE</label>
                          <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold">
                          <Check size={13} /> Save
                        </button>
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1 border border-gray-300 text-slate-600 px-3 py-1.5 rounded text-sm">
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          {item.content_id === "premium_plan_name" ? "Plan Name" : "Price"}
                        </p>
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                      </div>
                      <button onClick={() => startEdit(item)}
                        className="flex items-center gap-1 border border-yellow-500 text-yellow-600 px-2 py-1 rounded text-xs shrink-0">
                        <Edit size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Premium Features */}
            <p className="text-xs text-slate-400 font-semibold mb-3">Features</p>
            <div className="space-y-3">
              {premiumItems.length === 0
                ? <p className="text-slate-400 text-sm">No premium features found.</p>
                : premiumItems.map((item) => renderRow(item, premiumItems))
              }
            </div>
          </div>
        </div>
      )}

      {/* Footer tab */}
      {activeTab === "footer" && (
        <div className="space-y-8">
          {/* Brand */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Brand</p>
            <div className="space-y-3">
              {footerBrand.map((item) => renderRow(item, footerBrand))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Product Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">
              {footerProduct.map((item) => renderRow(item, footerProduct))}
            </div>
          </div>

          {/* Company links */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">
              {footerCompany.map((item) => renderRow(item, footerCompany))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact</p>
            <p className="text-xs text-slate-400 mb-2">For links: Title = label, Description = URL. For email: leave Description empty.</p>
            <div className="space-y-3">
              {footerContact.map((item) => renderRow(item, footerContact))}
            </div>
          </div>
        </div>
      )}

      {/* Forum Rooms tab */}
      {activeTab === "forum" && (
        <div>
          <p className="text-xs text-slate-400 mb-5">
            Set a custom image URL for each forum room. Leave blank to use the built-in default image. Use the arrows to change the order rooms appear in.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.filter((c) => c.section === "forum_room").map((item, idx, list) => {
              const isEditing = editing === item.content_id;
              const previewSrc = isEditing
                ? (form.description || ROOM_IMAGES[item.title])
                : (item.description || ROOM_IMAGES[item.title]);
              return (
                <div key={item.content_id} className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                  <div className="w-full overflow-hidden" style={{ height: 120 }}>
                    {previewSrc ? (
                      <img src={previewSrc} alt={item.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <Image size={24} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <button onClick={() => move(item.content_id, "up")} disabled={idx === 0 || !!reordering}
                        className="text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-slate-400">
                        <ArrowUp size={13} />
                      </button>
                      <button onClick={() => move(item.content_id, "down")} disabled={idx === list.length - 1 || !!reordering}
                        className="text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-slate-400">
                        <ArrowDown size={13} />
                      </button>
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.title}</p>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-bold text-slate-400 mb-1 block">IMAGE URL</label>
                          <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                          <p className="text-xs text-slate-400 mt-1">Leave blank to use the default bundled image.</p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold">
                            <Check size={13} /> Save
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1 border border-gray-300 text-slate-600 px-3 py-1.5 rounded text-sm">
                            <X size={13} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-400 truncate">
                          {item.description ? item.description : <span className="italic">Using default image</span>}
                        </p>
                        <button onClick={() => startEdit(item)}
                          className="flex items-center gap-1 border border-blue-500 text-blue-600 px-2 py-1 rounded text-xs shrink-0">
                          <Edit size={12} /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All other tabs (hero / feature / expert) */}
      {!["membership", "footer", "forum"].includes(activeTab) && (
        <div className="space-y-4">
          {activeItems.length === 0
            ? <p className="text-slate-400 text-sm">No content found for this section.</p>
            : activeItems.map((item) => renderRow(item, activeItems))
          }
        </div>
      )}
      </div>

      {/* Live preview column */}
      <div>{renderPreview()}</div>
      </div>
      )}
    </AdminLayout>
  );
}

export default ContentManagementPage;
