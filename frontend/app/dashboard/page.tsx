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
    low: "bg-green-50 text-green-700 border-green-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center">
          <Loader2 size={48} className="text-blue-500 mb-4 animate-spin" />
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Welcome back, {user?.firstName || "Student"} 👋
        </h2>
        <p className="text-sm sm:text-base text-slate-500">
          Here is your academic overview for today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105", stat.color)}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Upcoming Deadlines</h3>
            <Link href="/dashboard/assignments" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View all
            </Link>
          </div>
          <div className="p-5 sm:p-6 flex-1">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle size={40} className="text-green-400 mb-3" />
                <p className="text-slate-500 font-medium">No upcoming deadlines</p>
                <p className="text-slate-400 text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{assignment.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{assignment.course_name}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 shrink-0">
                      <span className={clsx("text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border", priorityColors[assignment.priority])}>
                        {assignment.priority}
                      </span>
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(assignment.due_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overdue Assignments */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Overdue Assignments</h3>
            <Link href="/dashboard/assignments" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View all
            </Link>
          </div>
          <div className="p-5 sm:p-6 flex-1">
            {overdue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle size={40} className="text-green-400 mb-3" />
                <p className="text-slate-500 font-medium">No overdue assignments</p>
                <p className="text-slate-400 text-sm mt-1">Great job staying on track!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdue.slice(0, 5).map((assignment, index) => (
                  <div key={`overdue-${assignment.id || index}`} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50/50 rounded-xl hover:bg-red-50 transition-colors border border-red-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700 truncate">{assignment.title}</p>
                      <p className="text-xs text-red-500/80 truncate mt-0.5">{assignment.course_name}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 shrink-0">
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                        Overdue
                      </span>
                      <p className="text-xs font-medium text-red-500">
                        {new Date(assignment.due_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Link
          href="/dashboard/planner"
          className="group bg-slate-900 rounded-2xl p-6 text-white shadow-md hover:bg-slate-800 hover:-translate-y-1 transition-all duration-200 flex flex-col h-full"
        >
          <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Brain size={24} className="text-white" />
          </div>
          <p className="font-semibold text-lg mb-1">AI Study Planner</p>
          <p className="text-sm text-slate-300 leading-relaxed">Generate your personalized 7-day study schedule</p>
        </Link>

        <Link
          href="/dashboard/assistant"
          className="group bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 flex flex-col h-full"
        >
          <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Bell size={24} className="text-blue-600" />
          </div>
          <p className="font-semibold text-slate-900 text-lg mb-1">AI Assistant</p>
          <p className="text-sm text-slate-500 leading-relaxed">Ask academic questions and get explanations</p>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="group bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 flex flex-col h-full"
        >
          <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <TrendingUp size={24} className="text-green-600" />
          </div>
          <p className="font-semibold text-slate-900 text-lg mb-1">Analytics</p>
          <p className="text-sm text-slate-500 leading-relaxed">Track your productivity and performance</p>
        </Link>

        <button
          onClick={classroomConnected ? syncClassroom : connectClassroom}
          disabled={syncing}
          className="group bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 flex flex-col text-left h-full disabled:opacity-70 disabled:pointer-events-none"
        >
          <div className="bg-amber-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform relative">
            <BookOpen size={24} className="text-amber-600" />
            {syncing && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Loader2 size={14} className="animate-spin text-blue-500" />
              </div>
            )}
          </div>
          <p className="font-semibold text-slate-900 text-lg mb-1 flex items-center gap-2">
            {classroomConnected ? "Sync Classroom" : "Connect Classroom"}
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            {classroomConnected
              ? "Sync your latest assignments from Google Classroom"
              : "Connect Google Classroom to auto-import assignments"}
          </p>
        </button>
      </div>
    </div>
  );
}
