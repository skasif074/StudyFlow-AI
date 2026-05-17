"use client";
import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, CheckCircle, AlertTriangle, Clock, BookOpen, Loader2 } from "lucide-react";
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
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Completed",
          value: summary.completed.toString(),
          icon: CheckCircle,
          color: "bg-green-50 text-green-600",
        },
        {
          label: "Overdue",
          value: summary.overdue.toString(),
          icon: AlertTriangle,
          color: "bg-red-50 text-red-600",
        },
        {
          label: "Productivity Score",
          value: `${summary.productivity_score}%`,
          icon: TrendingUp,
          color: "bg-purple-50 text-purple-600",
        },
      ]
    : [];

  const pieData = summary
    ? [
        { name: "Completed", value: summary.completed, color: "#22c55e" },
        { name: "Pending", value: summary.pending, color: "#f59e0b" },
        { name: "Overdue", value: summary.overdue, color: "#ef4444" },
        { name: "In Progress", value: summary.in_progress, color: "#3b82f6" },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto text-slate-300 mb-4 animate-spin" />
          <p className="text-slate-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
        <p className="text-slate-500 mt-1">Track your academic productivity and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${stat.color}`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Assignment Status</h3>
          {summary && summary.total_assignments > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-slate-400 text-sm">No assignments yet</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Completed</span>
              <span className="text-lg font-bold text-green-700">{summary?.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-amber-700">Pending</span>
              <span className="text-lg font-bold text-amber-700">{summary?.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">In Progress</span>
              <span className="text-lg font-bold text-blue-700">{summary?.in_progress || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-700">Overdue</span>
              <span className="text-lg font-bold text-red-700">{summary?.overdue || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}