"use client";

import { FormEvent, useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { API_BASE } from "@/lib/config";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        username: email,
        password: password,
      });

      const { token, UserId, Username, RoleId, RoleName } =
        response?.data ?? {};
      if (token) {
        localStorage.setItem("enterprise_auth_token", token);
      }
      if (UserId !== undefined) {
        localStorage.setItem(
          "enterprise_user",
          JSON.stringify({ UserId, Username, RoleId, RoleName }),
        );
      }

      setStatus("success");
      setMessage("Login successful. Redirecting…");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (error: unknown) {
      setStatus("error");

      const safeError = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      const status = safeError?.response?.status;
      setMessage(
        status === 401
          ? "Incorrect username or password. Please try again."
          : safeError?.response?.data?.message ||
              safeError?.message ||
              "Login failed. Check your credentials or API server status.",
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#1a1a1a] px-12 py-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#E60D2E] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-white"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            GNC Enterprise
          </span>
        </div>

        <div>
          <blockquote className="text-slate-300 text-xl font-light leading-relaxed">
            "Centralised reporting and analytics built for enterprise-scale
            operations."
          </blockquote>
          <p className="mt-4 text-slate-500 text-sm">
            GNC Enterprise Platform &mdash; Internal Use Only
          </p>
        </div>

        <p className="text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} GNC. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="h-7 w-7 rounded-md bg-[#E60D2E] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-white"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">GNC Enterprise</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to your account
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Use your corporate credentials to continue.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-[#E60D2E] hover:text-[#c40a27] transition"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-md bg-[#E60D2E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c40a27] focus:outline-none focus:ring-2 focus:ring-[#E60D2E] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-md px-4 py-3 text-sm ${
                status === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {status === "success" ? (
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{message}</span>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Protected by GNC Security &middot; Internal network access only
          </p>
        </div>
      </div>
    </div>
  );
}
