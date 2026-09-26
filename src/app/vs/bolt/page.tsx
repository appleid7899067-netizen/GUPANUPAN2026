import Link from "next/link";
import { VS_BOLT_MATRIX, PREVIEW_BENCHMARK, PRICING_COMPARISON, winnerBadge } from "@/lib/bolt-killer";
import { BoltKillerBanner } from "@/components/BoltKillerBanner";
import { Crown, Zap, Box, Sparkles, Gift, ArrowRight, Check, X, Minus } from "lucide-react";

export const metadata = { title: "GUPANUPAN vs Bolt.new — เหนือขาดๆ", description: "เทียบ GUPANUPAN Hybrid (Next.js + Puter) กับ Bolt.new — เร็วกว่า 9x, ฟรี unlimited, 500+ models" };

export default function VsBoltPage() {
  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"><ArrowRight className="w-3 h-3 rotate-180"/> กลับหน้าแรก</Link>
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full"><Crown className="w-4 h-4"/> เหนือ Bolt ขาดๆ</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mt-3">GUPANUPAN <span className="text-emerald-600">Hybrid</span> vs Bolt.new</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">Next.js + Puter hybrid ของเรา — prompt เดียวได้ full-stack app เหมือน Bolt แต่ <b>เร็วกว่า 9x, ฟรี unlimited, 500+ models auto-routing, sandbox แยก, Figma, DB/Auth built-in</b></p>
        </div>

        <div className="mt-6"><BoltKillerBanner /></div>

        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Zap className="w-4 h-4 text-emerald-500"/> สปีด</div>
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between"><span>HMR</span><span><b className="text-emerald-600">{PREVIEW_BENCHMARK.gupan.hmr}ms</b> vs {PREVIEW_BENCHMARK.bolt.hmr}ms</span></div>
              <div className="flex justify-between"><span>Cold Boot</span><span><b className="text-emerald-600">{PREVIEW_BENCHMARK.gupan.boot}s</b> vs {PREVIEW_BENCHMARK.bolt.boot/1000}s</span></div>
              <div className="text-[11px] text-gray-400 mt-1">{PREVIEW_BENCHMARK.improvement}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Gift className="w-4 h-4 text-emerald-500"/> ราคา</div>
            <div className="mt-2 text-xs space-y-1">
              <div>Bolt free: {PRICING_COMPARISON.bolt.free}</div>
              <div className="font-medium text-emerald-700">GUPAN/Puter: {PRICING_COMPARISON.gupanPuter.free}</div>
              <div className="text-[11px] text-gray-400">Totalum: {PRICING_COMPARISON.totalum.free} — มีทั้งสอง</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Box className="w-4 h-4 text-amber-500"/> Sandbox</div>
            <div className="mt-2 text-xs">
              <div>Bolt: WebContainer แชร์ RAM</div>
              <div className="font-medium text-emerald-700">GUPAN: isolate per project + auto sleep/wake 1.5s</div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500"/> เทียบฟีเจอร์ — 15 ข้อ</h2>
            <span className="text-xs text-gray-400">ชนะ 11 — เสมอ 3 — แพ้ 0</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="text-left px-4 py-2">Feature</th><th className="text-center px-2 py-2">Bolt.new</th><th className="text-center px-2 py-2">GUPAN Hybrid</th><th className="text-center px-2 py-2">Winner</th></tr></thead>
              <tbody>
                {VS_BOLT_MATRIX.map(row=> (
                  <tr key={row.feature} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{row.feature}</td>
                    <td className="text-center px-2 py-2 text-xs">{row.bolt}</td>
                    <td className="text-center px-2 py-2 text-xs font-medium text-emerald-700">{row.gupan}</td>
                    <td className="text-center px-2 py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${winnerBadge(row.winner)}`}>{row.winner==="gupan"?"GUPAN":row.winner==="bolt"?"Bolt":"เสมอ"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-gray-900 text-white p-6">
          <h3 className="font-semibold flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400"/> สรุป — ทำไมเหนือขาดๆ</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80 list-disc list-inside">
            <li><b className="text-white">เร็ว:</b> ไม่ต้องบูท WebContainer, HMR 95ms — Bolt 850ms</li>
            <li><b className="text-white">ถูก:</b> Puter ฟรี unlimited (user-pays) — Bolt จำกัด 150k tokens</li>
            <li><b className="text-white">เก่ง:</b> 500+ models auto-routing ตาม prompt — Bolt ตัวเดียว</li>
            <li><b className="text-white">ครบ:</b> DB/Auth/Storage/Realtime/Hosting built-in — Bolt ต้องต่อเอง</li>
            <li><b className="text-white">แยก:</b> sandbox isolate per project + sleep/wake — Bolt แชร์</li>
            <li><b className="text-white">อิสระ:</b> MIT self-host, white-label embed — Bolt ปิด</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Link href="/" className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold">ลองสร้างเลย →</Link>
            <a href="https://github.com/appleid7899067-netizen/GUPANUPAN2026" target="_blank" className="border border-white/20 px-4 py-2 rounded-lg text-sm">ดูโค้ด</a>
          </div>
        </div>
      </div>
    </div>
  );
}
