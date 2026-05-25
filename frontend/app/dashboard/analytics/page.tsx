"use client";
import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, CheckCircle, AlertTriangle, Clock, BookOpen, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Summary {
  total_assignments: number;
  completed: number;
  pending: number;
  overdue: number;
  in_progress: number;
  productivity_score: number;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => sessionStorage.getItem("studyflow_token");

  useEffect(() => {
    const fetchSummary = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const stats = summary
    ? [
        {
          label: "Total Assignments",
          value: summary.total_assignments.toString(),
          icon: BookOpen,
          color: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
          hoverGlow: "hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:border-indigo-500/30",
        },
        {
          label: "Completed",
          value: summary.completed.toString(),
          icon: CheckCircle,
          color: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
          hoverGlow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30",
        },
        {
          label: "Overdue",
          value: summary.overdue.toString(),
          icon: AlertTriangle,
          color: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
          hoverGlow: "hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-500/30",
        },
        {
          label: "Productivity Score",
          value: `${summary.productivity_score}%`,
          icon: TrendingUp,
          color: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
          hoverGlow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:border-violet-500/30",
        },
      ]
    : [];

  const pieData = summary
    ? [
        { name: "Completed", value: summary.completed, color: "#34d399" }, // emerald-400
        { name: "Pending", value: summary.pending, color: "#fbbf24" }, // amber-400
        { name: "Overdue", value: summary.overdue, color: "#fb7185" }, // rose-400
        { name: "In Progress", value: summary.in_progress, color: "#818cf8" }, // indigo-400
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-950">
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center shadow-2xl">
          <Loader2 size={40} className="text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium tracking-wide">Compiling analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 text-slate-200 selection:bg-indigo-500/30">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Performance{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Analytics
          </span>
        </h2>
        <p className="text-slate-400 mt-2 text-lg">
          Track your academic productivity and monitor real-time progress.
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={clsx(
                  "group bg-slate-900 rounded-2xl border border-slate-800 p-6 transition-all duration-300 transform hover:-translate-y-1 cursor-default",
                  stat.hoverGlow
                )}
              >
                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 ring-1 transition-transform group-hover:scale-110", stat.color)}>
                  <Icon size={24} />
                </div>
                <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Charts & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pie Chart Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-2 mb-8">
              <BarChart2 size={20} className="text-indigo-400" />
              <h3 className="text-xl font-semibold text-white tracking-wide">Status Distribution</h3>
            </div>

            {summary && summary.total_assignments > 0 ? (
              <div className="relative z-10">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        borderColor: '#1e293b', 
                        borderRadius: '12px',
                        backdropFilter: 'blur(8px)',
                        color: '#f8fafc',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                      }}
                      itemStyle={{ color: '#cbd5e1', fontWeight: 500 }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      wrapperStyle={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700/50">
                  <BarChart2 size={24} className="text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium">No data available</p>
                <p className="text-slate-500 text-sm mt-1">Assignments will appear here once added.</p>
              </div>
            )}
          </div>

          {/* Breakdown List Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-6 tracking-wide">Detailed Summary</h3>
            <div className="space-y-4">
              
              <div className="group flex items-center justify-between p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl hover:bg-emerald-950/40 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <span className="text-sm font-medium text-emerald-100">Completed</span>
                </div>
                <span className="text-xl font-bold text-emerald-400">{summary?.completed || 0}</span>
              </div>

              <div className="group flex items-center justify-between p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl hover:bg-amber-950/40 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
                  <span className="text-sm font-medium text-amber-100">Pending</span>
                </div>
                <span className="text-xl font-bold text-amber-400">{summary?.pending || 0}</span>
              </div>

              <div className="group flex items-center justify-between p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl hover:bg-indigo-950/40 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                  <span className="text-sm font-medium text-indigo-100">In Progress</span>
                </div>
                <span className="text-xl font-bold text-indigo-400">{summary?.in_progress || 0}</span>
              </div>

              <div className="group flex items-center justify-between p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl hover:bg-rose-950/40 hover:border-rose-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"></div>
                  <span className="text-sm font-medium text-rose-100">Overdue</span>
                </div>
                <span className="text-xl font-bold text-rose-400">{summary?.overdue || 0}</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
