import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";

import { useEffect, useState } from "react";
import {
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    MessageSquare,
    CreditCard,
    Trash2,
    CheckCheck,
    Bell,
    BookOpen,
} from "lucide-react";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification as deleteNotificationApi,
} from "../../api/notificationApi.js";

const ICON_BY_TYPE = {
    stock: TrendingUp,
    consultation: MessageSquare,
    subscription: CreditCard,
    warning: AlertTriangle,
    article: BookOpen,
    moderation: AlertTriangle,
    announcement: Bell,
};

function timeAgo(isoString) {
    if (!isoString) return "";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(isoString).toLocaleDateString();
}

function Notification() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "null");
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.user_id) { setLoading(false); return; }
        getNotifications(currentUser.user_id)
            .then((res) => { if (res.success) setNotifications(res.notifications); })
            .finally(() => setLoading(false));
    }, [currentUser?.user_id]);

    const markAllRead = () => {
        setNotifications(prev => prev.map(item => ({ ...item, is_unread: false })));
        markAllNotificationsRead();
    };

    const markOneRead = (id) => {
        setNotifications(prev =>
            prev.map(item => item.notification_id === id ? { ...item, is_unread: false } : item)
        );
        markNotificationRead(id);
    };

    const deleteNotification = (id) => {
        setNotifications(prev => prev.filter(item => item.notification_id !== id));
        deleteNotificationApi(id);
    };

    const unreadCount = notifications.filter(
        n => n.is_unread
    ).length;
    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />
            <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px", boxSizing: "border-box" }}>

                {/* Header */}
                <div className="flex justify-between items-center mb-8">

                    <div>
                        <div className="flex items-center gap-3">

                            <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>

                                Notifications
                            </h1>
                        </div>

                        <p
                            style={{
                                marginTop: "6px",
                                color: "rgba(255,255,255,0.45)"
                            }}
                        >
                            Stay updated with market alerts and account activity.
                        </p>
                    </div>

                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-2"
                        style={{
                            padding: "10px 18px",
                            borderRadius: "10px",
                            background:
                                "linear-gradient(90deg,#0092b8,#155dfc)",
                            cursor: "pointer"
                        }}
                    >
                        <CheckCheck size={16} />
                        Mark All Read
                    </button>
                </div>

                {/* Summary Card */}
                <div
                    className="mb-6"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "18px",
                        padding: "20px"
                    }}
                >
                    <h3
                        style={{
                            fontSize: "18px",
                            fontWeight: 600
                        }}
                    >
                        {unreadCount} Unread Notification
                        {unreadCount !== 1 ? "s" : ""}
                    </h3>

                    <p
                        style={{
                            color: "rgba(255,255,255,0.4)",
                            marginTop: "4px"
                        }}
                    >
                        Review important updates from your investments and consultants.
                    </p>
                </div>

                {/* Notification List */}
                <div
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        overflow: "hidden"
                    }}
                >
                    {loading ? (
                        <div
                            style={{
                                padding: "50px",
                                textAlign: "center",
                                color: "rgba(255,255,255,0.4)"
                            }}
                        >
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div
                            style={{
                                padding: "50px",
                                textAlign: "center",
                                color: "rgba(255,255,255,0.4)"
                            }}
                        >
                            No notifications available.
                        </div>
                    ) : (
                        notifications.map((item) => {
                            const Icon = ICON_BY_TYPE[item.type] || Bell;

                            return (
                                <div
                                    key={item.notification_id}
                                    className="flex justify-between items-center"
                                    style={{
                                        padding: "20px",
                                        borderBottom:
                                            "1px solid rgba(255,255,255,0.05)",
                                        background: item.is_unread
                                            ? "rgba(21,93,252,0.06)"
                                            : "transparent"
                                    }}
                                >
                                    <div className="flex gap-4">

                                        <div
                                            style={{
                                                width: "46px",
                                                height: "46px",
                                                borderRadius: "12px",
                                                background:
                                                    "rgba(21,93,252,0.12)",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center"
                                            }}
                                        >
                                            <Icon
                                                size={20}
                                                color="#60a5fa"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3
                                                    style={{
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {item.title}
                                                </h3>

                                                {item.is_unread && (
                                                    <span
                                                        style={{
                                                            width: "8px",
                                                            height: "8px",
                                                            borderRadius: "50%",
                                                            background:
                                                                "#3b82f6"
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            <p
                                                style={{
                                                    marginTop: "4px",
                                                    color:
                                                        "rgba(255,255,255,0.45)",
                                                    fontSize: "14px"
                                                }}
                                            >
                                                {item.message}
                                            </p>

                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color:
                                                        "rgba(255,255,255,0.3)"
                                                }}
                                            >
                                                {timeAgo(item.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">

                                        <button
                                            onClick={() => markOneRead(item.notification_id)}
                                            style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "10px",
                                                background:
                                                    "rgba(34,197,94,0.12)",
                                                border:
                                                    "1px solid rgba(34,197,94,0.25)",
                                                cursor: "pointer",
                                                flexItems: "center",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <CheckCircle
                                                size={16}
                                                color="#22c55e"
                                            />
                                        </button>

                                        <button
                                            onClick={() =>
                                                deleteNotification(item.notification_id)
                                            }
                                            style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "10px",
                                                background:
                                                    "rgba(239,68,68,0.12)",
                                                border:
                                                    "1px solid rgba(239,68,68,0.25)",
                                                cursor: "pointer",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Trash2
                                                size={16}
                                                color="#ef4444"
                                            />
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
export default Notification;
