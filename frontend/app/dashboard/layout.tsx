"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart2,
  Bell,
  Bot,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Assignments", href: "/dashboard/assignments", icon: BookOpen },
  { label: "Planner", href: "/dashboard/planner", icon: Calendar },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Assistant", href: "/dashboard/assistant", icon: Bot },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
      try {
        console.log("Syncing user:", user?.primaryEmailAddress?.emailAddress);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerk_id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.firstName || "Student",
            picture: user.imageUrl,
          }),
        });
        const data = await response.json();
        console.log("Sync response:", data);
        if (data.access_token) {
          sessionStorage.setItem("studyflow_token", data.access_token);
          console.log("Token stored successfully");
        }
      } catch (error) {
        console.error("Failed to sync user:", error);
      }
    };

    syncUser();
  }, [isLoaded, user]);

  return (
    <div className="flex h-screen bg-slate-950 selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/5 blur-[60px] pointer-events-none"></div>

        {/* Logo Area */}
        <div className="p-6 border-b border-slate-800 relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  StudyFlow <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">AI</span>
                </h1>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-[0.2em] pl-[44px]">
              Academic OS
            </p>
          </div>
          
          {/* Close button for mobile inside sidebar */}
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-300 border group",
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900 hover:border-slate-800"
                )}
              >
                <Icon 
                  size={18} 
                  className={clsx(
                    "transition-colors duration-300",
                    isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                  )} 
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center gap-3 relative z-10">
          <div className="ring-2 ring-slate-800 rounded-full shrink-0 flex items-center justify-center">
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-9 h-9"
                }
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-200 truncate">
              {user?.firstName || "Student"}
            </p>
            <p className="text-xs font-medium text-slate-500 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper (Handles Header + Children) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        {/* Mobile Header - Only visible on small screens */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">
              StudyFlow <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">AI</span>
            </h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Main Content Render Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 relative custom-scrollbar">
          {children}
        </main>
      </div>

    </div>
  );
}
