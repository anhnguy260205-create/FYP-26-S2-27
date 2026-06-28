import { useEffect, useState } from "react";
import { Edit, Check, X, Image } from "lucide-react";
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
  { key: "hero",       label: "Landing Page",    hint: "Hero title and subtitle shown to guests on the home page." },
  { key: "feature",    label: "Feature Bubbles", hint: "Floating feature cards on the landing and investor home pages." },
  { key: "membership", label: "Membership Plans", hint: "Feature lists shown on the Free and Premium plan cards in the Subscription page." },
  { key: "expert",     label: "Expert",           hint: "Hero title and subtitle shown on the Expert home page after login." },
  { key: "footer",     label: "Footer",           hint: "Brand name, tagline, and all footer links (Product, Company, Contact)." },
  { key: "forum",      label: "Forum Rooms",      hint: "Cover images assigned to each forum room. Images are bundled with the app." },
];

function ContentManagementPage() {
  const [content, setContent] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("hero");

  const fetchContent = async () => {
    const res = await authFetch(API);
    const data = await res.json();
    if (data.success) setContent(data.content);
  };

  useEffect(() => { fetchContent(); }, []);

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

  const freePlanInfo    = content.filter((c) => c.section === "free_plan");
  const premiumPlanInfo = content.filter((c) => c.section === "premium_plan");
  const freeItems       = content.filter((c) => c.section === "free_investor");
  const premiumItems    = content.filter((c) => c.section === "premium_investor");
  const footerBrand     = content.filter((c) => c.section === "footer_brand");
  const footerProduct   = content.filter((c) => c.section === "footer_product");
  const footerCompany   = content.filter((c) => c.section === "footer_company");
  const footerContact   = content.filter((c) => c.section === "footer_contact");
  const activeItems = ["membership", "footer", "forum"].includes(activeTab)
    ? []
    : content.filter((c) => c.section === activeTab);

  const activeHint = TABS.find((t) => t.key === activeTab)?.hint;

  // sections that show the description/subtitle field when editing
  const showDescription = (section) => ["hero", "expert", "feature", "footer_brand", "footer_product", "footer_company", "footer_contact"].includes(section);

  const renderRow = (item) => {
    const isEditing = editing === item.content_id;
    return (
      <div key={item.content_id} className="bg-white rounded-lg p-5 border border-gray-100">
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
            <div>
              <p className="font-semibold text-slate-800">{item.title}</p>
              {item.description && (
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
              )}
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

  return (
    <AdminLayout title="Content Management" subtitle="Edit landing page and role-specific content">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mb-6 text-sm text-blue-700">
        Changes made here will appear on the corresponding page immediately after saving.
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setEditing(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === tab.key
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-slate-600"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hint */}
      {activeHint && (
        <p className="text-xs text-slate-400 mb-4">{activeHint}</p>
      )}

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
                : freeItems.map(renderRow)
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
                : premiumItems.map(renderRow)
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
              {footerBrand.map(renderRow)}
            </div>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Product Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">
              {footerProduct.map(renderRow)}
            </div>
          </div>

          {/* Company links */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">
              {footerCompany.map(renderRow)}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact</p>
            <p className="text-xs text-slate-400 mb-2">For links: Title = label, Description = URL. For email: leave Description empty.</p>
            <div className="space-y-3">
              {footerContact.map(renderRow)}
            </div>
          </div>
        </div>
      )}

      {/* Forum Rooms tab */}
      {activeTab === "forum" && (
        <div>
          <p className="text-xs text-slate-400 mb-5">
            Set a custom image URL for each forum room. Leave blank to use the built-in default image. Changes are live immediately after saving.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.filter((c) => c.section === "forum_room").map((item) => {
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
                    <p className="text-sm font-semibold text-slate-700 mb-2">{item.title}</p>
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

      {/* All other tabs */}
      {!["membership", "footer", "forum"].includes(activeTab) && (
        <div className="space-y-4">
          {activeItems.length === 0
            ? <p className="text-slate-400 text-sm">No content found for this section.</p>
            : activeItems.map(renderRow)
          }
        </div>
      )}
    </AdminLayout>
  );
}

export default ContentManagementPage;
