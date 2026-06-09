"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const wakeBackend = async () => {
      while (isMounted) {
        try {
          const res = await fetch(
            "https://studyflow-ai-874f.onrender.com/health"
            //"https://studyflow-ai-zaif.onrender.com/health"
          );

          if (res.ok) {
            // Server is awake! Redirect the user to the actual dashboard.
            if (isMounted) {
              router.push("/dashboard");
            }
            break;
          }
        } catch (err) {
          console.log("Backend sleeping, retrying...");
        }

        // Wait 3 seconds before next ping
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    };

    wakeBackend();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, [router]);

  // The UI will purely be the loading screen until the router pushes them away
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
      
      <div className="flex flex-col items-center p-10 bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 max-w-sm w-full relative z-10 transition-all">
        
        {/* Custom Glowing AI Spinner */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Inner pulsating glow */}
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
          
          {/* The ring container */}
          <div className="w-20 h-20 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center relative shadow-inner">
            {/* Spinning gradient border effect */}
            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin"></div>
            <div className="absolute inset-0 rounded-full border-r-2 border-violet-500/30 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
            
            {/* Center icon */}
            <Sparkles className="text-violet-400 absolute animate-pulse" size={24} />
          </div>
        </div>

        {/* Typography */}
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-3 text-center">
          Waking up <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">System Core</span>
        </h1>
        
        <p className="text-sm font-medium text-slate-400 text-center leading-relaxed">
          Establishing a secure connection... Please StandBy. This might take a few seconds on the first load  --Sk Asif (Developer).
        </p>

        {/* Status Indicator */}
        <div className="mt-8 flex items-center gap-3 px-4 py-2 bg-slate-950 rounded-full border border-slate-800 shadow-inner">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Standby</span>
        </div>
        
      </div>
    </div>
  );
}
