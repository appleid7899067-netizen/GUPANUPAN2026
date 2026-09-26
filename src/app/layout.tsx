// src/app/layout.tsx — hybrid Puter + Totalum
import React from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import { Toaster } from "@/components/ui/sonner";
import { InsufficientCreditsModal } from "@/components/workspace/InsufficientCreditsModal";
import { PuterProvider } from "@/components/PuterProvider";

export const metadata: Metadata = {
  title: "GUPAN Studio — AI Web Builder",
  description: "สร้างเว็บด้วย AI แก้โค้ด ดูพรีวิว และส่งออกโปรเจกต์ของคุณ",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090d",
};

// SUPER IMPORTANT: NOT EDIT THE FOLLOWING 2 LINES TO FORCE NEXT.JS TO RENDER DYNAMICALLY
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Puter.js — keyless backend for AI, storage, hosting. Loaded globally so hybrid mode works without any server key. */}
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className="antialiased">
        <PuterProvider>
          <GlobalErrorCatcher />
          <Toaster position="top-right" richColors />
          {/*
            ⭐ MOUNTED ONCE FOR THE WHOLE APP. Running out of credits can happen on any
            screen — the dashboard creating a project, the workspace publishing one — and
            the modal listens for the event the VCaaS client raises rather than being wired
            per page. See `InsufficientCreditsModal`.
          */}
          <InsufficientCreditsModal />
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
          </div>
        </PuterProvider>
      </body>
    </html>
  );
}
