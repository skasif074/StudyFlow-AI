"use client";
import { useState, useEffect, useRef } from "react";
import { Bot, Send, User, Loader2, Sparkles, Plus, Trash2, Clock } from "lucide-react";
import { clsx } from "clsx";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  session_id: string;
  first_message: string;
  created_at: string;
  expires_at: string;
}

const suggestions = [
  "Summarize the concept of photosynthesis",
  "Create 5 quiz questions on World War 2",
  "Explain Newton's laws of motion simply",
  "Help me make flashcards for Python basics",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const getToken = () => sessionStorage.getItem("studyflow_token");

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your AI academic assistant. I can help you summarize notes, explain concepts, generate quiz questions, create flashcards, and answer any academic questions. What would you like help with today?",
    },
  ]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/chat/history/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const loaded = data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }));
      setMessages(loaded);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const newChat = () => {
    setCurrentSessionId(crypto.randomUUID());
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Hi! I'm your AI academic assistant. What would you like help with today?",
      },
    ]);
  };

  const deleteSession = async (sessionId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API_URL}/chat/session/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(sessions.filter((s) => s.session_id !== sessionId));
      if (sessionId === currentSessionId) newChat();
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const saveMessage = async (role: string, content: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role,
          content,
          session_id: currentSessionId,
        }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    await saveMessage("user", messageText);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a helpful academic assistant for students. Help them understand concepts, summarize notes, create quiz questions, make flashcards, and answer academic questions. Be clear, concise and educational.",
            },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: messageText },
          ],
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const assistantContent = data.choices[0].message.content;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage("assistant", assistantContent);
      fetchSessions();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error connecting to the neural network. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Sidebar - History */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0 relative z-20">
        <div className="p-5 border-b border-slate-800">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            <Plus size={18} />
            New Chat Session
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {loadingSessions ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-70">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
              <p className="text-xs text-slate-500 font-medium">Loading history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-3">
                <Clock size={20} className="text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400">No chat history yet</p>
              <p className="text-xs text-slate-500 mt-1">Your conversations will appear here.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.session_id}
                className={clsx(
                  "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                  currentSessionId === session.session_id 
                    ? "bg-indigo-500/10 border-indigo-500/20" 
                    : "hover:bg-slate-900 hover:border-slate-800"
                )}
                onClick={() => loadSession(session.session_id)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className={clsx(
                    "text-sm font-medium truncate",
                    currentSessionId === session.session_id ? "text-indigo-300" : "text-slate-300 group-hover:text-white"
                  )}>
                    {session.first_message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock size={12} className={currentSessionId === session.session_id ? "text-indigo-500/70" : "text-slate-600"} />
                    <p className={clsx(
                      "text-xs",
                      currentSessionId === session.session_id ? "text-indigo-400/80" : "text-slate-500"
                    )}>
                      {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.session_id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Delete session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm">
          <p className="text-[11px] font-medium text-slate-500 text-center uppercase tracking-wider">Chats auto-delete after 3 days</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-slate-950">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] pointer-events-none"></div>

        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md relative z-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Sparkles size={24} className="text-violet-400" />
            AI <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Assistant</span>
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm font-medium">Ask me anything academic — explanations, quizzes, flashcards, summaries.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 custom-scrollbar scroll-smooth">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                "flex items-start gap-4",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                  message.role === "user" 
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white" 
                    : "bg-slate-800 border border-slate-700 text-violet-400"
                )}
              >
                {message.role === "user" ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div
                className={clsx(
                  "max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-4 animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-violet-400 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-violet-400/20 animate-pulse"></div>
                <Bot size={20} className="relative z-10" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 pt-2 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 relative z-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="flex items-center gap-1.5 text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2 rounded-full hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
              >
                <Sparkles size={12} className="text-indigo-400" />
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-3 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything academic..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={18} className={input.trim() && !loading ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
