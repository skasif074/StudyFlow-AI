"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const wakeBackend = async () => {
      while (isMounted) {
        try {
          const res = await fetch(
            "https://studyflow-ai-874f.onrender.com/health"
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 max-w-sm w-full transition-all">
        
        {/* Animated SVG Spinner */}
        <svg
          className="animate-spin h-12 w-12 text-blue-600 mb-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>

        {/* Typography */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Standby...
        </h2>
        <p className="text-sm text-gray-500 text-center animate-pulse">
          This might take a few seconds on the first load. Please hang tight!
        </p>
        
      </div>
    </div>
  );
}
