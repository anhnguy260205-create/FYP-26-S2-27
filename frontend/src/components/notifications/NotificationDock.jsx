import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
    BellRing, X, CheckCheck, CheckCircle2, Trash2,
    TrendingUp, MessageSquare, CreditCard, AlertTriangle, BookOpen, Star, UserPlus, BadgeCheck, Bell,
} from "lucide-react";
import {
    getNotifications, markNotificationRead, markAllNotificationsRead,
    deleteNotification as deleteNotificationApi,
} from "../../api/notificationApi.js";

/*
 * NotificationDock — dropdown notification panel, styled to match ChatDock's
 * messenger panel (same dark Facebook-style surface + anchored-trigger badge
 * pattern) so notifications and messages feel like one system.
 *
 * Mounted once per header (GeneralHeader / ExpertHeader). Trigger icon calls
 * ref.toggleOpen(rect) on click, same API shape as ChatDock.
 */

const PANEL_BG = "#242526";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const HOVER_BG = "#3a3b3c";
const ACCENT = "#0084ff";
const TEXT_PRIMARY = "#e4e6eb";
const TEXT_SECONDARY = "#b0b3b8";

const ICON_BY_TYPE = {
    stock: TrendingUp,
    consultation: MessageSquare,
    subscription: CreditCard,
    subscriber: UserPlus,
    warning: AlertTriangle,
    moderation: AlertTriangle,
    article: BookOpen,
    review: Star,
    verification: BadgeCheck,
    announcement: Bell,
};

function timeAgo(iso) {
    if (!iso) return "";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function NotificationRow({ item, onRead, onDelete }) {
    const Icon = ICON_BY_TYPE[item.type] || Bell;
    return (
        <div style={{
            display: "flex", gap: 10, padding: "10px 14px", alignItems: "flex-start",
            background: item.is_unread ? "rgba(0,132,255,0.08)" : "transparent",
        }}>
            <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: HOVER_BG,
            }}>
                <Icon size={16} color={ACCENT} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: item.is_unread ? 700 : 500 }}>
                        {item.title}
                    </span>
                    {item.is_unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />}
                </div>
                <div style={{ color: TEXT_SECONDARY, fontSize: 12.5, marginTop: 2, lineHeight: 1.4, wordBreak: "break-word" }}>
                    {item.message}
                </div>
                <div style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 4 }}>{timeAgo(item.created_at)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                {item.is_unread && (
                    <button onClick={() => onRead(item.notification_id)} title="Mark as read"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", padding: 3 }}>
                        <CheckCircle2 size={14} />
                    </button>
                )}
                <button onClick={() => onDelete(item.notification_id)} title="Delete"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 3 }}>
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

const NotificationDock = forwardRef(function NotificationDock({ onUnreadChange }, ref) {
    const me = (() => {
        try {
            return JSON.parse(sessionStorage.getItem("currentUser") ||
                localStorage.getItem("currentUser") || "{}");
        } catch { return {}; }
    })();

    const [open, setOpen] = useState(false);
    const [anchorRect, setAnchorRect] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);

    const refresh = useCallback(async () => {
        if (!me?.user_id) return;
        setLoading(true);
        try {
            const res = await getNotifications(me.user_id);
            if (res.success) setNotifications(res.notifications || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [me?.user_id]);

    useEffect(() => { refresh(); }, [refresh]);

    const unreadCount = notifications.filter(n => n.is_unread).length;
    useEffect(() => { onUnreadChange?.(unreadCount); }, [unreadCount, onUnreadChange]);

    useImperativeHandle(ref, () => ({
        toggleOpen: (rect) => {
            if (rect) setAnchorRect(rect);
            setOpen((o) => {
                const next = !o;
                if (next) refresh();
                return next;
            });
        },
    }));

    // Close on any click outside the panel (except the nav-bar trigger icon)
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current?.contains(e.target)) return;
            if (e.target.closest?.("[data-notification-trigger]")) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_unread: false })));
        try { await markAllNotificationsRead(); } catch { /* ignore */ }
    };
    const markOneRead = async (id) => {
        setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_unread: false } : n));
        try { await markNotificationRead(id); } catch { /* ignore */ }
    };
    const remove = async (id) => {
        setNotifications(prev => prev.filter(n => n.notification_id !== id));
        try { await deleteNotificationApi(id); } catch { /* ignore */ }
    };

    if (!me?.user_id) return null;

    // Panel drops just below the trigger icon, mirroring ChatDock's positioning.
    const panelWrapperStyle = anchorRect
        ? {
            position: "fixed",
            top: anchorRect.bottom + 10,
            right: Math.max(12, window.innerWidth - anchorRect.right),
            zIndex: 60,
        }
        : { position: "fixed", top: 70, right: 20, zIndex: 60 };

    if (!open) return null;

    return (
        <div style={panelWrapperStyle} ref={panelRef}>
            <div style={{
                width: 360, height: "min(560px, calc(100vh - 96px))", maxHeight: 560,
                borderRadius: 16, overflow: "hidden",
                background: PANEL_BG, border: BORDER,
                boxShadow: "0 12px 28px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column",
            }}>
                <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 800, fontSize: 18, color: TEXT_PRIMARY }}>Notifications</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead}
                                style={{
                                    background: "none", border: "none", cursor: "pointer", color: ACCENT,
                                    fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                                }}>
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                        <button onClick={() => setOpen(false)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_SECONDARY, padding: 2 }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", borderTop: BORDER }}>
                    {loading ? (
                        <div style={{ textAlign: "center", color: TEXT_SECONDARY, fontSize: 13, padding: "40px 20px" }}>
                            Loading…
                        </div>
                    ) : notifications.length === 0 ? (
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            gap: 8, color: TEXT_SECONDARY, fontSize: 13, padding: "50px 20px", textAlign: "center",
                        }}>
                            <BellRing size={28} style={{ opacity: 0.35 }} />
                            No notifications yet.
                        </div>
                    ) : (
                        notifications.map(item => (
                            <NotificationRow key={item.notification_id} item={item} onRead={markOneRead} onDelete={remove} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
});

export default NotificationDock;
