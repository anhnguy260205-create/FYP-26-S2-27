import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layout/AdminPage.jsx";
import { broadcastNotification } from "../../api/notificationApi.js";

const AUDIENCES = [
  { key: "investor", label: "All Investors" },
  { key: "expert", label: "All Experts" },
  { key: "both", label: "Both" },
];

function SendNotificationPage() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState("both");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const canSend = title.trim() && message.trim() && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);

    try {
      const response = await broadcastNotification({
        audience,
        title: title.trim(),
        message: message.trim(),
      });

      if (response.success) {
        setResult({
          ok: true,
          text: `Sent to ${response.count} user${response.count !== 1 ? "s" : ""}.`,
        });
        setTitle("");
        setMessage("");
      } else {
        setResult({
          ok: false,
          text: response.detail || response.message || "Failed to send notification",
        });
      }
    } catch {
      setResult({ ok: false, text: "Failed to send notification" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout
      title="Send Notification"
      subtitle="Create and send an announcement to investors or experts"
    >
      <div className="p-3">
        <button
          onClick={() => navigate("/adminpanel/notifications")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
        >
          <ArrowLeft size={17} /> Back to Notification Management
        </button>

        <section className="bg-white rounded-lg p-7 max-w-4xl">
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-2 block">SEND TO</label>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAudience(item.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${audience === item.key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-slate-600"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">TITLE</label>
            <input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Scheduled maintenance tonight"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-2">
            <label className="text-xs font-bold text-slate-400 mb-1 block">MESSAGE</label>
            <textarea
              value={message}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the announcement text..."
              rows={7}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <p className="text-xs text-slate-400 text-right mt-1">{message.length}/500</p>
          </div>

          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="h-12 px-8 flex items-center gap-2 bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              <Send size={16} /> {sending ? "Sending..." : "Send Notification"}
            </button>
            <button
              onClick={() => navigate("/adminpanel/notifications")}
              className="h-12 px-6 border border-gray-300 text-slate-600 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {result && (
            <div className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${result.ok
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"}`}
            >
              {result.text}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default SendNotificationPage;
