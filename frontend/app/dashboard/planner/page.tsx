"use client";
import { useState, useEffect } from "react";
import { Brain, AlertTriangle, Clock, Loader2, BookOpen, MessageCircle, Sparkles } from "lucide-react";
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

// Updated for premium dark mode
const priorityColors: Record<string, string> = {
  high: "border-l-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border-t-transparent border-r-transparent border-b-transparent border-y-slate-800 border-r-slate-800",
  medium: "border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border-t-transparent border-r-transparent border-b-transparent border-y-slate-800 border-r-slate-800",
  low: "border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border-t-transparent border-r-transparent border-b-transparent border-y-slate-800 border-r-slate-800",
};

const priorityBadge: Record<string, string> = {
  high: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-950">
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center shadow-2xl">
          <Loader2 size={40} className="text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium tracking-wide">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Brain className="text-indigo-400" size={32} />
              AI Study <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Planner</span>
            </h2>
            <p className="text-slate-400 mt-2 text-sm md:text-base">Your personalized 7-day schedule, perfectly optimized by AI.</p>
            {plan?.expires_at && (
              <p className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1.5 bg-slate-900 w-fit px-2.5 py-1 rounded-md border border-slate-800">
                <Clock size={12} className="text-indigo-400" />
                Plan valid until {new Date(plan.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
          <button
            onClick={generatePlan}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generating..." : plan ? "Regenerate Plan" : "Generate 7-Day Plan"}
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-8 flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-rose-300">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!plan && !loading && !error && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center mt-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
                <Brain size={36} className="text-indigo-400/50" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No study plan yet</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Click generate to let AI analyze your upcoming assignments, priorities, and deadlines to craft the perfect weekly schedule.
              </p>
              <button
                onClick={generatePlan}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles size={18} />
                Generate My Study Plan
              </button>
            </div>
          </div>
        )}

        {/* Generating Loading State */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center mt-8 relative overflow-hidden shadow-2xl">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full pointer-events-none animate-pulse"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner relative">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping"></div>
                <Loader2 size={36} className="text-indigo-400 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Architecting your schedule...</h3>
              <p className="text-slate-400 text-sm">
                Analyzing your assignments, balancing priorities, and preventing burnout.
              </p>
            </div>
          </div>
        )}

        {/* Loaded Plan UI */}
        {plan && !loading && (
          <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Alerts & Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plan.risk_alerts?.length > 0 && (
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 bg-rose-500/10 rounded-lg">
                      <AlertTriangle size={18} className="text-rose-400" />
                    </div>
                    <p className="text-base font-bold text-rose-300">Risk Alerts</p>
                  </div>
                  <div className="space-y-2.5">
                    {plan.risk_alerts.map((alert, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-rose-200/80">
                        <span className="text-rose-500 mt-1.5">•</span>
                        <p leading-relaxed>{alert}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.recommendations?.length > 0 && (
                <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <Brain size={18} className="text-indigo-400" />
                    </div>
                    <p className="text-base font-bold text-indigo-300">AI Insights</p>
                  </div>
                  <div className="space-y-2.5">
                    {plan.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-indigo-200/80">
                        <span className="text-indigo-500 mt-1.5">•</span>
                        <p leading-relaxed>{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Schedule Viewer */}
            {plan.study_plan?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] pointer-events-none"></div>

                {/* Day Navigation Pills */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                    {plan.study_plan.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveDay(i)}
                        className={clsx(
                          "flex-shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex flex-col items-start min-w-[120px]",
                          activeDay === i
                            ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] scale-100"
                            : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-700 scale-95 origin-bottom"
                        )}
                      >
                        <p>{day.day.substring(0, 3)}</p>
                        <p className={clsx(
                          "text-[11px] mt-1 font-medium tracking-wide uppercase",
                          activeDay === i ? "text-indigo-200" : "text-slate-500"
                        )}>
                          {day.sessions?.length || 0} tasks
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Day Content */}
                <div className="p-6 md:p-8 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-2xl font-extrabold text-white tracking-tight">
                        {plan.study_plan[activeDay]?.day}
                      </h3>
                      <p className="text-sm font-medium text-slate-400 mt-1">
                        {plan.study_plan[activeDay]?.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 w-fit">
                      <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
                        <Clock size={16} />
                        {getTotalHours(plan.study_plan[activeDay]?.sessions || []).toFixed(1)} hrs
                      </div>
                      <div className="w-px h-4 bg-slate-800"></div>
                      <div className="flex items-center gap-2 text-sm font-bold text-violet-400">
                        <BookOpen size={16} />
                        {plan.study_plan[activeDay]?.sessions?.length || 0} tasks
                      </div>
                    </div>
                  </div>

                  {plan.study_plan[activeDay]?.sessions?.length === 0 ? (
                    <div className="text-center py-16 px-4 border-2 border-dashed border-slate-800 rounded-2xl">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles size={24} className="text-emerald-400" />
                      </div>
                      <p className="text-lg font-bold text-white">Rest Day</p>
                      <p className="text-slate-400 text-sm mt-1">AI has cleared your schedule for recovery.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-800 pl-8">
                      {plan.study_plan[activeDay]?.sessions?.map((session, i) => (
                        <div
                          key={i}
                          className={clsx(
                            "relative border rounded-2xl p-5 sm:p-6 transition-all duration-300 group",
                            priorityColors[session.priority] || "border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80"
                          )}
                        >
                          {/* Timeline dot */}
                          <div className={clsx(
                            "absolute top-8 -left-[27px] w-3 h-3 rounded-full border-2 border-slate-950 z-10 shadow-[0_0_0_4px_rgba(2,6,23,1)]",
                            session.priority === 'high' ? "bg-rose-500" :
                            session.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                          )}></div>

                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h4 className="text-lg font-bold text-white">{session.subject}</h4>
                                <span className={clsx(
                                  "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider",
                                  priorityBadge[session.priority] || "bg-slate-800 text-slate-400 border border-slate-700"
                                )}>
                                  {session.priority} priority
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-300 mb-4 leading-relaxed">{session.task}</p>
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                  <Clock size={14} className="text-slate-400" />
                                  {session.time}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                  <Brain size={14} className="text-indigo-400" />
                                  {session.duration_minutes} min block
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAskAssistant(session.task, session.subject)}
                              className="flex items-center justify-center gap-2 text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30 transition-all shrink-0 w-full sm:w-auto"
                            >
                              <MessageCircle size={14} />
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
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-slate-400">{plan.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
