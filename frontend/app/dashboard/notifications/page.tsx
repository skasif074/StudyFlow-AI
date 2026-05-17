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

const typeConfig: Record<NotificationType, { icon: any; color: string }> = {
  deadline_reminder: { icon: Clock, color: "text-amber-600 bg-amber-50" },
  overdue_warning: { icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  exam_alert: { icon: BookOpen, color: "text-blue-600 bg-blue-50" },
  productivity_warning: { icon: TrendingUp, color: "text-orange-600 bg-orange-50" },
  weekly_report: { icon: BarChartIcon, color: "text-purple-600 bg-purple-50" },
  ai_study_plan: { icon: Brain, color: "text-green-600 bg-green-50" },
  risk_prediction: { icon: AlertTriangle, color: "text-red-600 bg-red-50" },
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
          <p className="text-slate-500 mt-1">
            You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 border border-gray-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <CheckCircle size={16} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            filter === "all"
              ? "bg-slate-900 text-white"
              : "border border-gray-200 text-slate-600 hover:bg-gray-50"
          )}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            filter === "unread"
              ? "bg-slate-900 text-white"
              : "border border-gray-200 text-slate-600 hover:bg-gray-50"
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Bell size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => {
            const config = typeConfig[notification.notification_type];
            const Icon = config.icon;
            return (
              <div
                key={notification.id}
                className={clsx(
                  "bg-white border rounded-xl p-5 flex items-start justify-between transition-colors",
                  notification.is_read
                    ? "border-gray-200"
                    : "border-slate-300 bg-slate-50"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", config.color)}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 text-sm">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(notification.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}