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
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 bg-slate-900 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-1">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No chat history yet</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.session_id}
                className={clsx(
                  "group flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors",
                  currentSessionId === session.session_id && "bg-slate-100"
                )}
                onClick={() => loadSession(session.session_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {session.first_message}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={10} className="text-slate-400" />
                    <p className="text-xs text-slate-400">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.session_id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-slate-400 text-center">Chats auto-delete after 3 days</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="p-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-slate-800">AI Assistant</h2>
          <p className="text-slate-500 mt-1">Ask me anything academic — explanations, quizzes, flashcards, summaries</p>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                "flex items-start gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  message.role === "user" ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-600"
                )}
              >
                {message.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={clsx(
                  "max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-gray-200 text-slate-700"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Loader2 size={16} className="animate-spin text-slate-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="flex items-center gap-1.5 text-xs bg-slate-50 border border-gray-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <Sparkles size={12} />
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything academic..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}