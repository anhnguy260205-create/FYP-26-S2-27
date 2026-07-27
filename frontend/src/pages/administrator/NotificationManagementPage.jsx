import { useEffect, useMemo, useState } from "react";
import { Bell, Pencil, Plus, Search, Settings, Trash2, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layout/AdminPage.jsx";
import {
  deleteBroadcast,
  getAdminNotifications,
  getBroadcastHistory,
  getNotificationTemplates,
  updateAdminNotification,
  updateBroadcast,
  updateNotificationTemplate,
} from "../../api/notificationApi.js";

const AUDIENCE_LABEL = {
  investor: "Investors",
  expert: "Experts",
  both: "Investors + Experts",
};

const TABS = [
  { key: "all", label: "All Notifications", icon: Users },
  { key: "templates", label: "Default Notifications", icon: Settings },
  { key: "broadcasts", label: "Admin Announcements", icon: Bell },
];

const audienceStyle = (audience) => {
  if (audience === "investor") return "bg-blue-100 text-blue-700";
  if (audience === "expert") return "bg-purple-100 text-purple-700";
  return "bg-green-100 text-green-700";
};

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EditNotificationModal({ target, saving, onClose, onSave }) {
  const [title, setTitle] = useState(target.title || "");
  const [message, setMessage] = useState(target.message || "");

  const heading = target.kind === "template"
    ? "Edit Default Notification"
    : target.kind === "broadcast"
      ? "Edit Admin Announcement"
      : "Edit Delivered Notification";

  const canSave = title.trim() && message.trim() && !saving;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
            {target.kind === "template" && (
              <p className="text-sm text-slate-500 mt-1">
                This wording will be used for future matching notifications.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <label className="text-xs font-bold text-slate-500 mb-1 block">TITLE</label>
        <input
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="text-xs font-bold text-slate-500 mb-1 block">MESSAGE</label>
        <textarea
          value={message}
          maxLength={500}
          rows={6}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <p className="text-xs text-slate-400 text-right mt-1">{message.length}/500</p>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-slate-600 font-semibold">
            Cancel
          </button>
          <button
            onClick={() => onSave({ title: title.trim(), message: message.trim() })}
            disabled={!canSave}
            className="px-5 py-2 rounded-lg bg-blue-600 disabled:bg-blue-300 text-white font-semibold"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [editTarget, setEditTarget] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchManagementData = async (searchKeyword = "") => {
    setLoading(true);
    try {
      const [allRes, templateRes, historyRes] = await Promise.all([
        getAdminNotifications(searchKeyword).catch(() => null),
        getNotificationTemplates().catch(() => null),
        getBroadcastHistory(searchKeyword).catch(() => null),
      ]);
      if (allRes?.success) setNotifications(allRes.notifications || []);
      if (templateRes?.success) setTemplates(templateRes.templates || []);
      if (historyRes?.success) setHistory(historyRes.broadcasts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminNotifications().catch(() => null),
      getNotificationTemplates().catch(() => null),
      getBroadcastHistory().catch(() => null),
    ]).then(([allRes, templateRes, historyRes]) => {
      if (cancelled) return;
      if (allRes?.success) setNotifications(allRes.notifications || []);
      if (templateRes?.success) setTemplates(templateRes.templates || []);
      if (historyRes?.success) setHistory(historyRes.broadcasts || []);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredNotifications = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesKeyword = !q || [item.recipient_name, item.recipient_email, item.title, item.message, item.type]
        .some((value) => String(value || "").toLowerCase().includes(q));
      const matchesType = typeFilter === "all" || String(item.type || "general") === typeFilter;
      return matchesKeyword && matchesType;
    });
  }, [notifications, keyword, typeFilter]);

  const filteredTemplates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return templates.filter((item) => {
      const matchesKeyword = !q || [item.label, item.title, item.message, item.audience]
        .some((value) => String(value || "").toLowerCase().includes(q));
      const matchesAudience = audienceFilter === "all" || item.audience === audienceFilter;
      return matchesKeyword && matchesAudience;
    });
  }, [templates, keyword, audienceFilter]);

  const filteredHistory = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return history.filter((item) => {
      const matchesKeyword = !q || [item.title, item.message, item.audience]
        .some((value) => String(value || "").toLowerCase().includes(q));
      const matchesAudience = audienceFilter === "all" || item.audience === audienceFilter;
      return matchesKeyword && matchesAudience;
    });
  }, [history, keyword, audienceFilter]);

  const notificationTypes = useMemo(() => (
    [...new Set(notifications.map((item) => String(item.type || "general")))].sort()
  ), [notifications]);

  const handleDeleteBroadcast = async (broadcastId) => {
    const confirmed = window.confirm(
      "Delete this announcement? It will be removed from every recipient's notifications too."
    );
    if (!confirmed) return;
    const res = await deleteBroadcast(broadcastId);
    if (res.success) {
      setHistory((prev) => prev.filter((item) => item.broadcast_id !== broadcastId));
      setNotifications((prev) => prev.filter((item) => item.broadcast_id !== broadcastId));
    } else {
      alert("Failed to delete notification");
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      let res;
      if (editTarget.kind === "template") {
        res = await updateNotificationTemplate(editTarget.template_id, payload);
      } else if (editTarget.kind === "broadcast") {
        res = await updateBroadcast(editTarget.broadcast_id, payload);
      } else {
        res = await updateAdminNotification(editTarget.notification_id, payload);
      }

      if (!res?.success) {
        alert(res?.detail || res?.message || "Failed to update notification");
        return;
      }
      setEditTarget(null);
      await fetchManagementData(keyword);
    } finally {
      setSavingEdit(false);
    }
  };

  const currentCount = activeTab === "all"
    ? filteredNotifications.length
    : activeTab === "templates"
      ? filteredTemplates.length
      : filteredHistory.length;

  return (
    <AdminLayout
      title="Notification Management"
      subtitle="Manage system notifications, default templates and admin announcements"
    >
      <div className="p-3">
        <div className="flex items-center justify-end mb-5">
          <button
            onClick={() => navigate("/adminpanel/notifications/send")}
            className="h-11 px-5 flex items-center gap-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            <Plus size={17} /> Send Notification
          </button>
        </div>

        <section className="bg-white rounded-lg p-5 mb-5">
          <div className="flex gap-2 flex-wrap mb-5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === key
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-slate-600 hover:bg-gray-50"}`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchManagementData(keyword);
                }}
                placeholder="Search notifications, recipients or notification types..."
                className="w-full h-11 border border-gray-300 rounded-lg pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {activeTab === "all" ? (
              <>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-11 min-w-40 border border-gray-300 rounded-lg px-3 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All types</option>
                  {notificationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </>
            ) : (
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                className="h-11 min-w-44 border border-gray-300 rounded-lg px-3 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All audiences</option>
                <option value="investor">Investors</option>
                <option value="expert">Experts</option>
                <option value="both">Investors + Experts</option>
              </select>
            )}
            <button
              onClick={() => fetchManagementData(keyword)}
              className="h-11 px-6 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Search
            </button>
            {(keyword || typeFilter !== "all" || audienceFilter !== "all") && (
              <button
                onClick={() => { setKeyword(""); setTypeFilter("all"); setAudienceFilter("all"); fetchManagementData(""); }}
                className="h-11 px-4 border border-gray-300 rounded-lg text-slate-600 font-semibold hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-4">
            {loading ? "Loading…" : `${currentCount} result${currentCount !== 1 ? "s" : ""}`}
          </p>
        </section>

        {activeTab === "all" && (
          <section className="bg-white rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-245">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Recipient</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Notification</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredNotifications.map((item) => (
                  <tr key={item.notification_id} className="border-b border-gray-100 align-top">
                    <td className="px-5 py-5">
                      <p className="font-semibold text-slate-800">{item.recipient_name || item.user_id}</p>
                      <p className="text-xs text-slate-500">{item.recipient_email || item.user_id}</p>
                    </td>
                    <td className="px-5 py-5">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold capitalize">
                        {item.type || "general"}
                      </span>
                    </td>
                    <td className="px-5 py-5 max-w-xl">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-500 mt-1 whitespace-pre-wrap">{item.message}</p>
                    </td>
                    <td className="px-5 py-5">
                      <span className={`text-xs font-semibold ${item.is_unread ? "text-blue-600" : "text-slate-400"}`}>
                        {item.is_unread ? "Unread" : "Read"}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-slate-600 whitespace-nowrap">{formatDate(item.created_at)}</td>
                    <td className="px-5 py-5">
                      <button
                        onClick={() => setEditTarget({ ...item, kind: "notification" })}
                        className="flex items-center gap-1 border border-blue-200 text-blue-600 px-3 py-1.5 rounded text-xs font-semibold"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredNotifications.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">No notifications found.</p>
            )}
          </section>
        )}

        {activeTab === "templates" && (
          <section className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-5 py-3 text-sm">
              Default notifications are stored in the database. Changes here apply to future users, including new-user welcome notifications.
            </div>
            {filteredTemplates.map((item) => (
              <div key={item.template_id} className="bg-white rounded-lg p-5 flex items-start justify-between gap-5 flex-wrap">
                <div className="flex gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shrink-0">
                    <Bell size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${audienceStyle(item.audience)}`}>
                        {AUDIENCE_LABEL[item.audience] || item.audience}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700 mt-3">{item.title}</p>
                    <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{item.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditTarget({ ...item, kind: "template" })}
                  className="flex items-center gap-1 border border-blue-200 text-blue-600 px-3 py-1.5 rounded text-xs font-semibold"
                >
                  <Pencil size={13} /> Edit
                </button>
              </div>
            ))}
            {!loading && filteredTemplates.length === 0 && (
              <div className="bg-white rounded-lg p-10 text-center text-slate-400">No default notifications found.</div>
            )}
          </section>
        )}

        {activeTab === "broadcasts" && (
          <section className="bg-white rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-220">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Notification</th>
                  <th className="px-5 py-4">Audience</th>
                  <th className="px-5 py-4">Recipients</th>
                  <th className="px-5 py-4">Sent</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredHistory.map((item) => (
                  <tr key={item.broadcast_id} className="border-b border-gray-100 align-top">
                    <td className="px-5 py-5 max-w-xl">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-500 mt-1 whitespace-pre-wrap">{item.message}</p>
                    </td>
                    <td className="px-5 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${audienceStyle(item.audience)}`}>
                        {AUDIENCE_LABEL[item.audience] || item.audience}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-slate-600">{item.recipient_count}</td>
                    <td className="px-5 py-5 text-slate-600 whitespace-nowrap">{formatDate(item.created_at)}</td>
                    <td className="px-5 py-5">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setEditTarget({ ...item, kind: "broadcast" })}
                          className="flex items-center gap-1 border border-blue-200 text-blue-600 px-3 py-1.5 rounded text-xs font-semibold"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBroadcast(item.broadcast_id)}
                          className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-semibold"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredHistory.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">No admin announcements found.</p>
            )}
          </section>
        )}
      </div>

      {editTarget && (
        <EditNotificationModal
          target={editTarget}
          saving={savingEdit}
          onClose={() => !savingEdit && setEditTarget(null)}
          onSave={handleSaveEdit}
        />
      )}
    </AdminLayout>
  );
}

export default NotificationManagementPage;
