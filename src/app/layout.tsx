// src/app/layout.tsx — hybrid Puter + Totalum
import React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import { Toaster } from "@/components/ui/sonner";
import { InsufficientCreditsModal } from "@/components/workspace/InsufficientCreditsModal";
import { PuterProvider } from "@/components/PuterProvider";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VibeBuild — AI App Builder",
  description: "Build apps with AI. Describe what you want, preview in real-time, deploy with one click.",
};

// SUPER IMPORTANT: NOT EDIT THE FOLLOWING 2 LINES TO FORCE NEXT.JS TO RENDER DYNAMICALLY
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Puter.js — keyless backend for AI, storage, hosting. Loaded globally so hybrid mode works without any server key. */}
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className={`${dmSans.variable} ${geistMono.variable} antialiased`}>
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
