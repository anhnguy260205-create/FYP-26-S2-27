import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Star,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  FileText,
  Trash2,
  CheckCheck,
  CheckCircle2,
  Bell,
} from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: "question",
    title: "New question submitted",
    message: "Sarah Chen submitted a new portfolio review question: Should I rebalance my NVDA-heavy portfolio?",
    time: "5 mins ago",
    unread: true,
    icon: MessageSquare,
  },
  {
    id: 2,
    type: "question",
    title: "Urgent question assigned",
    message: "Marcus Rivera marked his question on DBS entry price as High urgency.",
    time: "32 mins ago",
    unread: true,
    icon: AlertTriangle,
  },
  {
    id: 3,
    type: "review",
    title: "New review received",
    message: "Priya Nair left you a 5-star review: Excellent advice on retirement planning!",
    time: "2 hours ago",
    unread: true,
    icon: Star,
  },
  {
    id: 4,
    type: "subscriber",
    title: "New investor subscribed to your portfolio",
    message: "Jason Tan started following your investment portfolio.",
    time: "Yesterday",
    unread: false,
    icon: UserPlus,
  },
  {
    id: 5,
    type: "question",
    title: "Question marked as resolved",
    message: "Priya Nair closed her question on reducing portfolio volatility — no further action needed.",
    time: "Yesterday",
    unread: false,
    icon: CheckCircle,
  },
  {
    id: 6,
    type: "article",
    title: "Your article was published",
    message: "Admin approved and published your article: Top 5 Defensive Stocks for 2026.",
    time: "2 days ago",
    unread: false,
    icon: FileText,
  },
  {
    id: 7,
    type: "subscriber",
    title: "Investor unsubscribed from your portfolio",
    message: "A subscriber has removed your portfolio from their watchlist.",
    time: "3 days ago",
    unread: false,
    icon: UserPlus,
  },
];

const iconBg = {
  question: "rgba(21,93,252,0.12)",
  review: "rgba(234,179,8,0.12)",
  subscriber: "rgba(34,197,94,0.12)",
  article: "rgba(168,85,247,0.12)",
};

const iconColor = {
  question: "#60a5fa",
  review: "#facc15",
  subscriber: "#4ade80",
  article: "#c084fc",
};

function ExpertNotificationPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState("all");

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const markRead = (id) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );

  const deleteNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const filtered =
    filter === "all"
      ? notifications
      : filter === "unread"
      ? notifications.filter((n) => n.unread)
      : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "question", label: "Questions" },
    { key: "review", label: "Reviews" },
    { key: "subscriber", label: "Subscribers" },
    { key: "article", label: "Articles" },
  ];

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ConsultantHeader />

      <main className="flex-1 p-4 md:p-7 max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Bell size={26} color="#e2e8f0" />
              <h1
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#e2e8f0",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Notifications
              </h1>
            </div>
            <p style={{ marginTop: "6px", color: "rgba(255,255,255,0.45)" }}>
              Stay updated on new questions, reviews, and subscriber activity.
            </p>
          </div>

          <button
            onClick={markAllRead}
            className="flex items-center gap-2 font-medium"
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              background: "linear-gradient(90deg,#0092b8,#155dfc)",
              cursor: "pointer",
            }}
          >
            <CheckCheck size={16} />
            Mark All Read
          </button>
        </div>

        <div
          className="mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600 }}>
            {unreadCount} Unread Notification{unreadCount !== 1 ? "s" : ""}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
            Review new questions from investors and important activity on your account.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                background:
                  filter === key
                    ? "linear-gradient(90deg,#0092b8,#155dfc)"
                    : "rgba(255,255,255,0.06)",
                border:
                  filter === key
                    ? "none"
                    : "1px solid rgba(255,255,255,0.1)",
                color: filter === key ? "white" : "rgba(255,255,255,0.6)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "60px",
                textAlign: "center",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              No notifications here.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center"
                  style={{
                    padding: "20px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: item.unread
                      ? "rgba(21,93,252,0.06)"
                      : "transparent",
                  }}
                >
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        background: iconBg[item.type] ?? "rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        size={20}
                        color={iconColor[item.type] ?? "#94a3b8"}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 style={{ fontWeight: 600 }}>{item.title}</h3>
                        {item.unread && (
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "#3b82f6",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          marginTop: "4px",
                          color: "rgba(255,255,255,0.45)",
                          fontSize: "14px",
                          lineHeight: "1.5",
                        }}
                      >
                        {item.message}
                      </p>

                      <span
                        style={{
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {item.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 shrink-0">
                    {item.unread && (
                      <button
                        onClick={() => markRead(item.id)}
                        title="Mark as read"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.25)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <CheckCircle2 size={16} color="#22c55e" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(item.id)}
                      title="Delete"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}

export default ExpertNotificationPage;
