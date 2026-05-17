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
  low: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

const statusColors: Record<Status, string> = {
  pending: "bg-slate-50 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
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
          <body style="margin:0;background:#1a1a1a;display:flex;justify-content:center;align-items:center;min-height:100vh;">
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

  const hasQuestion = (a: Assignment) =>
    !!(a.question_text || a.question_pdf_1);

  const hasPendingPdf = (a: Assignment) =>
    !!(a.question_pdf_1_name && !a.question_pdf_1);

  const needsRegenerate = (a: Assignment) =>
    !!(a.question_pdf_2 || a.question_text?.includes("[Extended Question]")) && !a.solution;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Assignments</h2>
          <p className="text-slate-500 mt-1">Track and manage your assignments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
          Add Assignment
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">New Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Title *</label>
              <input
                type="text"
                placeholder="Assignment title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Course</label>
              <input
                type="text"
                placeholder="Course name"
                value={form.course_name}
                onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Due Date</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-600 mb-1 block">
              Question Text <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              placeholder="Type or paste your question here..."
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-600 mb-1 block">
              Upload Question Paper <span className="text-slate-400">(optional — PDF or Image)</span>
            </label>
            <div
              onClick={() => formFileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
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
                  <FileText size={20} className="text-red-500" />
                  <p className="text-sm font-medium text-slate-700">{uploadFile.name}</p>
                  <p className="text-xs text-slate-400">({(uploadFile.size / 1024).toFixed(1)} KB)</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Upload size={16} />
                  <p className="text-sm">Upload PDF or Image of question paper</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving
                ? (form.question_text || uploadFile ? "Saving & Solving..." : "Saving...")
                : "Save Assignment"}
            </button>
            <button
              onClick={() => { setShowForm(false); setUploadFile(null); }}
              className="border border-gray-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Loader2 size={40} className="mx-auto text-slate-300 mb-4 animate-spin" />
          <p className="text-slate-500">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No assignments yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={clsx(
                        "font-medium text-slate-800",
                        assignment.status === "completed" && "line-through text-slate-400"
                      )}>
                        {assignment.title}
                      </p>
                      {assignment.source === "google_classroom" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                          Classroom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {assignment.course_name && (
                        <span className="text-xs text-slate-500">{assignment.course_name}</span>
                      )}
                      {assignment.due_date && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} />
                          {new Date(assignment.due_date).toLocaleDateString("en-GB")}
                        </span>
                      )}
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[assignment.priority])}>
                        {assignment.priority}
                      </span>
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[assignment.status])}>
                        {assignment.status?.replace("_", " ")}
                      </span>
                      {assignment.question_pdf_1_name && assignment.question_pdf_1 && (
                        <button
                          onClick={() => openPdfInNewWindow(assignment.question_pdf_1!, assignment.question_pdf_1_name!)}
                          className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          <FileText size={10} />
                          {assignment.question_pdf_1_name}
                          <ExternalLink size={9} />
                        </button>
                      )}
                      {assignment.question_pdf_1_name && !assignment.question_pdf_1 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={10} />
                          📎 {assignment.question_pdf_1_name} — download from Classroom and upload here
                        </span>
                      )}
                      {assignment.question_pdf_2_name && assignment.question_pdf_2 && (
                        <button
                          onClick={() => openPdfInNewWindow(assignment.question_pdf_2!, assignment.question_pdf_2_name!)}
                          className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
                        >
                          <FileText size={10} />
                          {assignment.question_pdf_2_name} (extended)
                          <ExternalLink size={9} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {assignment.status !== "completed" && (
                      <>
                        {hasQuestion(assignment) && (
                          <button
                            onClick={() => setExpandedQuestionId(
                              expandedQuestionId === assignment.id ? null : assignment.id
                            )}
                            className="flex items-center gap-1.5 text-xs bg-slate-50 text-slate-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <Eye size={12} />
                            {expandedQuestionId === assignment.id ? "Hide Question" : "View Question"}
                          </button>
                        )}

                        {hasPendingPdf(assignment) && (
                          <button
                            onClick={() => setShowExtendForm(
                              showExtendForm === assignment.id ? null : assignment.id
                            )}
                            className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            <Upload size={12} />
                            Upload PDF to Solve
                          </button>
                        )}

                        {!hasQuestion(assignment) && !hasPendingPdf(assignment) && (
                          <button
                            onClick={() => setShowExtendForm(
                              showExtendForm === assignment.id ? null : assignment.id
                            )}
                            className="flex items-center gap-1.5 text-xs bg-slate-50 text-slate-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <Upload size={12} />
                            Upload Question
                          </button>
                        )}

                        {hasQuestion(assignment) && (
                          <button
                            onClick={() => setShowExtendForm(
                              showExtendForm === assignment.id ? null : assignment.id
                            )}
                            className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-600 border border-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            <PlusCircle size={12} />
                            Extend
                          </button>
                        )}

                        {needsRegenerate(assignment) ? (
                          <button
                            onClick={() => handleSolve(assignment.id)}
                            disabled={solvingId === assignment.id}
                            className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {solvingId === assignment.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                            {solvingId === assignment.id ? "Generating..." : "Generate Solution"}
                          </button>
                        ) : assignment.solution ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedSolutionId(
                                expandedSolutionId === assignment.id ? null : assignment.id
                              )}
                              className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Sparkles size={12} />
                              {expandedSolutionId === assignment.id ? "Hide Solution" : "View Solution"}
                              {expandedSolutionId === assignment.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <button
                              onClick={() => handleSolve(assignment.id)}
                              disabled={solvingId === assignment.id}
                              className="flex items-center gap-1 text-xs text-slate-400 border border-gray-200 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Regenerate solution"
                            >
                              {solvingId === assignment.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RefreshCw size={12} />
                              )}
                            </button>
                          </div>
                        ) : (hasQuestion(assignment) || hasPendingPdf(assignment)) ? (
                          <button
                            onClick={() => handleSolve(assignment.id)}
                            disabled={solvingId === assignment.id}
                            className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {solvingId === assignment.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            {solvingId === assignment.id ? "Solving..." : "Solve with AI"}
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleComplete(assignment.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark complete — deletes PDFs permanently"
                        >
                          <CheckCircle size={18} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={assignment.status === "completed"
                        ? "Delete entry"
                        : "Delete assignment and PDFs permanently"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {assignment.status !== "completed" && showExtendForm === assignment.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      {hasPendingPdf(assignment)
                        ? `Upload "${assignment.question_pdf_1_name}" from Classroom`
                        : hasQuestion(assignment)
                        ? "Add Extended Question"
                        : "Upload Question"}
                    </p>
                    {!hasPendingPdf(assignment) && (
                      <textarea
                        placeholder="Type additional question text here..."
                        value={extendText}
                        onChange={(e) => setExtendText(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
                      />
                    )}
                    <div
                      onClick={() => extendFileRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors mb-3"
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
                        <div className="flex items-center justify-center gap-2">
                          <FileText size={16} className="text-red-500" />
                          <p className="text-sm text-slate-700">{extendFile.name}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExtendFile(null); }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <Upload size={14} />
                          <p className="text-xs">
                            {hasPendingPdf(assignment)
                              ? `Upload ${assignment.question_pdf_1_name}`
                              : "Upload PDF or Image"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExtend(assignment.id)}
                        disabled={extendingId === assignment.id || (!extendText && !extendFile)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        {extendingId === assignment.id && <Loader2 size={12} className="animate-spin" />}
                        {extendingId === assignment.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setShowExtendForm(null);
                          setExtendText("");
                          setExtendFile(null);
                        }}
                        className="border border-gray-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {expandedQuestionId === assignment.id && hasQuestion(assignment) && (
                <div className="border-t border-gray-100 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Eye size={14} />
                    Question
                  </p>
                  {assignment.question_text && (
                    <div className="text-sm text-slate-600 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200 mb-2 max-h-64 overflow-auto">
                      {assignment.question_text}
                    </div>
                  )}
                  {assignment.question_pdf_1_name && assignment.question_pdf_1 && (
                    <button
                      onClick={() => openPdfInNewWindow(assignment.question_pdf_1!, assignment.question_pdf_1_name!)}
                      className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mb-2 hover:bg-blue-100 transition-colors"
                    >
                      <FileText size={12} />
                      <span>{assignment.question_pdf_1_name}</span>
                      <ExternalLink size={10} />
                      <span className="text-blue-400">Click to view</span>
                    </button>
                  )}
                  {assignment.question_pdf_2_name && assignment.question_pdf_2 && (
                    <button
                      onClick={() => openPdfInNewWindow(assignment.question_pdf_2!, assignment.question_pdf_2_name!)}
                      className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <FileText size={12} />
                      <span>{assignment.question_pdf_2_name} (extended)</span>
                      <ExternalLink size={10} />
                      <span className="text-purple-400">Click to view</span>
                    </button>
                  )}
                </div>
              )}

              {expandedSolutionId === assignment.id && assignment.solution && (
                <div className="border-t border-gray-100 bg-slate-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-600" />
                      AI Solution
                    </p>
                    {assignment.previous_solution && (
                      <button
                        onClick={() => setShowPrevSolution(
                          showPrevSolution === assignment.id ? null : assignment.id
                        )}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                      >
                        <History size={12} />
                        {showPrevSolution === assignment.id ? "Hide" : "View"} Previous Solution
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto bg-white rounded-lg p-4 border border-gray-200">
                    {assignment.solution}
                  </div>
                  {showPrevSolution === assignment.id && assignment.previous_solution && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <History size={12} />
                        Previous Solution
                      </p>
                      <div className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto bg-white rounded-lg p-4 border border-gray-200 opacity-75">
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
  );
}