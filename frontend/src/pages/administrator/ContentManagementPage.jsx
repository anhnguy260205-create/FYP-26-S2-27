import { useEffect, useState } from "react";
import {
  Edit, Check, X, GripVertical, Eye, ChevronDown,
  Rocket, Compass, ShieldCheck, Sparkles, Award, Layers,
  PlayCircle, ListChecks, HelpCircle, CreditCard, Link2,
} from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const API = `${import.meta.env.VITE_API_URL}/admin/content`;

// ── Tabs ──────────────────────────────────────────────────────────────────
// Every tab here maps to a section that's actually rendered on the public
// landing page (Homepage.jsx) or Footer — confirmed by searching the whole
// frontend for where each section/content_id is read. Three tabs that used
// to exist here (Feature Bubbles, Expert hero, Forum Rooms) were removed
// because nothing in the app ever reads those sections; editing them did
// nothing on any real page.
//
// kind: "hero"       — a single title+subtitle item, no items list below
//       "generic"     — an optional header item (headerId) + a list of
//                        cards (itemsSection), both editable
//       "membership"  — the existing two-column Free/Premium plan editor
//       "footer"      — the existing footer editor
// ── Landing Page subtabs ─────────────────────────────────────────────────
const LANDING_SUBTABS = [
  { key: "hero",               label: "Landing Hero",     icon: Rocket,       kind: "hero",
    hint: "The big headline at the very top of the home page." },
  { key: "path",                label: "Choose Your Path", icon: Compass,      kind: "generic", preview: "role_toggle",
    headerId: "header_path", itemsSection: "role_options",
    hint: "The Investor / Expert role-picker section." },
  { key: "why_investor",        label: "Why RocketTrade",  icon: ShieldCheck,  kind: "generic", preview: "cards",
    headerId: "header_why_investor", itemsSection: "why_investor",
    hint: "Investor trust cards (Zero-Risk Learning, etc.)." },
  { key: "platform_features",   label: "Platform Features", icon: Sparkles,    kind: "generic", preview: "cards",
    headerId: "header_features_investor", itemsSection: "platform_features",
    hint: "\u201cEverything You Need to Invest Smarter\u201d cards." },
  { key: "why_expert",          label: "Why Become Expert", icon: Award,       kind: "generic", preview: "cards",
    headerId: "header_why_expert", itemsSection: "why_expert",
    hint: "Expert trust cards (Get Paid, etc.)." },
  { key: "expert_features",     label: "Expert Features",  icon: Layers,       kind: "generic", preview: "cards",
    headerId: "header_features_expert", itemsSection: "expert_features",
    hint: "\u201cEverything You Get as an Expert\u201d cards." },
  { key: "video",               label: "Video Section",    icon: PlayCircle,   kind: "generic", preview: "video",
    headerId: "header_video", itemsSection: null,
    hint: "Heading above the product walkthrough video." },
  { key: "get_started",         label: "Get Started Steps", icon: ListChecks,  kind: "generic", preview: "steps",
    headerId: "header_started", itemsSection: "get_started_steps",
    hint: "The 4-step signup guide." },
  { key: "faq",                 label: "FAQ",              icon: HelpCircle,   kind: "generic", preview: "faq",
    headerId: "header_faq", itemsSection: "faq",
    hint: "Questions and answers shown near the bottom of the page." },
];

// ── Main tabs ─────────────────────────────────────────────────────────────
// "Landing Page" groups every section that only appears on Homepage.jsx,
// via its subtabs above. Membership Plans and Footer are their own main
// tabs (not landing subtabs) because both are read by more than the
// landing page — Membership Plans also drives SubscriptionPage.jsx, and
// Footer renders on every page in the app via layout/Footer.jsx.
const MAIN_TABS = [
  { key: "landing",    label: "Landing Page",     icon: Rocket,     subtabs: LANDING_SUBTABS },
  { key: "membership", label: "Membership Plans", icon: CreditCard, kind: "membership",
    hint: "Pricing heading plus the Free/Premium plan cards \u2014 used on both the landing page and the Subscription page." },
  { key: "footer",     label: "Footer",           icon: Link2,      kind: "footer",
    hint: "Brand name, tagline, and footer links \u2014 shown on every page." },
];

// Sections where item order is meaningful and can be dragged to reorder.
const ORDERABLE_SECTIONS = new Set([
  "role_options", "why_investor", "platform_features", "why_expert", "expert_features",
  "get_started_steps", "faq",
  "free_investor", "premium_investor",
  "footer_product", "footer_company", "footer_contact",
]);

// sections/tabs that show the description/subtitle field when editing a card
const DESCRIPTION_SECTIONS = new Set([
  "hero", "page_headers",
  "role_options", "why_investor", "platform_features", "why_expert", "expert_features",
  "get_started_steps", "faq",
  "footer_brand", "footer_product", "footer_company", "footer_contact",
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

function HeroPreview({ title, description }) {
  return (
    <div className="relative overflow-hidden text-center py-10 px-6" style={{ background: "linear-gradient(to bottom, #000000, #172554)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,0.22) 0%, transparent 60%)" }} />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 mb-4 text-[9px] font-semibold tracking-wide text-cyan-300 uppercase">
          <Sparkles size={10} /> AI-Powered Investing Platform
        </span>
        <p className="text-lg font-extrabold leading-tight mb-2 bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #22d3ee, #60a5fa)" }}>
          {title || "Your headline goes here"}
        </p>
        <p className="text-slate-400 text-xs mb-5">{description || "Your subtitle goes here"}</p>
        <div className="flex gap-2 justify-center">
          <span className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-semibold">Get Started</span>
          <span className="px-4 py-1.5 rounded-lg border border-slate-500 text-white text-[10px] font-semibold">Login</span>
        </div>
      </div>
    </div>
  );
}

function CardGridPreview({ heading, description, items }) {
  const shown = items.length ? items : [{ content_id: "placeholder", title: "Card title", description: "Card description" }];
  return (
    <div className="p-6 bg-white">
      {(heading || description) && (
        <div className="text-center mb-4">
          <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {shown.slice(0, 6).map(it => (
          <div key={it.content_id} className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center mb-1.5">
              <Sparkles size={12} className="text-cyan-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-900 leading-tight">{it.title}</p>
            <p className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{it.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleTogglePreview({ heading, description, items }) {
  const shown = items.length ? items : [{ content_id: "ph1", title: "Role" }, { content_id: "ph2", title: "Role" }];
  return (
    <div className="p-6 bg-white text-center">
      <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 mb-4">{description}</p>
      <div className="flex flex-col gap-2">
        {shown.map((it, i) => (
          <div key={it.content_id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left ${i === 0 ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white"}`}>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? "bg-cyan-100 text-cyan-600" : "bg-slate-100 text-slate-500"}`}>
              <Compass size={14} />
            </span>
            <span>
              <span className="block text-[11px] font-bold text-slate-800">{it.title}</span>
              <span className="block text-[9px] text-slate-400">{it.description}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepsPreview({ heading, description, items }) {
  const shown = items.length ? items : [{ content_id: "ph", title: "Step title", description: "Step description" }];
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {shown.slice(0, 4).map((it, i) => (
          <div key={it.content_id} className="relative rounded-xl border border-blue-100 bg-blue-50 p-3">
            <span className="absolute top-2 right-2 text-[8px] font-bold text-cyan-400">STEP {i + 1}</span>
            <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center mb-1.5">
              <Sparkles size={12} className="text-cyan-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-900 leading-tight">{it.title}</p>
            <p className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{it.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqPreview({ heading, description, items }) {
  const shown = items.length ? items : [{ content_id: "ph", title: "Question", description: "Answer" }];
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="space-y-1.5">
        {shown.slice(0, 4).map((it, i) => (
          <div key={it.content_id} className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-900">{it.title}</span>
              <ChevronDown size={12} className={`text-cyan-600 shrink-0 ${i === 0 ? "rotate-180" : ""}`} />
            </div>
            {i === 0 && <p className="px-3 pb-2 text-[9px] text-slate-500">{it.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoPreview({ heading, description }) {
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="relative aspect-video w-full rounded-xl border border-cyan-400/30 bg-slate-900 flex items-center justify-center">
        <span className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center">
          <PlayCircle className="text-white" size={16} />
        </span>
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

function MembershipPreview({ heading, description, freeName, freePrice, freePriceSub, premName, premPrice, premPriceSub, freeFeatures, premFeatures }) {
  return (
    <div className="bg-slate-50">
      {(heading || description) && (
        <div className="text-center pt-5 px-4">
          <p className="text-slate-800 text-sm font-extrabold leading-tight">{heading}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
        </div>
      )}
      <div className="p-5 flex gap-3">
        <MembershipCard name={freeName} price={freePrice} sub={freePriceSub} features={freeFeatures} />
        <MembershipCard name={premName} price={premPrice} sub={premPriceSub} features={premFeatures} highlight />
      </div>
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

function ContentManagementPage() {
  const [content, setContent] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState("landing");
  const [activeSubTab, setActiveSubTab] = useState("hero");
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

  // ── Drag-and-drop reordering ─────────────────────────────────────────────
  const reorderSection = async (section, orderedIds) => {
    const res = await authFetch(`${API}/section/${section}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
    const data = await res.json();
    if (!data.success) await fetchContent();
  };

  const handleDrop = (list, targetId) => {
    const draggedId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;

    const ids = list.map((i) => i.content_id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);

    const section = list[0].section;
    setContent((prev) => {
      const untouched = prev.filter((p) => p.section !== section);
      const reordered = ids.map((id, idx) => ({ ...prev.find((p) => p.content_id === id), order_index: idx }));
      return [...untouched, ...reordered];
    });
    reorderSection(section, ids);
  };

  const byId = (id) => content.find((c) => c.content_id === id);
  const bySection = (section) => content.filter((c) => c.section === section);

  const freePlanInfo    = bySection("free_plan");
  const premiumPlanInfo = bySection("premium_plan");
  const freeItems       = bySection("free_investor");
  const premiumItems    = bySection("premium_investor");
  const footerBrand     = bySection("footer_brand");
  const footerProduct   = bySection("footer_product");
  const footerCompany   = bySection("footer_company");
  const footerContact   = bySection("footer_contact");

  const currentMainTab = MAIN_TABS.find((t) => t.key === activeMainTab);
  const activeTabInfo = currentMainTab?.subtabs
    ? currentMainTab.subtabs.find((t) => t.key === activeSubTab)
    : currentMainTab;

  const renderRow = (item, list) => {
    const isEditing = editing === item.content_id;
    const orderable = ORDERABLE_SECTIONS.has(item.section) && list.length > 1;
    const isDragOver = orderable && dragOverId === item.content_id && dragId !== item.content_id;
    const showDesc = DESCRIPTION_SECTIONS.has(item.section);
    return (
      <div
        key={item.content_id}
        draggable={orderable && !isEditing}
        onDragStart={() => setDragId(item.content_id)}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        onDragOver={(e) => { if (orderable) { e.preventDefault(); setDragOverId(item.content_id); } }}
        onDrop={(e) => { e.preventDefault(); if (orderable) handleDrop(list, item.content_id); }}
        className={`bg-white rounded-lg p-5 border transition-colors ${
          isDragOver ? "border-blue-400 border-dashed bg-blue-50/50" : "border-gray-100 hover:border-blue-200"
        } ${dragId === item.content_id ? "opacity-40" : ""}`}
      >
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
            {showDesc && (
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">
                  {["hero", "page_headers"].includes(item.section) ? "SUBTITLE"
                    : ["footer_product", "footer_company", "footer_contact"].includes(item.section) ? "URL"
                    : item.section === "faq" ? "ANSWER" : "DESCRIPTION"}
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                <Check size={14} /> Save
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-1 border border-gray-300 text-slate-600 px-4 py-2 rounded-lg text-sm">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {orderable && (
                <div className="pt-0.5 text-slate-300 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                  <GripVertical size={16} />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                )}
              </div>
            </div>
            <button onClick={() => startEdit(item)}
              className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-1.5 rounded text-sm shrink-0">
              <Edit size={13} /> Edit
            </button>
          </div>
        )}
      </div>
    );
  };

  // Live values fed into the preview — while editing, reflect the in-progress
  // form so the preview updates as you type; otherwise use the saved values.
  const liveItem = (item) => item?.content_id === editing ? { ...item, title: form.title, description: form.description } : item;
  const liveList = (list) => list.map(liveItem);

  const renderPreview = () => {
    if (activeMainTab === "landing" && activeSubTab === "hero") {
      const hero = liveItem(byId("content_hero"));
      return <PreviewFrame label="Landing page"><HeroPreview title={hero?.title} description={hero?.description} /></PreviewFrame>;
    }
    if (activeMainTab === "membership") {
      const header = liveItem(byId("header_pricing"));
      const fp = liveList(freePlanInfo), pp = liveList(premiumPlanInfo);
      return (
        <PreviewFrame label="Subscription page">
          <MembershipPreview
            heading={header?.title} description={header?.description}
            freeName={fp.find(i => i.content_id === "free_plan_name")?.title}
            freePrice={fp.find(i => i.content_id === "free_plan_price")?.title}
            freePriceSub={fp.find(i => i.content_id === "free_plan_price")?.description}
            premName={pp.find(i => i.content_id === "premium_plan_name")?.title}
            premPrice={pp.find(i => i.content_id === "premium_plan_price")?.title}
            premPriceSub={pp.find(i => i.content_id === "premium_plan_price")?.description}
            freeFeatures={liveList(freeItems)}
            premFeatures={liveList(premiumItems)}
          />
        </PreviewFrame>
      );
    }
    if (activeMainTab === "footer") {
      return (
        <PreviewFrame label="Site footer">
          <FooterPreview
            brand={liveList(footerBrand)[0]?.title}
            brandTagline={liveList(footerBrand)[0]?.description}
            product={liveList(footerProduct)}
            company={liveList(footerCompany)}
            contact={liveList(footerContact)}
          />
        </PreviewFrame>
      );
    }
    // generic header + items tabs
    const tab = activeTabInfo;
    if (tab?.kind === "generic") {
      const header = tab.headerId ? liveItem(byId(tab.headerId)) : null;
      const items = tab.itemsSection ? liveList(bySection(tab.itemsSection)) : [];
      const heading = header?.title, description = header?.description;
      if (tab.preview === "video") {
        return <PreviewFrame label={tab.label}><VideoPreview heading={heading} description={description} /></PreviewFrame>;
      }
      if (tab.preview === "role_toggle") {
        return <PreviewFrame label={tab.label}><RoleTogglePreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "steps") {
        return <PreviewFrame label={tab.label}><StepsPreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "faq") {
        return <PreviewFrame label={tab.label}><FaqPreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      return <PreviewFrame label={tab.label}><CardGridPreview heading={heading} description={description} items={items} /></PreviewFrame>;
    }
    return null;
  };

  return (
    <AdminLayout title="Content Management" subtitle="Edit landing page and role-specific content">
      {/* Main tabs */}
      <div className="flex flex-wrap gap-2 mb-2">
        {MAIN_TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveMainTab(tab.key); setEditing(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeMainTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-slate-600 hover:border-blue-300"
                }`}
            >
              <TabIcon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Landing Page subtabs */}
      {activeMainTab === "landing" && (
        <div className="flex flex-wrap gap-1.5 mb-2 pl-1">
          {LANDING_SUBTABS.map((sub) => {
            const SubIcon = sub.icon;
            return (
              <button
                key={sub.key}
                onClick={() => { setActiveSubTab(sub.key); setEditing(null); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeSubTab === sub.key
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white/60 text-slate-500 hover:bg-white"
                  }`}
              >
                <SubIcon size={12} /> {sub.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTabInfo?.hint && (
        <p className="text-xs text-slate-400 mb-4">{activeTabInfo.hint}</p>
      )}

      {loading ? (
        <div className="bg-white rounded-lg p-10 text-center text-gray-400">Loading content…</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div>

      {/* Hero */}
      {activeMainTab === "landing" && activeSubTab === "hero" && (
        <div className="space-y-4">
          {byId("content_hero") ? renderRow(byId("content_hero"), [byId("content_hero")])
            : <p className="text-slate-400 text-sm">No content found for this section.</p>}
        </div>
      )}

      {/* Generic header + items tabs */}
      {activeTabInfo?.kind === "generic" && (
        <div className="space-y-6">
          {activeTabInfo.headerId && byId(activeTabInfo.headerId) && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Section Heading</p>
              {renderRow(byId(activeTabInfo.headerId), [byId(activeTabInfo.headerId)])}
            </div>
          )}
          {activeTabInfo.itemsSection && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cards</p>
              <div className="space-y-3">
                {bySection(activeTabInfo.itemsSection).length === 0
                  ? <p className="text-slate-400 text-sm">No content found for this section.</p>
                  : bySection(activeTabInfo.itemsSection).map((item) => renderRow(item, bySection(activeTabInfo.itemsSection)))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Membership Plans — two columns */}
      {activeMainTab === "membership" && (
        <div className="space-y-6">
          {byId("header_pricing") && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Section Heading</p>
              {renderRow(byId("header_pricing"), [byId("header_pricing")])}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Free Plan</p>
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
            <p className="text-xs text-slate-400 font-semibold mb-3">Features</p>
            <div className="space-y-3">
              {premiumItems.length === 0
                ? <p className="text-slate-400 text-sm">No premium features found.</p>
                : premiumItems.map((item) => renderRow(item, premiumItems))
              }
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {activeMainTab === "footer" && (
        <div className="space-y-8">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Brand</p>
            <div className="space-y-3">{footerBrand.map((item) => renderRow(item, footerBrand))}</div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Product Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">{footerProduct.map((item) => renderRow(item, footerProduct))}</div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">{footerCompany.map((item) => renderRow(item, footerCompany))}</div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact</p>
            <p className="text-xs text-slate-400 mb-2">For links: Title = label, Description = URL. For email: leave Description empty.</p>
            <div className="space-y-3">{footerContact.map((item) => renderRow(item, footerContact))}</div>
          </div>
        </div>
      )}

      </div>
      <div>{renderPreview()}</div>
      </div>
      )}
    </AdminLayout>
  );
}

export default ContentManagementPage;
