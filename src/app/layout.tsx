import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Task Tracking & Time Logging System",
  description: "Production-ready task tracking and time logging system for team platforms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full w-full flex-col overflow-x-hidden bg-slate-50/60 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
        <AuthProvider>
          <AuthGuard>
            <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
              <Navbar />
            </Suspense>
            <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
              <main className="flex-1 pb-16">{children}</main>
            </Suspense>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
