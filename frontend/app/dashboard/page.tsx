"use client";
import { useUser } from "@clerk/nextjs";
import { clsx } from "clsx";
import { BookOpen, Clock, AlertTriangle, TrendingUp, Brain, Bell, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const getToken = () => sessionStorage.getItem("studyflow_token");

interface Summary {
  total_assignments: number;
  completed: number;
  pending: number;
  overdue: number;
  in_progress: number;
  productivity_score: number;
}

interface Assignment {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  priority: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<Assignment[]>([]);
  const [overdue, setOverdue] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [classroomConnected, setClassroomConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("classroom") === "connected") {
      setClassroomConnected(true);
    }

    const timer = setTimeout(() => {
      fetchData();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
  const token = getToken();
  if (!token) {
    setLoading(false);
    return;
  }

  try {
    const [summaryRes, upcomingRes, overdueRes, classroomRes] = await Promise.all([
      fetch(`${API_URL}/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/analytics/upcoming-deadlines`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/analytics/overdue`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/classroom/status`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const summaryData = await summaryRes.json();
    const upcomingData = await upcomingRes.json();
    const overdueData = await overdueRes.json();
    const classroomData = await classroomRes.json();

    setSummary(summaryData);
    setUpcoming(upcomingData);
    setOverdue(overdueData);
    setClassroomConnected(classroomData.connected);
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
  } finally {
    setLoading(false);
  }
};

  const connectClassroom = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/classroom/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (error) {
      console.error("Failed to connect classroom:", error);
    }
  };

  const syncClassroom = async () => {
    const token = getToken();
    if (!token) return;
    setSyncing(true);
    try {
      const response = await fetch(`${API_URL}/classroom/sync`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.total > 0) {
        alert(`Synced ${data.total} assignments from Google Classroom!`);
        fetchData();
      } else {
        alert("No new assignments found in Google Classroom.");
      }
    } catch (error) {
      console.error("Failed to sync classroom:", error);
    } finally {
      setSyncing(false);
    }
  };

  const stats = [
    {
      label: "Total Assignments",
      value: summary?.total_assignments ?? 0,
      icon: BookOpen,
      color: "bg-blue-50 text-blue-600",
      href: "/dashboard/assignments",
    },
    {
      label: "Due This Week",
      value: upcoming?.length ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      href: "/dashboard/assignments",
    },
    {
      label: "Overdue",
      value: summary?.overdue ?? 0,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      href: "/dashboard/assignments",
    },
    {
      label: "Productivity Score",
      value: `${summary?.productivity_score ?? 0}%`,
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
      href: "/dashboard/analytics",
    },
  ];

  const priorityColors: Record<string, string> = {
    low: "bg-green-50 text-green-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto text-slate-300 mb-4 animate-spin" />
          <p className="text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          Welcome back, {user?.firstName || "Student"} 👋
        </h2>
        <p className="text-slate-500 mt-1">
          Here is your academic overview for today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center mb-4", stat.color)}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Upcoming Deadlines</h3>
            <Link href="/dashboard/assignments" className="text-sm text-slate-500 hover:text-slate-700">
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="mx-auto text-green-300 mb-2" />
              <p className="text-slate-400 text-sm">No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{assignment.title}</p>
                    <p className="text-xs text-slate-400">{assignment.course_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[assignment.priority])}>
                      {assignment.priority}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(assignment.due_date).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Overdue Assignments</h3>
            <Link href="/dashboard/assignments" className="text-sm text-slate-500 hover:text-slate-700">
              View all
            </Link>
          </div>
          {overdue.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="mx-auto text-green-300 mb-2" />
              <p className="text-slate-400 text-sm">No overdue assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdue.slice(0, 5).map((assignment, index) => (
                  <div key={`overdue-${assignment.id || index}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-700">{assignment.title}</p>
                    <p className="text-xs text-red-400">{assignment.course_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                      overdue
                    </span>
                    <p className="text-xs text-red-400 mt-1">
                      {new Date(assignment.due_date).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Link
          href="/dashboard/planner"
          className="bg-slate-900 rounded-xl p-6 text-white hover:bg-slate-800 transition-colors"
        >
          <Brain size={24} className="mb-3" />
          <p className="font-semibold mb-1">AI Study Planner</p>
          <p className="text-sm text-slate-400">Generate your personalized 7-day study schedule</p>
        </Link>

        <Link
          href="/dashboard/assistant"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <Bell size={24} className="mb-3 text-blue-600" />
          <p className="font-semibold text-slate-800 mb-1">AI Assistant</p>
          <p className="text-sm text-slate-500">Ask academic questions and get explanations</p>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <TrendingUp size={24} className="mb-3 text-green-600" />
          <p className="font-semibold text-slate-800 mb-1">Analytics</p>
          <p className="text-sm text-slate-500">Track your productivity and performance</p>
        </Link>

        <button
          onClick={classroomConnected ? syncClassroom : connectClassroom}
          disabled={syncing}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow text-left w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={24} className="text-green-600" />
            {syncing && <Loader2 size={14} className="animate-spin text-slate-400" />}
          </div>
          <p className="font-semibold text-slate-800 mb-1">
            {classroomConnected ? "Sync Classroom" : "Connect Classroom"}
          </p>
          <p className="text-sm text-slate-500">
            {classroomConnected
              ? "Sync your latest assignments from Google Classroom"
              : "Connect Google Classroom to auto-import assignments"}
          </p>
        </button>
      </div>
    </div>
  );
}
