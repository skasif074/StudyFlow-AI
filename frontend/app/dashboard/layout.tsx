"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart2,
  Bell,
  Bot,
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
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-slate-800">StudyFlow AI</h1>
          <p className="text-xs text-slate-500 mt-1">Academic OS</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 flex items-center gap-3">
          <UserButton />
          <div>
            <p className="text-sm font-medium text-slate-700">
              {user?.firstName || "Student"}
            </p>
            <p className="text-xs text-slate-400">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}