"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wakeBackend = async () => {
      while (true) {
        try {
          const res = await fetch(
            "https://studyflow-ai-874f.onrender.com/health"
          );

          if (res.ok) {
            setReady(true);
            break;
          }
        } catch (err) {
          console.log("Backend sleeping...");
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    };

    wakeBackend();
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center text-2xl font-semibold">
        Waking up server...
      </div>
    );
  }

  return (
    <div>
      Dashboard Loaded
    </div>
  );
}
