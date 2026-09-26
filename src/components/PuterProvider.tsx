"use client";

import { useEffect, useState } from "react";
import { ensurePuterLoaded, isPuterAvailable, getPuterUser } from "@/lib/puter";

export function PuterProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensurePuterLoaded().then(ok => {
      if (!cancelled) setReady(ok);
    }).catch(() => { if (!cancelled) setReady(false); });
    // also watch for late loads
    const id = setInterval(() => {
      if (isPuterAvailable() && !ready) setReady(true);
    }, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [ready]);

  return <>{children}</>;
}

export function PuterStatusBadge() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const check = () => {
      setLoaded(isPuterAvailable());
      setUser(getPuterUser());
    };
    check();
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, []);

  if (!loaded) return null;
  return (
    <div className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      {user ? `Puter: ${user.username}` : "Puter ready — sign in to build"}
    </div>
  );
}
