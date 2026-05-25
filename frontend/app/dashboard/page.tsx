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
      color: "bg-indigo-50 text-indigo-600 ring-indigo-100",
      href: "/dashboard/assignments",
    },
    {
      label: "Due This Week",
      value: upcoming?.length ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-600 ring-amber-100",
      href: "/dashboard/assignments",
    },
    {
      label: "Overdue",
      value: summary?.overdue ?? 0,
      icon: AlertTriangle,
      color: "bg-rose-50 text-rose-600 ring-rose-100",
      href: "/dashboard/assignments",
    },
    {
      label: "Productivity Score",
      value: `${summary?.productivity_score ?? 0}%`,
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      href: "/dashboard/analytics",
    },
  ];

  const priorityStyles: Record<string, string> = {
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    urgent: "bg-rose-50 text-rose-700 border-rose-200",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Loader2 size={40} className="text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {user?.firstName || "Student"}
            </span> 👋
          </h2>
          <p className="text-slate-500 mt-2 text-lg">
            Here is your academic overview for today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 ring-1 transition-transform group-hover:scale-110", stat.color)}>
                  <Icon size={24} />
                </div>
                <p className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-slate-500 mt-1">{stat.label}</p>
              </Link>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Clock size={20} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800">Upcoming Deadlines</h3>
              </div>
              <Link href="/dashboard/assignments" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                View all →
              </Link>
            </div>
            
            {upcoming.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <p className="text-slate-800 font-medium">You're all caught up!</p>
                <p className="text-slate-500 text-sm mt-1">No upcoming deadlines at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{assignment.title}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">{assignment.course_name}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={clsx("text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border", priorityStyles[assignment.priority])}>
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

          {/* Overdue Assignments */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <AlertTriangle size={20} className="text-rose-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800">Needs Attention</h3>
              </div>
              <Link href="/dashboard/assignments" className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors">
                View all →
              </Link>
            </div>
            
            {overdue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-800 font-medium">Clean slate!</p>
                <p className="text-slate-500 text-sm mt-1">You have no overdue assignments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdue.slice(0, 5).map((assignment, index) => (
                  <div key={`overdue-${assignment.id || index}`} className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/80 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-rose-900">{assignment.title}</p>
                      <p className="text-xs font-medium text-rose-600/70 mt-1">{assignment.course_name}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        Overdue
                      </span>
                      <p className="text-xs font-semibold text-rose-500">
                        {new Date(assignment.due_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard/planner"
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-900 rounded-2xl p-6 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <Brain size={80} />
            </div>
            <Brain size={28} className="mb-4 text-indigo-300" />
            <p className="text-lg font-bold mb-1">AI Study Planner</p>
            <p className="text-sm text-indigo-200/80 font-medium">Generate your personalized 7-day schedule</p>
          </Link>

          <Link
            href="/dashboard/assistant"
            className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Bell size={24} className="text-blue-600" />
            </div>
            <p className="text-lg font-bold text-slate-800 mb-1">AI Assistant</p>
            <p className="text-sm font-medium text-slate-500">Ask academic questions & get explanations</p>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
              <TrendingUp size={24} className="text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-800 mb-1">Analytics</p>
            <p className="text-sm font-medium text-slate-500">Track your productivity and performance</p>
          </Link>

          <button
            onClick={classroomConnected ? syncClassroom : connectClassroom}
            disabled={syncing}
            className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1 text-left w-full disabled:opacity-70 disabled:hover:transform-none disabled:hover:shadow-sm"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors relative">
              <BookOpen size={24} className={classroomConnected ? "text-emerald-600" : "text-slate-600 group-hover:text-indigo-600"} />
              {syncing && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                </div>
              )}
            </div>
            <p className="text-lg font-bold text-slate-800 mb-1">
              {classroomConnected ? "Sync Classroom" : "Connect Classroom"}
            </p>
            <p className="text-sm font-medium text-slate-500">
              {classroomConnected
                ? "Pull your latest assignments from Google"
                : "Auto-import assignments from Google"}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
