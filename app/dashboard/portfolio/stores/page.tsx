"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Search,
  Plus,
  Download,
  CheckCircle,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { API_BASE_API } from "@/lib/config";

interface ApiStore {
  Id: number;
  Name: string;
  Address?: string;
  City?: string;
  State?: string;
  Type?: string;
  Manager?: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  type: "Franchise" | "Corporate" | string;
  manager: string;
}

const FILTER_CHIPS = ["All Stores", "Franchise", "Corporate"] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
  };
}

function mapStore(s: ApiStore): Store {
  return {
    id: String(s.Id),
    name: s.Name ?? "—",
    location:
      [s.City, s.State].filter(Boolean).join(", ") || (s.Address ?? "—"),
    type: s.Type ?? "—",
    manager: s.Manager ?? "—",
  };
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("All Stores");

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = localStorage.getItem("enterprise_user");
      const userId: number = raw ? (JSON.parse(raw).UserId ?? 0) : 0;

      const { data } = await axios.get<ApiStore[]>(
        `${API_BASE_API}/api/Tran/getUserStores`,
        {
          params: { userId },
          headers: authHeaders(),
        },
      );

      setStores((Array.isArray(data) ? data : []).map(mapStore));
    } catch {
      setError("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filtered = stores.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      s.manager.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q);

    const matchChip = activeFilter === "All Stores" || s.type === activeFilter;

    return matchSearch && matchChip;
  });

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Stores
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? "Loading…"
              : `${stores.length} store${stores.length !== 1 ? "s" : ""} in your portfolio`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStores}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Stores",
            value: stores.length,
            color: "text-slate-900",
          },
          {
            label: "Franchise",
            value: stores.filter((s) => s.type === "Franchise").length,
            color: "text-amber-600",
          },
          {
            label: "Corporate",
            value: stores.filter((s) => s.type === "Corporate").length,
            color: "text-blue-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className={`mt-1.5 text-2xl font-bold ${color}`}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              ) : (
                value
              )}
            </p>
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
            placeholder="Search store, manager, ID…"
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

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Store cards grid ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-sm text-slate-400">
          {stores.length === 0
            ? "No stores found for your account."
            : "No stores match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((store) => (
            <div
              key={store.id}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:border-[#E60D2E] hover:shadow-md transition-all cursor-pointer overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 leading-tight">
                    {store.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    #{store.id} · {store.location}
                  </p>
                </div>
                <span className="ml-3 shrink-0 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {store.type}
                </span>
              </div>

              {/* Card body */}
              <div className="grid grid-cols-2 gap-3 px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Store ID
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {store.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Manager
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 truncate">
                    {store.manager}
                  </p>
                </div>
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {store.location}
                </span>
                <button className="flex items-center gap-1 text-xs font-semibold text-[#E60D2E] hover:text-[#c40a27] transition-colors opacity-0 group-hover:opacity-100">
                  <Eye className="h-3.5 w-3.5" />
                  Open store
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
