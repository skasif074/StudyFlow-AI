"use client";
import { useState, useEffect, useRef } from "react";
import { Bot, Send, User, Loader2, Sparkles, Plus, Trash2, Clock, Menu, X } from "lucide-react";
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
  
  // Mobile history drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const token = getToken();
    if (!token) {
      setLoadingSessions(false);
      return;
    }
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
    setIsHistoryOpen(false); // Close sidebar on mobile after selection
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
    setIsHistoryOpen(false); // Close sidebar on mobile
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

    // 1. Add user message to UI immediately
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
          stream: true,
        }),
      });

      if (!response.body) throw new Error("No response body");

      // 2. Create an empty assistant message placeholder in the UI
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
      
      setLoading(false); // Hide spinner, start typing

      // 3. Read the stream chunk by chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        
        for (const line of lines) {
          if (line === "data: [DONE]") break;
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              const token = data.choices[0]?.delta?.content || "";
              
              if (token) {
                fullContent += token;
                // Update the specific message with the newly appended word
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e);
            }
          }
        }
      }

      // 4. Save the final complete message to database
      await saveMessage("assistant", fullContent);
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
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] lg:h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 overflow-hidden relative">
      
      {/* Mobile Drawer Overlay */}
      {isHistoryOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Sidebar - History */}
      <aside className={clsx(
        "absolute inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:z-20",
        isHistoryOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 lg:p-5 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={newChat}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            <Plus size={18} />
            New Chat
          </button>
          {/* Close button for mobile inside drawer */}
          <button 
            className="ml-3 lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
            onClick={() => setIsHistoryOpen(false)}
          >
            <X size={20} />
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
                  className="opacity-0 lg:opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all focus:opacity-100 touch-manipulation"
                  title="Delete session"
                >
                  <Trash2 size={16} />
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
      <div className="flex-1 flex flex-col relative bg-slate-950 min-w-0">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-violet-500/5 blur-[80px] md:blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-500/5 blur-[80px] md:blur-[120px] pointer-events-none"></div>

        {/* Mobile + Desktop Header */}
        <div className="p-4 lg:p-6 pb-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md relative z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
             <button
                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
                onClick={() => setIsHistoryOpen(true)}
              >
                <Menu size={22} />
              </button>
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Sparkles size={20} className="text-violet-400 hidden lg:block" />
              AI <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Assistant</span>
            </h2>
          </div>
          <p className="text-slate-400 text-xs lg:text-sm font-medium ml-10 lg:ml-0 hidden sm:block">
            Ask me anything academic — explanations, quizzes, flashcards, summaries.
          </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 lg:space-y-8 relative z-10 custom-scrollbar scroll-smooth">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                "flex items-end lg:items-start gap-3 lg:gap-4",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={clsx(
                  "w-8 h-8 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                  message.role === "user" 
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white" 
                    : "bg-slate-800 border border-slate-700 text-violet-400"
                )}
              >
                {message.role === "user" ? <User size={18} className="lg:hidden" /> : <Bot size={18} className="lg:hidden" />}
                {message.role === "user" ? <User size={24} className="hidden lg:block" /> : <Bot size={24} className="hidden lg:block" />}
              </div>
              <div
                className={clsx(
                  "max-w-[85%] lg:max-w-3xl xl:max-w-4xl rounded-2xl lg:rounded-3xl px-4 py-3 lg:px-6 lg:py-5 text-sm lg:text-base leading-relaxed lg:leading-7 whitespace-pre-wrap shadow-sm",
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm lg:rounded-tr-sm lg:rounded-br-2xl"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm lg:rounded-tl-sm lg:rounded-bl-2xl",
                  message.content === "" && message.role === "assistant" && "animate-pulse min-h-[44px] lg:min-h-[60px] min-w-[60px]"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end lg:items-start gap-3 lg:gap-4 animate-in fade-in duration-300">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-slate-800 border border-slate-700 text-violet-400 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-violet-400/20 animate-pulse"></div>
                <Bot size={18} className="relative z-10 lg:hidden" />
                <Bot size={24} className="relative z-10 hidden lg:block" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl rounded-bl-sm lg:rounded-tl-sm lg:rounded-bl-2xl px-4 py-3 lg:px-6 lg:py-5 flex items-center gap-2 min-h-[44px] lg:min-h-[60px]">
                <div className="flex gap-1.5">
                  <div className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 lg:p-6 pt-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 relative z-10 pb-6 lg:pb-6">
          
          {/* Scrollable Suggestions for Mobile */}
          <div className="flex overflow-x-auto pb-3 mb-2 lg:mb-4 lg:flex-wrap gap-2 lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="flex items-center gap-1.5 text-xs lg:text-sm font-medium bg-slate-900 border border-slate-800 text-slate-300 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300 transition-all whitespace-nowrap shrink-0"
              >
                <Sparkles size={12} className="text-indigo-400 lg:w-[14px] lg:h-[14px]" />
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-2 lg:gap-3 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl lg:rounded-2xl pl-4 lg:pl-5 pr-12 lg:pr-16 py-3 lg:py-4 text-sm lg:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="absolute right-1.5 lg:right-2 top-1.5 lg:top-2 bottom-1.5 lg:bottom-2 aspect-square flex items-center justify-center bg-indigo-600 text-white rounded-lg lg:rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={18} className={clsx("lg:w-5 lg:h-5", input.trim() && !loading ? "translate-x-0.5 -translate-y-0.5 transition-transform" : "")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
