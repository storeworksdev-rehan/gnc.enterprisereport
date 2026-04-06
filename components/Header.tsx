"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, ChevronDown, LogOut, User, Moon, KeyRound } from "lucide-react";

interface HeaderProps {
  title: string;
}

interface StoredUser {
  UserId: number;
  Username: string;
  RoleId: number;
  RoleName: string;
}

export default function Header({ title }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("enterprise_user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("enterprise_auth_token");
    localStorage.removeItem("enterprise_user");
    window.location.href = "/";
  };

  const displayName = currentUser?.Username ?? "User";
  const roleName    = currentUser?.RoleName ?? "";
  const initials    = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-[#1a1a1a] px-6">
      {/* Title */}
      <h1 className="text-base font-semibold text-white">{title}</h1>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-9 w-56 rounded-lg border border-white/20 bg-white/10 pl-9 pr-4 text-sm text-white placeholder-slate-400 outline-none transition focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-slate-300 hover:bg-white/20 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E60D2E] text-xs font-semibold text-white">
              {initials}
            </div>
            <span className="hidden font-medium sm:block">{displayName}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-300 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-sm font-medium text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500">{roleName}</p>
              </div>
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <User className="h-4 w-4 text-slate-400" />
                Profile
              </button>
              <Link
                href="/dashboard/authentication/change-password"
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <KeyRound className="h-4 w-4 text-slate-400" />
                Change Password
              </Link>
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <Moon className="h-4 w-4 text-slate-400" />
                Preferences
              </button>
              <div className="border-t border-slate-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
