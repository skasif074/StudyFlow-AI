"use client";
import { useState } from "react";
import { Bell, CheckCircle, Trash2, AlertTriangle, Clock, TrendingUp, BookOpen, Brain } from "lucide-react";
import { clsx } from "clsx";

type NotificationType =
  | "deadline_reminder"
  | "overdue_warning"
  | "exam_alert"
  | "productivity_warning"
  | "weekly_report"
  | "ai_study_plan"
  | "risk_prediction";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// Updated for premium dark mode colors
const typeConfig: Record<NotificationType, { icon: any; color: string }> = {
  deadline_reminder: { icon: Clock, color: "text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20" },
  overdue_warning: { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20" },
  exam_alert: { icon: BookOpen, color: "text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20" },
  productivity_warning: { icon: TrendingUp, color: "text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/20" },
  weekly_report: { icon: BarChartIcon, color: "text-violet-400 bg-violet-500/10 ring-1 ring-violet-500/20" },
  ai_study_plan: { icon: Brain, color: "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20" },
  risk_prediction: { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20" },
};

function BarChartIcon({ size }: { size: number }) {
  return <TrendingUp size={size} />;
}

const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "Deadline Reminder",
    message: "Math Homework is due in 2 days. Make sure to complete it on time.",
    notification_type: "deadline_reminder",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Overdue Warning",
    message: "Physics Lab Report was due yesterday and is now overdue.",
    notification_type: "overdue_warning",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    title: "AI Study Plan Ready",
    message: "Your personalized study plan for this week has been generated.",
    notification_type: "ai_study_plan",
    is_read: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Weekly Report",
    message: "You completed 9 assignments this week. Your productivity score is 28%.",
    notification_type: "weekly_report",
    is_read: true,
    created_at: new Date().toISOString(),
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Bell className="text-indigo-400" size={28} />
              Notifications
            </h2>
            <p className="text-slate-400 mt-2 text-sm font-medium">
              You have <span className={unreadCount > 0 ? "text-indigo-400 font-bold" : ""}>{unreadCount} unread</span> notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30 transition-all shadow-sm"
            >
              <CheckCircle size={16} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
              filter === "all"
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
              filter === "unread"
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            Unread 
            {unreadCount > 0 && (
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider",
                filter === "unread" ? "bg-white/20" : "bg-indigo-500/20 text-indigo-400"
              )}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-800 shadow-inner">
                <Bell size={28} className="text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">You're all caught up!</h3>
              <p className="text-slate-400">No {filter === "unread" ? "unread " : ""}notifications to display right now.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((notification) => {
              const config = typeConfig[notification.notification_type];
              const Icon = config.icon;
              return (
                <div
                  key={notification.id}
                  className={clsx(
                    "group relative border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300",
                    notification.is_read
                      ? "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700"
                      : "bg-slate-900/80 border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.05)] hover:shadow-[0_0_20px_rgba(79,70,229,0.1)]"
                  )}
                >
                  {/* Glowing unread indicator strip */}
                  {!notification.is_read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                  )}

                  <div className="flex items-start gap-4 flex-1">
                    <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm", config.color)}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className={clsx(
                          "font-bold text-base",
                          notification.is_read ? "text-slate-300" : "text-white"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
                            New
                          </span>
                        )}
                      </div>
                      <p className={clsx(
                        "text-sm leading-relaxed",
                        notification.is_read ? "text-slate-500" : "text-slate-400"
                      )}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <Clock size={12} className="text-slate-600" />
                        <p className="text-xs font-medium text-slate-500">
                          {new Date(notification.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 mt-2 sm:mt-0">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                        title="Mark as read"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Delete notification"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
