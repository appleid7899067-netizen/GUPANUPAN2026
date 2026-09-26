import { NextResponse } from "next/server";
import { getVcaasApiKey } from "@/lib/vcaas-server";

// Reports whether the builder is configured — WITHOUT ever exposing the key.
// Hybrid: returns configured=true if EITHER Totalum key OR Puter mode is available.
// Client checks this to decide whether to show setup guidance.
export function GET() {
  const totalumConfigured = getVcaasApiKey().trim().length > 0;
  // Puter is client-side, so server can't detect it directly — but we can hint
  // that Puter hosting is available as fallback by checking an env flag.
  const puterEnabled = process.env.NEXT_PUBLIC_PUTER_ENABLED !== "0" && process.env.PUTER_ENABLED !== "0";
  // If Totalum is configured, that's primary. Otherwise, tell client Puter is available
  // so it can show the hybrid banner instead of the Totalum-only setup card.
  return NextResponse.json({
    ok: true,
    data: {
      configured: totalumConfigured || puterEnabled,
      totalumConfigured,
      puterEnabled,
      mode: totalumConfigured ? "totalum" : puterEnabled ? "puter" : "unconfigured",
    },
  });
}
