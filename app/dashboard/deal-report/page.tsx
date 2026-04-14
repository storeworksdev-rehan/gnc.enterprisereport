"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  Search,
  Filter,
  Download,
  TrendingDown,
  Tag,
  Hash,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  CalendarDays,
  TableIcon,
  BarChart2,
  Layers,
} from "lucide-react";
import DealAnalytics from "@/components/DealAnalytics";
import { API_BASE } from "@/lib/config";

interface ApiRow {
  LocationId: string;
  RegisterNumber: string;
  TransactionNumber: string;
  BusinessDate: string;
  ItemCode: string;
  "SALE AMOUNT": string;
  DiscountAmount: number;
  DealType: string;
  Quantity: number;
  Coupon: string;
  SmartCoupon: string;
  IsManualDiscount: number;
  ManualDiscountAmount: number;
  ManualDiscountPercentage: number;
  ReferenceIdentifier: string;
  DealName: string;
  EventNumber: string | null;
  DealNumber: string | null;
}

const n = (v: string | number) => parseFloat(String(v)) || 0;

const DEAL_TYPE_COLORS: Record<string, string> = {
  PromoCoupon: "bg-blue-100 text-blue-700",
  Promotion: "bg-emerald-100 text-emerald-700",
  Coupon: "bg-violet-100 text-violet-700",
  SmartCoupon: "bg-amber-100 text-amber-700",
};

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

const COL_COUNT = 15;

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
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
type Tab = "hierarchy" | "flat" | "analytics";

const FLAT_HEADERS = [
  "Location", "Register", "Transaction #", "Date", "Item Code",
  "Regular Amount", "Discount", "Deal Type", "Qty", "Coupon",
  "Smart Coupon", "Ref ID", "Deal Name", "Event #", "Deal #",
];

export default function DealReportPage() {
  const [data, setData] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("flat");

  // ── API-level filters ────────────────────────────────────────────
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [transactionNumber, setTransactionNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ── Searchable location multi-select ────────────────────────────
  const [locSearch, setLocSearch] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  // ── Location list ────────────────────────────────────────────────
  const [knownLocations, setKnownLocations] = useState<
    { Id: number; Name: string }[]
  >([]);

  // ── Client-side filters ──────────────────────────────────────────
  const [dealTypeFilter, setDealTypeFilter] = useState("All");
  const [page, setPage] = useState(1);

  // ── Hierarchy expansion state ────────────────────────────────────
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const enterpriseUser = JSON.parse(
      localStorage.getItem("enterprise_user") ?? "{}",
    );
    axios
      .get<{ Id: number; Name: string }[]>(
        `${API_BASE}/api/ITCentralServer/get-user-stores?regionIds=${enterpriseUser?.RegionIds ?? ""}`,
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
      .catch(() => {/* silently ignore */});
  }, []);

  // Auto-expand all locations when data changes
  useEffect(() => {
    const locs = new Set(data.map((r) => r.LocationId));
    setExpandedLocations(locs);
  }, [data]);

  const fetchData = (params: {
    LocationIds?: string;
    FromDate?: string;
    ToDate?: string;
    TransactionNumber?: string;
  }) => {
    setLoading(true);
    setError(null);
    axios
      .get<ApiRow[]>(`${API_BASE}/api/Tran/getDealReportData`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
        },
        params: {
          ...(params.LocationIds ? { LocationIds: params.LocationIds } : {}),
          ...(params.FromDate ? { FromDate: params.FromDate } : {}),
          ...(params.ToDate ? { ToDate: params.ToDate } : {}),
          ...(params.TransactionNumber ? { TransactionNumber: params.TransactionNumber } : {}),
        },
      })
      .then((res) => setData(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load deal data.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData({});
  }, []);

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
        (l.Id.toString() + "-" + l.Name)
          .toLowerCase()
          .includes(locSearch.toLowerCase()),
      ),
    [knownLocations, locSearch],
  );

  const toggleLocation = (locId: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  };

  const maskDate = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleApply = () => {
    setFilterError(null);
    if (transactionNumber && locationIds.length === 0) {
      setFilterError("Select at least one Location ID when filtering by Transaction #.");
      return;
    }
    const hasFrom = fromDate.length === 10;
    const hasTo = toDate.length === 10;
    if (fromDate && !hasFrom) {
      setFilterError("Enter a complete From Date (MM/DD/YYYY).");
      return;
    }
    if (toDate && !hasTo) {
      setFilterError("Enter a complete To Date (MM/DD/YYYY).");
      return;
    }
    if (fromDate && !toDate) {
      setFilterError("To Date is required when From Date is set.");
      return;
    }
    if (toDate && !fromDate) {
      setFilterError("From Date is required when To Date is set.");
      return;
    }
    setPage(1);
    fetchData({
      LocationIds: locationIds.length > 0 ? locationIds.join(",") : undefined,
      FromDate: fromDate || undefined,
      ToDate: toDate || undefined,
      TransactionNumber: transactionNumber || undefined,
    });
  };

  const handleClear = () => {
    setLocationIds([]);
    setTransactionNumber("");
    setFromDate("");
    setToDate("");
    setLocSearch("");
    setFilterError(null);
    setPage(1);
    fetchData({});
  };

  const filtered = useMemo(
    () =>
      data.filter((row) => {
        if (dealTypeFilter !== "All" && row.DealType !== dealTypeFilter)
          return false;
        return true;
      }),
    [data, dealTypeFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const totalSales = filtered.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0);
    const totalDiscount = filtered.reduce((s, r) => s + n(r.DiscountAmount), 0);
    const totalQty = filtered.reduce((s, r) => s + n(r.Quantity), 0);
    const uniqueTxns = new Set(filtered.map((r) => r.TransactionNumber)).size;
    return { totalSales, totalDiscount, totalQty, uniqueTxns };
  }, [filtered]);

  const dealTypes = useMemo(
    () => [...new Set(data.map((r) => r.DealType).filter(Boolean))].sort(),
    [data],
  );

  // ── Hierarchy grouping ───────────────────────────────────────────
  const hierarchyGroups = useMemo(() => {
    const groups: Record<string, ApiRow[]> = {};
    filtered.forEach((row) => {
      if (!groups[row.LocationId]) groups[row.LocationId] = [];
      groups[row.LocationId].push(row);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const hasFilters = locationIds.length > 0 || transactionNumber || fromDate || toDate;

  const handleExport = () => {
    const headers = [
      "Location", "Register", "Transaction #", "Date", "Item Code",
      "Regular Amount", "Discount Amount", "Deal Type", "Quantity", "Coupon",
      "Smart Coupon", "Reference ID", "Deal Name", "Event #", "Deal #",
    ];
    const escape = (v: string | null) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((r) =>
      [
        r.LocationId, r.RegisterNumber, r.TransactionNumber, r.BusinessDate,
        r.ItemCode, r["SALE AMOUNT"], String(r.DiscountAmount), r.DealType,
        String(r.Quantity), r.Coupon, r.SmartCoupon, r.ReferenceIdentifier,
        (r.DealName ?? "").trim(), r.EventNumber, r.DealNumber,
      ]
        .map(escape)
        .join(","),
    );
    const csv = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Location trigger label ───────────────────────────────────────
  const locTriggerLabel =
    locationIds.length === 0
      ? "All Locations"
      : locationIds.length === 1
        ? (knownLocations.find((l) => String(l.Id) === locationIds[0])?.Name ??
            locationIds[0])
        : `${locationIds.length} Locations selected`;

  return (
    <div className="space-y-5">
      {/* ── TOP FILTER BAR ── */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Location multi-select */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600">
              Location ID
            </label>
            <div className="relative" ref={locRef}>
              <button
                type="button"
                onClick={() => setLocOpen((v) => !v)}
                className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
              >
                <span className={locationIds.length > 0 ? "text-slate-900" : "text-slate-400"}>
                  {locTriggerLabel}
                </span>
                <div className="flex items-center gap-1">
                  {locationIds.length > 0 && (
                    <X
                      className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocationIds([]);
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
                <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-lg">
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
                  <ul className="max-h-52 overflow-y-auto py-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setLocationIds([]);
                          setLocSearch("");
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${locationIds.length === 0 ? "font-semibold text-[#E60D2E]" : "text-slate-600"}`}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={locationIds.length === 0}
                          className="h-3.5 w-3.5 accent-[#E60D2E] shrink-0"
                        />
                        All Locations
                      </button>
                    </li>
                    {filteredLocations.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        No results
                      </li>
                    ) : (
                      filteredLocations.map((loc) => {
                        const locIdStr = String(loc.Id);
                        const checked = locationIds.includes(locIdStr);
                        return (
                          <li key={loc.Id}>
                            <button
                              type="button"
                              onClick={() =>
                                setLocationIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== locIdStr)
                                    : [...prev, locIdStr],
                                )
                              }
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${checked ? "font-semibold text-[#E60D2E]" : "text-slate-700"}`}
                            >
                              <input
                                type="checkbox"
                                readOnly
                                checked={checked}
                                className="h-3.5 w-3.5 accent-[#E60D2E] shrink-0"
                              />
                              {loc.Id + "-" + loc.Name}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Transaction # */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-medium ${locationIds.length === 0 ? "text-slate-400" : "text-slate-600"}`}>
              Transaction #
              {locationIds.length === 0 && (
                <span className="ml-1 font-normal text-slate-400">(select a location first)</span>
              )}
            </label>
            <div className="relative">
              <Hash className={`absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${locationIds.length === 0 ? "text-slate-300" : "text-slate-400"}`} />
              <input
                type="text"
                value={transactionNumber}
                onChange={(e) => setTransactionNumber(e.target.value)}
                placeholder="Transaction #"
                disabled={locationIds.length === 0}
                className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition disabled:cursor-not-allowed disabled:opacity-40"
              />
              {transactionNumber && (
                <button
                  type="button"
                  onClick={() => setTransactionNumber("")}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              From Date
            </label>
            <div className="relative">
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(maskDate(e.target.value))}
                onClick={() => fromRef.current?.showPicker()}
                placeholder="MM/DD/YYYY"
                maxLength={10}
                className={`h-9 w-36 rounded-lg border bg-slate-50 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 transition ${filterError && ((fromDate && fromDate.length < 10) || (!fromDate && toDate)) ? "border-[#E60D2E] focus:border-[#E60D2E] focus:ring-[#E60D2E]/20" : "border-slate-200 focus:border-[#E60D2E] focus:ring-[#E60D2E]/20"}`}
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
            <label className="text-xs font-medium text-slate-600">
              To Date
            </label>
            <div className="relative">
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(maskDate(e.target.value))}
                onClick={() => toRef.current?.showPicker()}
                placeholder="MM/DD/YYYY"
                maxLength={10}
                className={`h-9 w-36 rounded-lg border bg-slate-50 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 transition ${filterError && ((toDate && toDate.length < 10) || (!toDate && fromDate)) ? "border-[#E60D2E] focus:border-[#E60D2E] focus:ring-[#E60D2E]/20" : "border-slate-200 focus:border-[#E60D2E] focus:ring-[#E60D2E]/20"}`}
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
          <div className="flex items-end gap-2">
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
          <p className="mt-3 text-xs font-medium text-[#E60D2E]">
            {filterError}
          </p>
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
                icon: Tag,
                color: "text-[#E60D2E] bg-red-50",
              },
              {
                label: "Total Discounts",
                value: fmt(kpis.totalDiscount),
                icon: TrendingDown,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Total Qty",
                value: String(kpis.totalQty),
                icon: Hash,
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
                { id: "flat", label: "Flat Table", icon: TableIcon },
                { id: "hierarchy", label: "Hierarchy View", icon: Layers },
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

          {tab === "flat" && (
            <div className="flex items-center gap-3 py-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={dealTypeFilter}
                onChange={(e) => {
                  setDealTypeFilter(e.target.value);
                  setPage(1);
                }}
                disabled={loading}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 disabled:opacity-50"
              >
                <option value="All">All Deal Types</option>
                {dealTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
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

          {tab === "hierarchy" && !loading && filtered.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => setExpandedLocations(new Set(hierarchyGroups.map(([id]) => id)))}
                className="text-xs text-slate-500 hover:text-[#E60D2E] transition-colors"
              >
                Expand all
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setExpandedLocations(new Set())}
                className="text-xs text-slate-500 hover:text-[#E60D2E] transition-colors"
              >
                Collapse all
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

        {/* ── HIERARCHY VIEW TAB ── */}
        {tab === "hierarchy" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="w-8 px-3 py-3" />
                  {FLAT_HEADERS.map((h) => (
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} cols={COL_COUNT + 1} />
                  ))
                ) : hierarchyGroups.length === 0 ? (
                  <tr>
                    <td colSpan={COL_COUNT + 1} className="px-4 py-12 text-center text-sm text-slate-400">
                      {error ? "Could not load data." : "No records match your filters."}
                    </td>
                  </tr>
                ) : (
                  hierarchyGroups.map(([locId, rows]) => {
                    const isExpanded = expandedLocations.has(locId);
                    const locName = knownLocations.find((l) => String(l.Id) === locId)?.Name ?? "";
                    const totalSale = rows.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0);
                    const totalDiscount = rows.reduce((s, r) => s + n(r.DiscountAmount), 0);
                    const totalQty = rows.reduce((s, r) => s + n(r.Quantity), 0);
                    const uniqueTxns = new Set(rows.map((r) => r.TransactionNumber)).size;

                    return (
                      <>
                        {/* Summary row */}
                        <tr
                          key={`loc-${locId}`}
                          className="cursor-pointer bg-slate-50/80 hover:bg-slate-100 transition-colors"
                          onClick={() => toggleLocation(locId)}
                        >
                          <td className="px-3 py-3 text-slate-400">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            {locId}{locName ? ` – ${locName}` : ""}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                            {uniqueTxns} txns
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {rows.length} items
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {fmt(totalSale)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {fmt(totalDiscount)}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {totalQty}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                        </tr>

                        {/* Detail rows */}
                        {isExpanded &&
                          rows.map((row, i) => {
                            const saleAmt = n(row["SALE AMOUNT"]);
                            const disc = n(row.DiscountAmount);
                            return (
                              <tr
                                key={`${locId}-${i}`}
                                className="hover:bg-slate-50 transition-colors border-l-2 border-l-slate-100"
                              >
                                <td className="px-3 py-2.5" />
                                <td className="px-4 py-2.5 text-slate-500 text-xs pl-6">
                                  └
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">
                                  {row.RegisterNumber}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
                                  {row.TransactionNumber}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                                  {row.BusinessDate}
                                </td>
                                <td className="px-4 py-2.5 font-medium text-slate-700">
                                  {row.ItemCode}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-medium ${saleAmt < 0 ? "text-rose-600" : "text-slate-900"}`}>
                                  {fmt(saleAmt)}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-medium ${disc < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                  {fmt(disc)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_TYPE_COLORS[row.DealType] ?? "bg-slate-100 text-slate-600"}`}>
                                    {row.DealType || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-700">
                                  {row.Quantity}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {row.Coupon || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {row.SmartCoupon || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {row.ReferenceIdentifier || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-slate-700">
                                  {row.DealName?.trim() || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {row.EventNumber}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {row.DealNumber}
                                </td>
                              </tr>
                            );
                          })}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── FLAT TABLE TAB ── */}
        {tab === "flat" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {FLAT_HEADERS.map((h) => (
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
                      <SkeletonRow key={i} cols={COL_COUNT} />
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={COL_COUNT}
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
                      const disc = n(row.DiscountAmount);
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
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {row.ItemCode}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${saleAmt < 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {fmt(saleAmt)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${disc < 0 ? "text-rose-600" : "text-emerald-600"}`}
                          >
                            {fmt(disc)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_TYPE_COLORS[row.DealType] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {row.DealType || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {row.Quantity}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.Coupon || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.SmartCoupon || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.ReferenceIdentifier || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {row.DealName?.trim() || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.EventNumber}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.DealNumber}
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
              <DealAnalytics data={data} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
