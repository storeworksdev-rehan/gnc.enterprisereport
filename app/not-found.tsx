"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Page Not Found" />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center text-center">
            {/* Large 404 */}
            <div className="relative mb-6 select-none">
              <span className="text-[10rem] font-black leading-none tracking-tighter text-slate-100">
                404
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-1.5 w-40 rounded-full bg-[#e31837] opacity-80" />
              </div>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-slate-800">
              Page not found
            </h1>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-400">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
              Head back to the dashboard to continue.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 rounded-lg bg-[#e31837] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#c91530] transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
