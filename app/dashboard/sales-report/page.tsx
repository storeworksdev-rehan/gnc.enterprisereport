"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Receipt,
  RefreshCw,
  TableIcon,
  BarChart2,
  ChevronDown,
  X,
  CalendarDays,
} from "lucide-react";
import SalesAnalyticsModal from "@/components/SalesAnalyticsModal";
import { API_BASE } from "@/lib/config";

interface ApiRow {
  LocationId: string;
  RegisterNumber: string;
  TransactionNumber: string;
  BusinessDate: string;
  TranType: string;
  ItemCode: string;
  "SALE AMOUNT": string;
  "UNITS SOLD": string;
  TAX: string;
  "TOTAL PER LINE": string;
  TENDER: string;
  "FINAL AMOUNT": string;
  "AUTH APPROVAL": string;
  "LAST FOUR": string;
}

const n = (v: string) => parseFloat(v) || 0;

const TRAN_TYPE_COLORS: Record<string, string> = {
  Sale: "bg-blue-100 text-blue-700",
  Employee: "bg-violet-100 text-violet-700",
  Return: "bg-rose-100 text-rose-700",
  TrainingMode: "bg-amber-100 text-amber-700",
};

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 14 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonKpi() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;
type Tab = "table" | "analytics";

export default function SalesReportPage() {
  const [data, setData] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("table");

  // ── API-level filters (sent to server) ──────────────────────────
  const [locationId, setLocationId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ── Searchable location select ───────────────────────────────────
  const [locSearch, setLocSearch] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const locRef     = useRef<HTMLDivElement>(null);
  const fromRef    = useRef<HTMLInputElement>(null);
  const toRef      = useRef<HTMLInputElement>(null);

  // ── Location list from API ───────────────────────────────────────
  const [knownLocations, setKnownLocations] = useState<
    { Id: number; Name: string }[]
  >([]);

  // ── Client-side filters (table tab) ─────────────────────────────
  const [processFilter, setProcessFilter] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    axios
      .post<{ Id: number; Name: string }[]>(
        `${API_BASE}/ITDashboard/GetStores`,
        { DivisionId: 0 },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
          },
        },
      )
      .then((res) => {
        const stores = (Array.isArray(res.data) ? res.data : []) as {
          Id: number;
          Name: string;
        }[];
        setKnownLocations(stores.filter((s) => s.Id !== -1));
      })
      .catch(() => {
        /* silently ignore — dropdown just stays empty */
      });
  }, []);

  const fetchData = (params: {
    LocationId?: string;
    FromDate?: string;
    ToDate?: string;
  }) => {
    setLoading(true);
    setError(null);
    axios
      .get<ApiRow[]>(`${API_BASE}/api/Tran/getTranSalesData`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
        },
        params: {
          ...(params.LocationId ? { LocationId: params.LocationId } : {}),
          ...(params.FromDate ? { FromDate: params.FromDate } : {}),
          ...(params.ToDate ? { ToDate: params.ToDate } : {}),
        },
      })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load sales data.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData({});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (locRef.current && !locRef.current.contains(e.target as Node))
        setLocOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredLocations = useMemo(
    () =>
      knownLocations.filter((l) =>
        l.Name.toLowerCase().includes(locSearch.toLowerCase()),
      ),
    [knownLocations, locSearch],
  );

  const handleApply = () => {
    setFilterError(null);
    const hasFrom = fromDate.length === 10;
    const hasTo   = toDate.length === 10;
    if (fromDate && !hasFrom) { setFilterError("Enter a complete From Date (MM/DD/YYYY)."); return; }
    if (toDate   && !hasTo)   { setFilterError("Enter a complete To Date (MM/DD/YYYY)."); return; }
    if (fromDate && !toDate)  { setFilterError("To Date is required when From Date is set."); return; }
    if (toDate   && !fromDate){ setFilterError("From Date is required when To Date is set."); return; }
    setPage(1);
    fetchData({ LocationId: locationId, FromDate: fromDate, ToDate: toDate });
  };

  const handleClear = () => {
    setLocationId("");
    setFromDate("");
    setToDate("");
    setLocSearch("");
    setFilterError(null);
    setPage(1);
    fetchData({});
  };

  // ── Client-side filtering on top of API results ──────────────────
  const filtered = useMemo(
    () =>
      data.filter((row) => {
        if (processFilter !== "All" && row.TranType !== processFilter)
          return false;
        return true;
      }),
    [data, processFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const sales = filtered.filter((r) => r.TranType === "Sale");
    const returns = filtered.filter((r) => r.TranType === "Return");
    return {
      totalSales: sales.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0),
      totalReturns: returns.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0),
      totalTax: filtered.reduce((s, r) => s + n(r.TAX), 0),
      uniqueTxns: new Set(filtered.map((r) => r.TransactionNumber)).size,
    };
  }, [filtered]);

  const hasFilters = locationId || fromDate || toDate;

  const maskDate = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleExport = () => {
    const headers = [
      "Location", "Register", "Transaction #", "Date", "Tran Type", "Item Code",
      "Sale Amount", "Units Sold", "Tax", "Total Per Line",
      "Tender", "Final Amount", "Auth Approval", "Last Four",
    ];
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((r) => [
      r.LocationId, r.RegisterNumber, r.TransactionNumber, r.BusinessDate,
      r.TranType, r.ItemCode, r["SALE AMOUNT"], r["UNITS SOLD"], r.TAX,
      r["TOTAL PER LINE"], r.TENDER, r["FINAL AMOUNT"], r["AUTH APPROVAL"], r["LAST FOUR"],
    ].map(escape).join(","));
    const csv = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* ── TOP FILTER BAR ── */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Location searchable select */}
          <div className="flex flex-col gap-1.5 min-w-50">
            <label className="text-xs font-medium text-slate-600">
              Location ID
            </label>
            <div className="relative" ref={locRef}>
              <button
                type="button"
                onClick={() => setLocOpen((v) => !v)}
                className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
              >
                <span
                  className={locationId ? "text-slate-900" : "text-slate-400"}
                >
                  {locationId
                    ? (knownLocations.find((l) => String(l.Id) === locationId)
                        ?.Name ?? locationId)
                    : "All Locations"}
                </span>
                <div className="flex items-center gap-1">
                  {locationId && (
                    <X
                      className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocationId("");
                        setLocSearch("");
                      }}
                    />
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${locOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {locOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                  {/* Search input inside dropdown */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        value={locSearch}
                        onChange={(e) => setLocSearch(e.target.value)}
                        placeholder="Search location…"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#E60D2E]"
                      />
                    </div>
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setLocationId("");
                          setLocSearch("");
                          setLocOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${!locationId ? "font-semibold text-[#E60D2E]" : "text-slate-600"}`}
                      >
                        All Locations
                      </button>
                    </li>
                    {filteredLocations.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        No results
                      </li>
                    ) : (
                      filteredLocations.map((loc) => (
                        <li key={loc.Id}>
                          <button
                            type="button"
                            onClick={() => {
                              setLocationId(String(loc.Id));
                              setLocSearch("");
                              setLocOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${locationId === String(loc.Id) ? "font-semibold text-[#E60D2E]" : "text-slate-700"}`}
                          >
                            {loc.Name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">From Date</label>
            <div className="relative">
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(maskDate(e.target.value))}
                onClick={() => fromRef.current?.showPicker()}
                placeholder="MM/DD/YYYY"
                maxLength={10}
                className={`h-9 w-36 rounded-lg border bg-slate-50 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 transition ${filterError && (fromDate && fromDate.length < 10 || !fromDate && toDate) ? "border-[#E60D2E] focus:border-[#E60D2E] focus:ring-[#E60D2E]/20" : "border-slate-200 focus:border-[#E60D2E] focus:ring-[#E60D2E]/20"}`}
              />
              <button
                type="button"
                onClick={() => fromRef.current?.showPicker()}
                className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-[#E60D2E] transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
              <input
                ref={fromRef}
                type="date"
                className="absolute inset-0 opacity-0 pointer-events-none"
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split("-");
                  if (y && m && d) setFromDate(`${m}/${d}/${y}`);
                }}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">To Date</label>
            <div className="relative">
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(maskDate(e.target.value))}
                onClick={() => toRef.current?.showPicker()}
                placeholder="MM/DD/YYYY"
                maxLength={10}
                className={`h-9 w-36 rounded-lg border bg-slate-50 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 transition ${filterError && (toDate && toDate.length < 10 || !toDate && fromDate) ? "border-[#E60D2E] focus:border-[#E60D2E] focus:ring-[#E60D2E]/20" : "border-slate-200 focus:border-[#E60D2E] focus:ring-[#E60D2E]/20"}`}
              />
              <button
                type="button"
                onClick={() => toRef.current?.showPicker()}
                className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-[#E60D2E] transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
              <input
                ref={toRef}
                type="date"
                className="absolute inset-0 opacity-0 pointer-events-none"
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split("-");
                  if (y && m && d) setToDate(`${m}/${d}/${y}`);
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2 pb-0">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-lg bg-[#E60D2E] px-4 text-sm font-semibold text-white hover:bg-[#c40a27] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
            {hasFilters && (
              <button
                onClick={handleClear}
                disabled={loading}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
        {filterError && (
          <p className="mt-3 text-xs font-medium text-[#E60D2E]">{filterError}</p>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)
          : [
              {
                label: "Total Sales",
                value: fmt(kpis.totalSales),
                icon: TrendingUp,
                color: "text-[#E60D2E] bg-red-50",
              },
              {
                label: "Total Returns",
                value: fmt(kpis.totalReturns),
                icon: TrendingDown,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Total Tax",
                value: fmt(kpis.totalTax),
                icon: Receipt,
                color: "text-amber-600 bg-amber-50",
              },
              {
                label: "Transactions",
                value: String(kpis.uniqueTxns),
                icon: RefreshCw,
                color: "text-violet-600 bg-violet-50",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                </div>
              </div>
            ))}
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5">
          <div className="flex">
            {(
              [
                { id: "table", label: "Data Table", icon: TableIcon },
                { id: "analytics", label: "Analytics", icon: BarChart2 },
              ] as { id: Tab; label: string; icon: React.ElementType }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-medium transition-colors ${
                  tab === id
                    ? "border-[#E60D2E] text-[#E60D2E]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Client-side filters — only on table tab */}
          {tab === "table" && (
            <div className="flex flex-wrap items-center gap-3 py-2">
              <Filter className="h-4 w-4 text-slate-400" />

              <select
                value={processFilter}
                onChange={(e) => {
                  setProcessFilter(e.target.value);
                  setPage(1);
                }}
                disabled={loading}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 disabled:opacity-50"
              >
                <option value="All">All Tran Types</option>
                <option value="Sale">Sale</option>
                <option value="Employee">Employee</option>
                <option value="Return">Return</option>
                <option value="TrainingMode">Training Mode</option>
              </select>

              <button
                onClick={handleExport}
                disabled={loading || filtered.length === 0}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── TABLE TAB ── */}
        {tab === "table" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {[
                      "Location",
                      "Register",
                      "Transaction #",
                      "Date",
                      "Tran Type",
                      "Item Code",
                      "Sale Amount",
                      "Units",
                      "Tax",
                      "Total / Line",
                      "Tender",
                      "Final Amount",
                      "Auth",
                      "Last Four",
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-4 py-12 text-center text-sm text-slate-400"
                      >
                        {error
                          ? "Could not load data."
                          : "No records match your filters."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row, i) => {
                      const saleAmt = n(row["SALE AMOUNT"]);
                      const totalLine = n(row["TOTAL PER LINE"]);
                      const finalAmt = row["FINAL AMOUNT"];
                      return (
                        <tr
                          key={i}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-700">
                            {row.LocationId}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.RegisterNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                            {row.TransactionNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {row.BusinessDate}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TRAN_TYPE_COLORS[row.TranType] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {row.TranType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {row.ItemCode}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${saleAmt < 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {fmt(saleAmt)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${n(row["UNITS SOLD"]) < 0 ? "text-rose-600" : "text-slate-700"}`}
                          >
                            {row["UNITS SOLD"]}
                          </td>
                          <td className={`px-4 py-3 text-right ${n(row.TAX) < 0 ? "text-rose-600" : "text-slate-600"}`}>
                            {fmt(n(row.TAX))}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${totalLine < 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {fmt(totalLine)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                            {row.TENDER || "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${!finalAmt ? "text-slate-300" : n(finalAmt) < 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {finalAmt ? fmt(n(finalAmt)) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row["AUTH APPROVAL"] || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row["LAST FOUR"] || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">
                {loading
                  ? "Loading…"
                  : filtered.length === 0
                    ? "0 records"
                    : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} records`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="h-7 w-7 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  ‹
                </button>
                {(() => {
                  const delta = 2;
                  const rangeSet = new Set<number>();
                  [
                    1,
                    totalPages,
                    ...Array.from(
                      { length: delta * 2 + 1 },
                      (_, i) => page - delta + i,
                    ),
                  ]
                    .filter((p) => p >= 1 && p <= totalPages)
                    .forEach((p) => rangeSet.add(p));
                  const range: (number | "…")[] = [];
                  [...rangeSet]
                    .sort((a, b) => a - b)
                    .forEach((p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) range.push("…");
                      range.push(p);
                    });
                  return range.map((item, idx) =>
                    item === "…" ? (
                      <span
                        key={`e-${idx}`}
                        className="px-1 text-xs text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        disabled={loading}
                        className={`h-7 min-w-7 rounded-md border px-1 text-xs transition-colors ${item === page ? "border-[#E60D2E] bg-[#E60D2E] text-white font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        {item}
                      </button>
                    ),
                  );
                })()}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="h-7 w-7 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-sm text-slate-400">
                Loading data…
              </div>
            ) : data.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-sm text-slate-400">
                No data available.
              </div>
            ) : (
              <SalesAnalyticsModal
                data={data}
                onClose={() => setTab("table")}
                inline
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
