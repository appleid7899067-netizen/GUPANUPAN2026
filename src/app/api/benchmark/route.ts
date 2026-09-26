import { NextResponse } from "next/server";
import { PREVIEW_BENCHMARK, PRICING_COMPARISON, VS_BOLT_MATRIX } from "@/lib/bolt-killer";

export function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      preview: PREVIEW_BENCHMARK,
      pricing: PRICING_COMPARISON,
      matrix: VS_BOLT_MATRIX,
      summary: "GUPAN Hybrid เหนือ Bolt 11/15 — เร็ว 9x, ฟรี unlimited, 500+ models",
      timestamp: new Date().toISOString(),
    },
  });
}
