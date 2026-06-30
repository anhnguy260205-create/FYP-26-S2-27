import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";

import { useEffect } from "react";
import { useState } from "react";
import {
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    MessageSquare,
    CreditCard,
    Trash2,
    CheckCheck
} from "lucide-react";
function Notification() {
    const NOTIFICATIONS = [
        {
            id: 1,
            type: "stock",
            title: "AAPL reached your target price",
            message: "Apple Inc. has reached $200.00.",
            time: "5 mins ago",
            unread: true,
            icon: TrendingUp
        },
        {
            id: 2,
            type: "consultation",
            title: "Expert replied to your question",
            message: "Dr. Raymond responded to your consultation request.",
            time: "1 hour ago",
            unread: true,
            icon: MessageSquare
        },
        {
            id: 3,
            type: "subscription",
            title: "Premium subscription renewed",
            message: "Your Premium membership has been renewed successfully.",
            time: "Yesterday",
            unread: false,
            icon: CreditCard
        },
        {
            id: 4,
            type: "warning",
            title: "High volatility detected",
            message: "TSLA experienced unusual price fluctuations today.",
            time: "2 days ago",
            unread: false,
            icon: AlertTriangle
        }
    ];
    const [notifications, setNotifications] = useState(NOTIFICATIONS);

    const markAllRead = () => {
        setNotifications(prev =>
            prev.map(item => ({
                ...item,
                unread: false
            }))
        );
    };

    const deleteNotification = (id) => {
        setNotifications(prev =>
            prev.filter(item => item.id !== id)
        );
    };

    const unreadCount = notifications.filter(
        n => n.unread
    ).length;
    const navigate = useNavigate();
    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />
            <main className="flex-1 p-4 md:p-7">

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
                    {notifications.length === 0 ? (
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
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.id}
                                    className="flex justify-between items-center"
                                    style={{
                                        padding: "20px",
                                        borderBottom:
                                            "1px solid rgba(255,255,255,0.05)",
                                        background: item.unread
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

                                                {item.unread && (
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
                                                {item.time}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">

                                        <button
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
                                                deleteNotification(item.id)
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