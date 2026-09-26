"use client";

import { Zap, Crown, Box, Sparkles, TrendingUp, Gift } from "lucide-react";
import Link from "next/link";

export function BoltKillerBanner() {
  return (
    <div className="rounded-2xl overflow-hidden border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-lg">
      <div className="bg-gradient-to-r from-amber-500 to-emerald-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold tracking-wider uppercase">
        <span className="flex items-center gap-1.5"><Crown className="w-4 h-4"/> เหนือ Bolt ขาดๆ — GUPANUPAN Hybrid</span>
        <Link href="/vs/bolt" className="bg-white text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-amber-50 transition">เทียบ Bolt →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <Zap className="w-6 h-6 text-emerald-500 mx-auto"/>
          <div className="text-lg font-bold text-gray-900 mt-1">95ms</div>
          <div className="text-xs text-gray-500">HMR Preview</div>
          <div className="text-[11px] text-emerald-600 font-medium">Bolt 850ms — 9x เร็วกว่า</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <Box className="w-6 h-6 text-amber-500 mx-auto"/>
          <div className="text-lg font-bold text-gray-900 mt-1">0s</div>
          <div className="text-xs text-gray-500">Cold Boot</div>
          <div className="text-[11px] text-emerald-600 font-medium">Bolt 4s — instant</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <Sparkles className="w-6 h-6 text-violet-500 mx-auto"/>
          <div className="text-lg font-bold text-gray-900 mt-1">500+</div>
          <div className="text-xs text-gray-500">AI Models</div>
          <div className="text-[11px] text-emerald-600 font-medium">auto-routing</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <Gift className="w-6 h-6 text-emerald-600 mx-auto"/>
          <div className="text-lg font-bold text-gray-900 mt-1">ฟรี</div>
          <div className="text-xs text-gray-500">Unlimited</div>
          <div className="text-[11px] text-emerald-600 font-medium">Puter user-pays</div>
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-gray-500">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-500"/> Sandbox แยกต่อโปรเจค + Figma + DB + Auth built-in — Bolt ไม่มี
      </div>
    </div>
  );
}

export function BoltKillerFloating() {
  return (
    <Link href="/vs/bolt" className="fixed bottom-4 right-4 z-50 hidden sm:flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg hover:bg-black transition">
      <Crown className="w-4 h-4 text-amber-400"/> เหนือ Bolt ขาดๆ <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">VS</span>
    </Link>
  );
}
