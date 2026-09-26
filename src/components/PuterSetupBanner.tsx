"use client";

import { KeyRound, Server, Sparkles, Globe, Box, ArrowRight, Cloud, Cpu, Shield } from "lucide-react";

export function PuterSetupBanner() {
  return (
    <div className="space-y-4 mt-10">
      {/* Hybrid notice: Puter ready */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-white shadow-lg shadow-emerald-500/10">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
        <div className="flex items-start gap-4 p-5 sm:p-6 pl-6 sm:pl-7">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
            <Cloud className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
              Puter Ready — No API key needed
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-2">Build with Puter — keyless & free</h2>
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
              This builder is now in <span className="font-semibold">Hybrid Mode</span>: Puter.js is loaded for AI, storage and hosting.
              Just sign in with your Puter account when prompted — no <code className="font-mono text-[13px] bg-gray-100 px-1 py-0.5 rounded">.env</code> key required for basic building.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3.5">
              <a
                href="https://puter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Learn about Puter <ArrowRight className="w-4 h-4" />
              </a>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
                <Sparkles className="w-3.5 h-3.5" />
                Free with Puter account
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Want Totalum hosting too? Add <code className="font-mono bg-gray-100 px-1 rounded">TOTALUM_VCAAS_API_KEY</code> to <code className="font-mono bg-gray-100 px-1 rounded">.env</code> and restart — both backends will work together.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ background: "linear-gradient(135deg,#0f172a 0%,#0f3f39 100%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-400/15 ring-1 ring-emerald-400/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Hybrid Mode: Puter + Totalum</h2>
            <p className="text-[13px] text-white/60">Keyless via Puter, scalable via Totalum — your choice per project.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
          {[
            { icon: Server, label: "Puter Hosting" },
            { icon: Shield, label: "Auth built-in" },
            { icon: Sparkles, label: "500+ AI models" },
            { icon: Box, label: "File storage" },
            { icon: Globe, label: "puter.site URL" },
            { icon: Cloud, label: "No servers" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2">
              <Icon className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="text-[13px] font-medium text-white/90 truncate">{label}</span>
            </div>
          ))}
        </div>
        <a href="https://docs.puter.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition-colors">
          Puter docs <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export function HybridSetupBanners({ mode }: { mode: string | null }) {
  if (mode === "puter") return <PuterSetupBanner />;
  // fallback to Totalum banners imported dynamically to avoid circular
  return null;
}
