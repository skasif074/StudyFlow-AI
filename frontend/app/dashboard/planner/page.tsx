"use client";
import { useState, useEffect } from "react";
import { Brain, AlertTriangle, Clock, Loader2, BookOpen, MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

interface Session {
  time: string;
  subject: string;
  task: string;
  priority: string;
  duration_minutes: number;
}

interface DayPlan {
  day: string;
  date: string;
  sessions: Session[];
}

interface StudyPlan {
  study_plan: DayPlan[];
  recommendations: string[];
  risk_alerts: string[];
  message?: string;
  expires_at?: string;
  saved?: boolean;
}

const priorityColors: Record<string, string> = {
  high: "border-l-red-500 bg-red-50",
  medium: "border-l-amber-500 bg-amber-50",
  low: "border-l-green-500 bg-green-50",
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const getToken = () => sessionStorage.getItem("studyflow_token");

export default function PlannerPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadSavedPlan();
  }, []);

  const loadSavedPlan = async () => {
    const token = getToken();
    if (!token) {
      setLoadingSaved(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/planner/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.study_plan) {
        setPlan(data);
      }
    } catch (error) {
      console.error("Failed to load saved plan:", error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        setError("Not authenticated. Please go to dashboard first.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/planner/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setPlan(data);
      setActiveDay(0);
    } catch (err: any) {
      console.error("Failed to generate plan:", err);
      setError(err.message || "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const handleAskAssistant = (task: string, subject: string) => {
    const query = encodeURIComponent(`Help me with: ${subject} — ${task}`);
    router.push(`/dashboard/assistant?q=${query}`);
  };

  const getTotalHours = (sessions: Session[]) => {
    return sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / 60;
  };

  if (loadingSaved) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto text-slate-300 mb-4 animate-spin" />
          <p className="text-slate-500">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">AI Study Planner</h2>
          <p className="text-slate-500 mt-1">Your personalized 7-day study schedule powered by AI</p>
          {plan?.expires_at && (
            <p className="text-xs text-slate-400 mt-1">
              Plan saved · expires {new Date(plan.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={generatePlan}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
          {loading ? "Generating..." : plan ? "Regenerate Plan" : "Generate 7-Day Plan"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 mt-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!plan && !loading && !error && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center mt-8">
          <Brain size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-600 font-medium mb-2">No study plan yet</p>
          <p className="text-slate-400 text-sm mb-6">
            Click Generate 7-Day Plan to create your personalized weekly schedule
          </p>
          <button
            onClick={generatePlan}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Brain size={16} />
            Generate My Study Plan
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center mt-8">
          <Loader2 size={48} className="mx-auto text-slate-300 mb-4 animate-spin" />
          <p className="text-slate-600 font-medium">AI is creating your 7-day study plan...</p>
          <p className="text-slate-400 text-sm mt-2">
            Analyzing your assignments, deadlines and priorities
          </p>
        </div>
      )}

      {plan && !loading && (
        <div className="space-y-6 mt-6">
          {plan.risk_alerts?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-red-700">Risk Alerts</p>
              </div>
              <div className="space-y-1">
                {plan.risk_alerts.map((alert, i) => (
                  <p key={i} className="text-sm text-red-600 ml-6">• {alert}</p>
                ))}
              </div>
            </div>
          )}

          {plan.recommendations?.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-700">AI Recommendations</p>
              </div>
              <div className="space-y-1">
                {plan.recommendations.map((rec, i) => (
                  <p key={i} className="text-sm text-blue-600 ml-6">• {rec}</p>
                ))}
              </div>
            </div>
          )}

          {plan.study_plan?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex overflow-x-auto border-b border-gray-200">
                {plan.study_plan.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={clsx(
                      "flex-shrink-0 px-5 py-4 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0",
                      activeDay === i
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <p>{day.day}</p>
                    <p className={clsx(
                      "text-xs mt-0.5",
                      activeDay === i ? "text-slate-300" : "text-slate-400"
                    )}>
                      {day.sessions?.length || 0} sessions
                    </p>
                  </button>
                ))}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {plan.study_plan[activeDay]?.day}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {plan.study_plan[activeDay]?.date} •{" "}
                      {getTotalHours(plan.study_plan[activeDay]?.sessions || []).toFixed(1)} hours planned
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <BookOpen size={14} />
                    {plan.study_plan[activeDay]?.sessions?.length || 0} study sessions
                  </div>
                </div>

                {plan.study_plan[activeDay]?.sessions?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Rest day — no sessions planned</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plan.study_plan[activeDay]?.sessions?.map((session, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "border-l-4 rounded-r-xl p-5",
                          priorityColors[session.priority] || "border-l-slate-300 bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="font-semibold text-slate-800">{session.subject}</p>
                              <span className={clsx(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                priorityBadge[session.priority] || "bg-slate-100 text-slate-600"
                              )}>
                                {session.priority} priority
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-3">{session.task}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {session.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <Brain size={12} />
                                {session.duration_minutes} minutes
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAskAssistant(session.task, session.subject)}
                            className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
                          >
                            <MessageCircle size={12} />
                            Ask AI
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {plan.message && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-slate-500">{plan.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}