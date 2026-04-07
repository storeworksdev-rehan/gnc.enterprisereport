"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { API_BASE_API as API_BASE } from "@/lib/config";

interface StoredUser {
  UserId: number;
  Username: string;
  RoleId: number;
  RoleName: string;
}

type Status = "idle" | "saving" | "success" | "error";

export default function ChangePasswordPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [form, setForm] = useState({
    CurrentPassword: "",
    NewPassword: "",
    ConfirmPassword: "",
  });
  const [show, setShow] = useState({
    CurrentPassword: false,
    NewPassword: false,
    ConfirmPassword: false,
  });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("enterprise_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const mismatch =
    form.NewPassword &&
    form.ConfirmPassword &&
    form.NewPassword !== form.ConfirmPassword;
  const canSubmit =
    form.CurrentPassword.trim() &&
    form.NewPassword.trim() &&
    form.ConfirmPassword.trim() &&
    !mismatch &&
    status !== "saving" &&
    user !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    setStatus("saving");
    setMessage("");

    try {
      await axios.post(`${API_BASE}/api/auth/change-password`, {
        UserId: user.UserId,
        CurrentPassword: form.CurrentPassword,
        NewPassword: form.NewPassword,
      });

      setStatus("success");
      setMessage("Password changed successfully.");
      setForm({ CurrentPassword: "", NewPassword: "", ConfirmPassword: "" });
    } catch (err: unknown) {
      setStatus("error");
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setMessage(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to change password. Please check your current password and try again.",
      );
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder: string,
    hint?: string,
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show[key] ? "text" : "password"}
          value={form[key]}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            if (status !== "idle") {
              setStatus("idle");
              setMessage("");
            }
          }}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition
            focus:ring-2 focus:ring-[#e31837]/20 focus:border-[#e31837]
            ${key === "ConfirmPassword" && mismatch ? "border-red-400" : "border-slate-300"}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
          tabIndex={-1}
        >
          {show[key] ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {key === "ConfirmPassword" && mismatch && (
        <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
      )}
    </div>
  );

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e31837]/10">
              <KeyRound className="h-4 w-4 text-[#e31837]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Change Password
              </p>
              {user && (
                <p className="text-xs text-slate-400">
                  Signed in as{" "}
                  <span className="font-medium text-slate-600">
                    {user.Username}
                  </span>
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {field(
              "CurrentPassword",
              "Current Password",
              "Enter your current password",
            )}
            {field(
              "NewPassword",
              "New Password",
              "Enter a new password",
              "Minimum 6 characters recommended.",
            )}
            {field(
              "ConfirmPassword",
              "Confirm New Password",
              "Re-enter your new password",
            )}

            {/* Feedback banner */}
            {message && (
              <div
                className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm border ${
                  status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {status === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                )}
                <span>{message}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                onClick={() => {
                  if (!canSubmit) return;
                }}
                className={`btn btn-primary flex items-center gap-2 ${!canSubmit ? "disabled" : ""}`}
              >
                {status === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" /> Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Your session will remain active after changing your password.
        </p>
      </div>
    </div>
  );
}
