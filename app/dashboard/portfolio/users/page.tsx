"use client";

import { useState } from "react";
import {
  Search,
  Download,
  ShieldCheck,
  MapPin,
} from "lucide-react";

interface PortfolioUser {
  id: number;
  username: string;
  role: string;
  region: string;
  storeId: number;
  storeName: string;
}

const FILTER_CHIPS = ["All Users", "Admin", "Manager", "Staff"] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

const DUMMY_USERS: PortfolioUser[] = [
  { id: 1, username: "john.smith",    role: "Manager", region: "East",    storeId: 1001, storeName: "GNC – Downtown"      },
  { id: 2, username: "sara.jones",    role: "Staff",   region: "East",    storeId: 1001, storeName: "GNC – Downtown"      },
  { id: 3, username: "mike.davis",    role: "Manager", region: "West",    storeId: 1002, storeName: "GNC – Westfield"     },
  { id: 4, username: "emily.clark",   role: "Staff",   region: "West",    storeId: 1002, storeName: "GNC – Westfield"     },
  { id: 5, username: "chris.martin",  role: "Admin",   region: "Central", storeId: 1003, storeName: "GNC – Central Plaza" },
  { id: 6, username: "lisa.white",    role: "Manager", region: "Central", storeId: 1003, storeName: "GNC – Central Plaza" },
  { id: 7, username: "tom.brown",     role: "Staff",   region: "East",    storeId: 1004, storeName: "GNC – Eastgate"      },
  { id: 8, username: "anna.wilson",   role: "Staff",   region: "West",    storeId: 1005, storeName: "GNC – Lakeside"      },
  { id: 9, username: "james.taylor",  role: "Manager", region: "West",    storeId: 1005, storeName: "GNC – Lakeside"      },
];

function roleColor(role: string) {
  const map: Record<string, string> = {
    Admin: "bg-red-100 text-red-700",
    Manager: "bg-blue-100 text-blue-700",
    Staff: "bg-green-100 text-green-700",
  };
  return map[role] ?? "bg-slate-100 text-slate-600";
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export default function PortfolioUsersPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("All Users");

  const filtered = DUMMY_USERS.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.region.toLowerCase().includes(q) ||
      u.storeName.toLowerCase().includes(q) ||
      String(u.storeId).includes(q);

    const matchChip = activeFilter === "All Users" || u.role === activeFilter;

    return matchSearch && matchChip;
  });

  const roleCount = (role: string) =>
    DUMMY_USERS.filter((u) => u.role === role).length;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Users
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {`${DUMMY_USERS.length} user${DUMMY_USERS.length !== 1 ? "s" : ""} in your portfolio`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: DUMMY_USERS.length,  color: "text-slate-900" },
          { label: "Admins",      value: roleCount("Admin"),   color: "text-red-600"   },
          { label: "Managers",    value: roleCount("Manager"), color: "text-blue-600"  },
          { label: "Staff",       value: roleCount("Staff"),   color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, role, store…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
          />
        </div>
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={`h-9 rounded-lg border px-4 text-sm font-medium transition-colors ${
              activeFilter === chip
                ? "bg-[#E60D2E] border-[#E60D2E] text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* ── Users grid ── */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-sm text-slate-400">
          No users match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:border-[#E60D2E] hover:shadow-md transition-all overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 group-hover:bg-[#E60D2E]/10 group-hover:text-[#E60D2E] transition-colors">
                  {initials(user.username)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 leading-tight">
                    {user.username}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Store #{user.storeId}
                  </p>
                </div>
                <span
                  className={`ml-1 shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${roleColor(user.role)}`}
                >
                  {user.role}
                </span>
              </div>

              {/* Card body */}
              <div className="grid grid-cols-2 gap-3 px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Store
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 truncate">
                    {user.storeName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Region
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 truncate">
                    {user.region}
                  </p>
                </div>
              </div>

              {/* Card footer */}
              <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {user.role}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.region}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
