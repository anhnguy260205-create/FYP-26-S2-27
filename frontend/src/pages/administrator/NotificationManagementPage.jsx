import { useEffect, useState } from "react";
import { Send, Search, Bell, Trash2 } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { broadcastNotification, getBroadcastHistory, deleteBroadcast } from "../../api/notificationApi.js";

const AUDIENCES = [
  { key: "investor", label: "All Investors" },
  { key: "expert", label: "All Experts" },
  { key: "both", label: "Both" },
];

const AUDIENCE_LABEL = {
  investor: "Investors",
  expert: "Experts",
  both: "Investors + Experts",
};

const audienceStyle = (audience) => {
  if (audience === "investor") return "bg-blue-100 text-blue-700";
  if (audience === "expert") return "bg-purple-100 text-purple-700";
  return "bg-green-100 text-green-700";
};

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function NotificationManagementPage() {
  const [audience, setAudience] = useState("both");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const fetchHistory = async (searchKeyword = "") => {
    setHistoryLoading(true);
    try {
      const res = await getBroadcastHistory(searchKeyword);
      if (res.success) setHistory(res.broadcasts);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleDelete = async (broadcastId) => {
    const confirmed = window.confirm("Delete this notification? It will be removed from every recipient's notifications too.");
    if (!confirmed) return;
    const res = await deleteBroadcast(broadcastId);
    if (res.success) {
      setHistory((prev) => prev.filter((b) => b.broadcast_id !== broadcastId));
    } else {
      alert("Failed to delete notification");
    }
  };

  const canSend = title.trim() && message.trim() && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    try {
      const res = await broadcastNotification({ audience, title: title.trim(), message: message.trim() });
      if (res.success) {
        setResult({ ok: true, text: `Sent to ${res.count} user${res.count !== 1 ? "s" : ""}.` });
        setTitle("");
        setMessage("");
        fetchHistory(keyword);
      } else {
        setResult({ ok: false, text: res.detail || res.message || "Failed to send notification" });
      }
    } catch {
      setResult({ ok: false, text: "Failed to send notification" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Notification" subtitle="Send an announcement to investors, experts, or both">
      <div className="p-3">
        {/* Compose Box */}
        <section className="bg-white rounded-lg p-7 mb-5">
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-2 block">SEND TO</label>
            <div className="flex gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAudience(a.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    audience === a.key
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-slate-600"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8 mb-5">
            <div className="flex-1 max-w-147.5">
              <label className="text-xs font-bold text-slate-400 mb-1 block">TITLE</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight"
                className="w-full h-12 border border-gray-300 rounded-lg px-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">MESSAGE</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the announcement text..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            className="h-12 px-8 flex items-center gap-2 bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            <Send size={16} /> {sending ? "Sending..." : "Send Notification"}
          </button>

          {result && (
            <p className={`mt-4 text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>
              {result.text}
            </p>
          )}
        </section>

        {/* Sent Notifications */}
        <section className="bg-white rounded-lg p-7 mb-5">
          <div className="flex items-center gap-8">
            <div className="relative flex-1 max-w-147.5">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchHistory(keyword);
                }}
                placeholder="Search sent notifications..."
                className="w-full h-12 border border-gray-300 rounded-lg pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => fetchHistory(keyword)}
              className="h-12 px-8 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <p className="text-sm text-slate-600 mt-5">
            {historyLoading ? "Loading..." : `Found ${history.length} notification(s)`}
          </p>
        </section>

        <section className="bg-white rounded-lg overflow-hidden">
          <table className="w-full text-sm">
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
              {history.map((b) => (
                <tr key={b.broadcast_id} className="border-b border-gray-100">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shrink-0">
                        <Bell size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{b.title}</p>
                        <p className="text-slate-500 truncate max-w-md">{b.message}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold ${audienceStyle(b.audience)}`}>
                      {AUDIENCE_LABEL[b.audience] || b.audience}
                    </span>
                  </td>

                  <td className="px-5 py-5 text-slate-600">{b.recipient_count}</td>
                  <td className="px-5 py-5 text-slate-600">{formatDate(b.created_at)}</td>
                  <td className="px-5 py-5">
                    <Trash2
                      size={18}
                      onClick={() => handleDelete(b.broadcast_id)}
                      className="text-red-600 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!historyLoading && history.length === 0 && (
            <p className="text-center text-slate-400 py-10 text-sm">
              {keyword ? "No sent notifications match your search." : "No notifications sent yet."}
            </p>
          )}

          {history.length > 0 && (
            <div className="flex items-center justify-between px-7 py-5">
              <p className="text-sm text-slate-600">
                Showing 1 to {history.length} of {history.length} results
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default NotificationManagementPage;
