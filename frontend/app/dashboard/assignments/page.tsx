"use client";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  Plus, BookOpen, Trash2, CheckCircle, Clock, Loader2,
  Upload, FileText, X, Sparkles, ChevronDown,
  ChevronUp, Eye, RefreshCw, PlusCircle, History, AlertCircle, ExternalLink
} from "lucide-react";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "pending" | "in_progress" | "completed" | "overdue";

interface Assignment {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  priority: Priority;
  status: Status;
  question_text: string | null;
  question_pdf_1: string | null;
  question_pdf_1_name: string | null;
  question_pdf_2: string | null;
  question_pdf_2_name: string | null;
  solution: string | null;
  previous_solution: string | null;
  solution_filename: string | null;
  source: string | null;
}

const priorityColors: Record<Priority, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

const statusColors: Record<Status, string> = {
  pending: "bg-slate-800 text-slate-300 border border-slate-700",
  in_progress: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  overdue: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function openPdfInNewWindow(base64Data: string, filename: string) {
  const isImage = filename.match(/\.(jpg|jpeg|png|webp)$/i);
  if (isImage) {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const dataUrl = `data:${mediaType};base64,${base64Data}`;
    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <head><title>${filename}</title></head>
          <body style="margin:0;background:#020617;display:flex;justify-content:center;align-items:center;min-height:100vh;">
            <img src="${dataUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
          </body>
        </html>
      `);
    }
  } else {
    const byteChars = atob(base64Data);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [solvingId, setSolvingId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [expandedSolutionId, setExpandedSolutionId] = useState<string | null>(null);
  const [showPrevSolution, setShowPrevSolution] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [extendFile, setExtendFile] = useState<File | null>(null);
  const [extendText, setExtendText] = useState("");
  const [showExtendForm, setShowExtendForm] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    course_name: "",
    due_date: "",
    priority: "medium" as Priority,
    question_text: "",
  });

  const formFileRef = useRef<HTMLInputElement>(null);
  const extendFileRef = useRef<HTMLInputElement>(null);

  const getToken = () => sessionStorage.getItem("studyflow_token");

  const fetchAssignments = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/assignments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAdd = async () => {
    if (!form.title) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      if (form.course_name) formData.append("course_name", form.course_name);
      if (form.priority) formData.append("priority", form.priority);
      if (form.due_date) formData.append("due_date", new Date(form.due_date).toISOString());
      if (form.question_text) formData.append("question_text", form.question_text);
      if (uploadFile) formData.append("file", uploadFile);

      const response = await fetch(`${API_URL}/assignments/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      setAssignments([...assignments, data]);
      setForm({ title: "", course_name: "", due_date: "", priority: "medium", question_text: "" });
      setUploadFile(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create assignment:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/assignments/${id}/complete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAssignments(assignments.map((a) => a.id === id ? data : a));
      setExpandedQuestionId(null);
      setExpandedSolutionId(null);
    } catch (error) {
      console.error("Failed to complete assignment:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API_URL}/assignments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Failed to delete assignment:", error);
    }
  };

  const handleSolve = async (id: string) => {
    const token = getToken();
    if (!token) return;
    setSolvingId(id);
    try {
      const response = await fetch(`${API_URL}/assignments/${id}/solve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAssignments(assignments.map((a) => a.id === id ? data : a));
      setExpandedSolutionId(id);
      setExpandedQuestionId(null);
    } catch (error) {
      console.error("Failed to solve:", error);
    } finally {
      setSolvingId(null);
    }
  };

  const handleExtend = async (id: string) => {
    const token = getToken();
    if (!token) return;
    setExtendingId(id);
    try {
      const formData = new FormData();
      if (extendText) formData.append("question_text", extendText);
      if (extendFile) formData.append("file", extendFile);

      const response = await fetch(`${API_URL}/assignments/${id}/extend-question`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      setAssignments(assignments.map((a) => a.id === id ? data : a));
      setShowExtendForm(null);
      setExtendText("");
      setExtendFile(null);
    } catch (error) {
      console.error("Failed to extend question:", error);
    } finally {
      setExtendingId(null);
    }
  };

  const hasQuestion = (a: Assignment) => !!(a.question_text || a.question_pdf_1);
  const hasPendingPdf = (a: Assignment) => !!(a.question_pdf_1_name && !a.question_pdf_1);
  const needsRegenerate = (a: Assignment) => !!(a.question_pdf_2 || a.question_text?.includes("[Extended Question]")) && !a.solution;

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Your{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Assignments
              </span>
            </h2>
            <p className="text-slate-400 mt-2">Track, manage, and solve your tasks using AI.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            {showForm ? "Close Form" : "New Assignment"}
          </button>
        </div>

        {/* Create Assignment Form */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-xl font-bold text-white mb-6">Create New Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Calculus Midterm Prep"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Course</label>
                <input
                  type="text"
                  placeholder="e.g. MATH 101"
                  value={form.course_name}
                  onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Due Date</label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">
                Question Text <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                placeholder="Type or paste your question here..."
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 placeholder-slate-600 transition-colors"
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">
                Upload Document <span className="text-slate-500">(optional — PDF or Image)</span>
              </label>
              <div
                onClick={() => formFileRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all group"
              >
                <input
                  ref={formFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadFile(file);
                  }}
                />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={24} className="text-indigo-400" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{uploadFile.name}</p>
                      <p className="text-xs text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-300 transition-colors">
                    <Upload size={24} className="mb-1" />
                    <p className="text-sm font-medium">Click to browse or drag and drop</p>
                    <p className="text-xs text-slate-500">PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-800">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving
                  ? (form.question_text || uploadFile ? "Saving & Solving..." : "Saving...")
                  : "Save Assignment"}
              </button>
              <button
                onClick={() => { setShowForm(false); setUploadFile(null); }}
                className="border border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center shadow-lg">
            <Loader2 size={40} className="mx-auto text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Fetching assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center shadow-lg">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5">
              <BookOpen size={32} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No assignments yet</h3>
            <p className="text-slate-400">Add your first assignment to start crushing your goals.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all duration-300">
                <div className="p-5 sm:p-6">
                  
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Info Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className={clsx(
                          "text-lg font-bold tracking-wide",
                          assignment.status === "completed" ? "line-through text-slate-500" : "text-white"
                        )}>
                          {assignment.title}
                        </h3>
                        {assignment.source === "google_classroom" && (
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                            Classroom
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {assignment.course_name && (
                          <span className="text-sm font-medium text-slate-400">{assignment.course_name}</span>
                        )}
                        {assignment.course_name && assignment.due_date && (
                          <span className="text-slate-600">•</span>
                        )}
                        {assignment.due_date && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
                            <Clock size={14} className="text-slate-500" />
                            {new Date(assignment.due_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <span className="text-slate-600 ml-1 mr-1">•</span>
                        <span className={clsx("text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider", priorityColors[assignment.priority])}>
                          {assignment.priority}
                        </span>
                        <span className={clsx("text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider", statusColors[assignment.status])}>
                          {assignment.status?.replace("_", " ")}
                        </span>
                      </div>

                      {/* PDF Links Section */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {assignment.question_pdf_1_name && assignment.question_pdf_1 && (
                          <button
                            onClick={() => openPdfInNewWindow(assignment.question_pdf_1!, assignment.question_pdf_1_name!)}
                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-colors"
                          >
                            <FileText size={12} />
                            {assignment.question_pdf_1_name}
                            <ExternalLink size={10} className="ml-1 opacity-70" />
                          </button>
                        )}
                        {assignment.question_pdf_1_name && !assignment.question_pdf_1 && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                            <AlertCircle size={12} />
                            Missing PDF: {assignment.question_pdf_1_name}
                          </span>
                        )}
                        {assignment.question_pdf_2_name && assignment.question_pdf_2 && (
                          <button
                            onClick={() => openPdfInNewWindow(assignment.question_pdf_2!, assignment.question_pdf_2_name!)}
                            className="flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/20 transition-colors"
                          >
                            <FileText size={12} />
                            {assignment.question_pdf_2_name} (Extended)
                            <ExternalLink size={10} className="ml-1 opacity-70" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap lg:justify-end mt-4 lg:mt-0">
                      {assignment.status !== "completed" && (
                        <>
                          {hasQuestion(assignment) && (
                            <button
                              onClick={() => setExpandedQuestionId(expandedQuestionId === assignment.id ? null : assignment.id)}
                              className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                            >
                              <Eye size={14} />
                              {expandedQuestionId === assignment.id ? "Hide Q" : "View Q"}
                            </button>
                          )}

                          {hasPendingPdf(assignment) && (
                            <button
                              onClick={() => setShowExtendForm(showExtendForm === assignment.id ? null : assignment.id)}
                              className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl hover:bg-amber-500/20 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                            >
                              <Upload size={14} /> Upload PDF
                            </button>
                          )}

                          {!hasQuestion(assignment) && !hasPendingPdf(assignment) && (
                            <button
                              onClick={() => setShowExtendForm(showExtendForm === assignment.id ? null : assignment.id)}
                              className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                            >
                              <Upload size={14} /> Add Q
                            </button>
                          )}

                          {hasQuestion(assignment) && (
                            <button
                              onClick={() => setShowExtendForm(showExtendForm === assignment.id ? null : assignment.id)}
                              className="flex items-center gap-1.5 text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/30 px-3 py-2 rounded-xl hover:bg-violet-500/20 transition-colors"
                            >
                              <PlusCircle size={14} /> Extend
                            </button>
                          )}

                          {needsRegenerate(assignment) ? (
                            <button
                              onClick={() => handleSolve(assignment.id)}
                              disabled={solvingId === assignment.id}
                              className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                            >
                              {solvingId === assignment.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                              {solvingId === assignment.id ? "Generating..." : "Generate"}
                            </button>
                          ) : assignment.solution ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setExpandedSolutionId(expandedSolutionId === assignment.id ? null : assignment.id)}
                                className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-xl hover:bg-indigo-500/20 transition-colors shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                              >
                                <Sparkles size={14} />
                                {expandedSolutionId === assignment.id ? "Hide Sol" : "View Sol"}
                                {expandedSolutionId === assignment.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                              <button
                                onClick={() => handleSolve(assignment.id)}
                                disabled={solvingId === assignment.id}
                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors disabled:opacity-50"
                                title="Regenerate solution"
                              >
                                {solvingId === assignment.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                              </button>
                            </div>
                          ) : (hasQuestion(assignment) || hasPendingPdf(assignment)) ? (
                            <button
                              onClick={() => handleSolve(assignment.id)}
                              disabled={solvingId === assignment.id}
                              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50"
                            >
                              {solvingId === assignment.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              {solvingId === assignment.id ? "Solving..." : "Solve"}
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleComplete(assignment.id)}
                            className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                            title="Mark complete"
                          >
                            <CheckCircle size={20} />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Delete assignment"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Extend/Upload Inline Form */}
                  {assignment.status !== "completed" && showExtendForm === assignment.id && (
                    <div className="mt-6 border-t border-slate-800 pt-5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-sm font-bold text-slate-300 mb-3">
                        {hasPendingPdf(assignment)
                          ? `Upload missing "${assignment.question_pdf_1_name}"`
                          : hasQuestion(assignment)
                          ? "Append to current question"
                          : "Upload new question"}
                      </p>
                      
                      {!hasPendingPdf(assignment) && (
                        <textarea
                          placeholder="Type additional context or questions here..."
                          value={extendText}
                          onChange={(e) => setExtendText(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 placeholder-slate-600 transition-colors mb-3"
                        />
                      )}
                      
                      <div
                        onClick={() => extendFileRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/50 transition-colors mb-4 group"
                      >
                        <input
                          ref={extendFileRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setExtendFile(file);
                          }}
                        />
                        {extendFile ? (
                          <div className="flex items-center justify-center gap-3">
                            <FileText size={20} className="text-indigo-400" />
                            <p className="text-sm font-bold text-white">{extendFile.name}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setExtendFile(null); }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-slate-400 group-hover:text-indigo-300 transition-colors">
                            <Upload size={16} />
                            <p className="text-sm font-medium">
                              {hasPendingPdf(assignment) ? "Select PDF from device" : "Upload attachment (optional)"}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleExtend(assignment.id)}
                          disabled={extendingId === assignment.id || (!extendText && !extendFile)}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {extendingId === assignment.id && <Loader2 size={14} className="animate-spin" />}
                          {extendingId === assignment.id ? "Saving..." : "Save Update"}
                        </button>
                        <button
                          onClick={() => {
                            setShowExtendForm(null);
                            setExtendText("");
                            setExtendFile(null);
                          }}
                          className="border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Question Section */}
                {expandedQuestionId === assignment.id && hasQuestion(assignment) && (
                  <div className="border-t border-slate-800 bg-slate-950/50 p-5 sm:p-6">
                    <p className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                      <Eye size={16} className="text-slate-500" />
                      Original Question
                    </p>
                    {assignment.question_text && (
                      <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900 rounded-xl p-5 border border-slate-800 mb-3 max-h-72 overflow-y-auto custom-scrollbar leading-relaxed">
                        {assignment.question_text}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {assignment.question_pdf_1_name && assignment.question_pdf_1 && (
                        <button
                          onClick={() => openPdfInNewWindow(assignment.question_pdf_1!, assignment.question_pdf_1_name!)}
                          className="flex items-center gap-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 rounded-xl hover:bg-indigo-500/20 transition-all shadow-sm"
                        >
                          <FileText size={16} />
                          <span>{assignment.question_pdf_1_name}</span>
                          <ExternalLink size={14} className="opacity-70 ml-1" />
                        </button>
                      )}
                      {assignment.question_pdf_2_name && assignment.question_pdf_2 && (
                        <button
                          onClick={() => openPdfInNewWindow(assignment.question_pdf_2!, assignment.question_pdf_2_name!)}
                          className="flex items-center gap-2 text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-4 py-2.5 rounded-xl hover:bg-violet-500/20 transition-all shadow-sm"
                        >
                          <FileText size={16} />
                          <span>{assignment.question_pdf_2_name} <span className="opacity-75">(Extended)</span></span>
                          <ExternalLink size={14} className="opacity-70 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Solution Section */}
                {expandedSolutionId === assignment.id && assignment.solution && (
                  <div className="border-t border-slate-800 bg-slate-950/80 p-5 sm:p-6 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
                      <p className="text-sm font-bold text-indigo-300 flex items-center gap-2 uppercase tracking-wide">
                        <Sparkles size={16} className="text-indigo-400" />
                        AI Generated Solution
                      </p>
                      {assignment.previous_solution && (
                        <button
                          onClick={() => setShowPrevSolution(showPrevSolution === assignment.id ? null : assignment.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <History size={14} />
                          {showPrevSolution === assignment.id ? "Hide History" : "View History"}
                        </button>
                      )}
                    </div>
                    
                    <div className="relative z-10 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-inner custom-scrollbar selection:bg-indigo-500/30">
                      {assignment.solution}
                    </div>
                    
                    {showPrevSolution === assignment.id && assignment.previous_solution && (
                      <div className="mt-5 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                          <History size={14} />
                          Previous Revision
                        </p>
                        <div className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-slate-950 rounded-xl p-5 border border-slate-800/50 custom-scrollbar opacity-80">
                          {assignment.previous_solution}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
