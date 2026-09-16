"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import axios from "axios";
import {
  Search,
  ChevronDown,
  CalendarDays,
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sigma,
  Box,
  Undo2,
  Award,
  Target,
  Crown,
  Percent,
  Repeat,
  Pill,
  Droplet,
  Receipt,
} from "lucide-react";
import { API_BASE } from "@/lib/config";

// Static store list for the location filter UI — swap for a real
// store-master API call once one is available (KPI values themselves
// already come from GET /api/Tran/getDashboardReportDummy below).
const STORES = [
  { Id: "01709", Name: "Store 01709" },
  { Id: "02115", Name: "Store 02115" },
  { Id: "03683", Name: "Store 03683" },
  { Id: "04521", Name: "Store 04521" },
  { Id: "05893", Name: "Store 05893" },
  { Id: "06217", Name: "Store 06217" },
  { Id: "07348", Name: "Store 07348" },
  { Id: "08652", Name: "Store 08652" },
];

// Org-hierarchy rollups for the sample stores, so the location filter can
// select a whole Corp/Fran/Division/Region group at once, not just single
// stores. Real store-master data would drive this in production. Each
// dimension partitions all 8 stores differently, so no two groups share
// the exact same membership — otherwise checking one would always show an
// unrelated group as checked too.
const STORE_GROUPS: Record<string, { label: string; stores: string[] }> = {
  corp: { label: "Corp Stores", stores: ["01709", "02115", "03683", "04521"] },
  fran: { label: "Fran Stores", stores: ["05893", "06217", "07348", "08652"] },
  div1: { label: "Division 1", stores: ["01709", "03683", "05893", "07348"] },
  div2: { label: "Division 2", stores: ["02115", "04521", "06217", "08652"] },
  dist1: { label: "District 1", stores: ["01709", "04521", "06217", "07348"] },
  dist2: { label: "District 2", stores: ["02115", "03683", "05893", "08652"] },
  reg1: { label: "Region 1", stores: ["01709", "02115", "05893", "08652"] },
  reg2: { label: "Region 2", stores: ["03683", "04521", "06217", "07348"] },
};

// Shape of GET /api/Tran/getDashboardReportDummy — see DashboardReport.sql.
// Table1 = sale-side metrics, Table2 = loyalty / subscription sign-ups,
// Table3 = return-side totals. Each is a single-row array.
interface DashboardSaleMetrics {
  TotalSaleAmount: number;
  TransactionCount: number;
  AvgSaleAmount: number;
  AvgUnitsPerTransaction: number;
  MultiVitaminsSold: number;
  FishOilSold: number;
  TotalTaxCollected: number;
  TotalUnitsSold: number;
  LastYearTotalSaleAmount: number;
  LastYearTransactionCount: number;
}
interface DashboardLoyaltyMetrics {
  NewSubscriptions: number;
  MyRewards: number;
  ProAccess: number;
  CancelledSubscriptions: number;
}
interface DashboardReturnMetrics {
  TotalSaleAmount: number;
  TransactionCount: number;
  NewSubscriptions: number;
}
interface DashboardReportResponse {
  Table1: DashboardSaleMetrics[];
  Table2: DashboardLoyaltyMetrics[];
  Table3: DashboardReturnMetrics[];
}

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pctOr = (num: number, den: number) =>
  den ? `${((num / den) * 100).toFixed(1)}%` : "—";

type RangeKey =
  | "today"
  | "thisweek"
  | "lastweek"
  | "thismonth"
  | "lastmonth"
  | "thisyear"
  | "custom";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "thisweek", label: "This Week" },
  { value: "lastweek", label: "Last Week" },
  { value: "thismonth", label: "This Month" },
  { value: "lastmonth", label: "Last Month" },
  { value: "thisyear", label: "This Year" },
  { value: "custom", label: "Custom…" },
];

function toMMDDYYYY(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}
function mmddyyyyToISO(s: string) {
  if (s.length !== 10) return "";
  const [m, d, y] = s.split("/");
  return `${y}-${m}-${d}`;
}
// Auto-formats digits typed into a date field as MM/DD/YYYY.
function maskDate(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Resolves a preset key into {from, to} MM/DD/YYYY strings (Mon-start weeks).
// Returns null for "custom" — caller keeps whatever the user picked.
function resolveRange(key: RangeKey): { from: string; to: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  let from: Date, to: Date;

  switch (key) {
    case "today":
      from = to = new Date(y, m, d);
      break;
    case "thisweek": {
      const dow = (now.getDay() + 6) % 7; // 0 = Monday
      from = new Date(y, m, d - dow);
      to = new Date(y, m, d);
      break;
    }
    case "lastweek": {
      const dow = (now.getDay() + 6) % 7;
      from = new Date(y, m, d - dow - 7);
      to = new Date(y, m, d - dow - 1);
      break;
    }
    case "thismonth":
      from = new Date(y, m, 1);
      to = new Date(y, m, d);
      break;
    case "lastmonth":
      from = new Date(y, m - 1, 1);
      to = new Date(y, m, 0);
      break;
    case "thisyear":
      from = new Date(y, 0, 1);
      to = new Date(y, m, d);
      break;
    default:
      return null;
  }
  return { from: toMMDDYYYY(from), to: toMMDDYYYY(to) };
}

// [Tran].[DailyDashboard] takes a single @DateRangeType instead of separate
// From/To params, so the preset keys map straight across. There's no known
// convention yet for passing a custom range through that one parameter —
// this encodes it as "Custom:<fromISO>:<toISO>" as a placeholder; update
// this (and the matching @Debug=1 branch in DashboardReport.sql) once the
// real procedure's actual convention is confirmed.
const DATE_RANGE_TYPE_MAP: Record<Exclude<RangeKey, "custom">, string> = {
  today: "Today",
  thisweek: "ThisWeek",
  lastweek: "LastWeek",
  thismonth: "ThisMonth",
  lastmonth: "LastMonth",
  thisyear: "ThisYear",
};
function toDateRangeType(key: RangeKey, from: string, to: string): string {
  if (key === "custom") {
    return `Custom:${mmddyyyyToISO(from)}:${mmddyyyyToISO(to)}`;
  }
  return DATE_RANGE_TYPE_MAP[key];
}

// A checkbox that also supports a visual "indeterminate" (partially
// checked) state — not expressible as a plain prop in the DOM, so it's set
// imperatively on the element. Renders a real controlled input (checked +
// onChange) rather than a "readOnly" one wrapped in a clickable <button> —
// the HTML `readonly` attribute has no effect on checkboxes/radios, so a
// readOnly checkbox nested in a button can still toggle itself natively on
// click, racing the button's own onClick and leaving the two out of sync.
function TriCheckbox({
  checked,
  indeterminate = false,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-3.5 w-3.5 accent-[#E60D2E] shrink-0"
    />
  );
}

// ── Card building blocks ────────────────────────────────────────────

const ACCENTS = {
  green: { text: "text-[#059669]", iconBg: "bg-[#dcfce7]" },
  blue: { text: "text-[#1d4ed8]", iconBg: "bg-[#dbeafe]" },
  purple: { text: "text-[#7c3aed]", iconBg: "bg-[#f5f3ff]" },
  cyan: { text: "text-[#0891b2]", iconBg: "bg-[#ecfeff]" },
  red: { text: "text-[#dc2626]", iconBg: "bg-[#fee2e2]" },
  pro: { text: "text-[#7e22ce]", iconBg: "bg-[#fdf4ff]" },
  teal: { text: "text-[#0d9488]", iconBg: "bg-[#ccfbf1]" },
  amber: { text: "text-[#d97706]", iconBg: "bg-[#fef3c7]" },
  sky: { text: "text-[#0284c7]", iconBg: "bg-[#e0f2fe]" },
} as const;
type Accent = keyof typeof ACCENTS;

function BreakRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  accent: Accent;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="flex w-full items-center justify-between gap-2 text-[13px]">
      <span className={`flex items-center gap-1 font-medium ${a.text}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className={`font-bold ${a.text}`}>{value}</span>
    </div>
  );
}

function YoyBlock({
  curVal,
  lyVal,
  fmtFn,
  color,
}: {
  curVal: number;
  lyVal: number;
  fmtFn: (v: number) => string;
  color: string;
}) {
  const scale = Math.max(curVal, lyVal, 0.0001);
  const fillPct = Math.max(0, Math.min(100, (curVal / scale) * 100));
  const markPct = Math.max(0, Math.min(100, (lyVal / scale) * 100));
  // The tick sits at the exact position; the label next to it is nudged
  // inward near the edges so it doesn't spill outside the track.
  const labelPct = Math.max(6, Math.min(94, markPct));
  const pct = lyVal ? (curVal / lyVal) * 100 : curVal ? 100 : 0;
  const ahead = pct >= 100;
  return (
    <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
      <div className="relative mt-3.5 mb-1.5 h-2.5 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${fillPct}%`, backgroundColor: color }}
        />
        <div
          className="absolute -top-[3px] -bottom-[3px] w-[2px] bg-slate-700"
          style={{ left: `${markPct}%` }}
        />
        <span
          className="absolute -top-[13px] -translate-x-1/2 whitespace-nowrap text-[8px] font-bold text-slate-700"
          style={{ left: `${labelPct}%` }}
        >
          100%
        </span>
      </div>
      <div className="text-center text-[10.5px] text-slate-500">
        Last Year: {fmtFn(lyVal)}
      </div>
      <div
        className={`text-center text-base font-bold ${ahead ? "text-emerald-600" : "text-red-600"}`}
      >
        {pct.toFixed(1)}%{" "}
        <span className="text-[10.5px] font-medium text-slate-400">
          of last year
        </span>
      </div>
    </div>
  );
}

function DbCard({
  icon: Icon,
  accent,
  label,
  value,
  sub,
  children,
}: {
  icon: ElementType;
  accent: Accent;
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div
        className={`mb-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${a.iconBg} ${a.text}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-base font-bold text-slate-900">{label}</div>
      <div className={`text-2xl font-bold leading-tight ${a.text}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] leading-tight text-slate-400">{sub}</div>
      )}
      {children}
    </div>
  );
}

// Plain per-store selection state: true = selected, false = unselected.
// Every store starts selected (== "All Stores").
function allSelected(): Record<string, boolean> {
  return Object.fromEntries(STORES.map((s) => [s.Id, true]));
}

export default function DashboardPage() {
  const [selected, setSelected] =
    useState<Record<string, boolean>>(allSelected);
  const [locOpen, setLocOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setLocOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [rangeKey, setRangeKey] = useState<RangeKey>("today");
  const initial = resolveRange("today")!;
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const customFromRef = useRef<HTMLInputElement>(null);
  const customToRef = useRef<HTMLInputElement>(null);

  // Applied filters — only change when Search is clicked, matching the rest
  // of the app's filter-bar behavior. The applied store selection itself
  // doesn't need to be held in state — it's read straight off `selected`
  // and sent to fetchDashboard() at the moment Search is clicked.
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);

  // ── Dashboard data from the API ─────────────────────────────────────
  const [report, setReport] = useState<DashboardReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = (params: {
    DateRangeType?: string;
    LocationName?: string;
    Debug?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    axios
      .get<DashboardReportResponse>(
        `${API_BASE}/api/Tran/getDashboardReportDummy`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
          },
          params: {
            ...(params.DateRangeType
              ? { DateRangeType: params.DateRangeType }
              : {}),
            ...(params.LocationName
              ? { LocationName: params.LocationName }
              : {}),
            Debug: params.Debug ? 1 : 0,
          },
        },
      )
      .then((res) => {
        setReport(res.data);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load dashboard data.",
        );
      })
      .finally(() => setLoading(false));
  };

  // Initial load with the default ("Today") filters.
  useEffect(() => {
    fetchDashboard({
      DateRangeType: toDateRangeType("today", initial.from, initial.to),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (key: RangeKey) => {
    setRangeKey(key);
    const r = resolveRange(key);
    if (r) {
      setFromDate(r.from);
      setToDate(r.to);
    }
  };

  const handleSearch = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);

    const chosenIds = STORES.filter((s) => selected[s.Id]).map((s) => s.Id);
    fetchDashboard({
      DateRangeType: toDateRangeType(rangeKey, fromDate, toDate),
      LocationName:
        chosenIds.length < STORES.length ? chosenIds.join(",") : undefined,
    });
  };

  // The two lists a reader actually cares about — which stores are checked
  // and which aren't — read directly off the plain selection object.
  const selectedIds = STORES.filter((s) => selected[s.Id]).map((s) => s.Id);
  const unselectedIds = STORES.filter((s) => !selected[s.Id]).map((s) => s.Id);

  const toggleStore = (id: string) => {
    setSelected((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const anySelected = STORES.some((s) => next[s.Id]);
      return anySelected ? next : prev; // never allow zero stores selected
    });
  };

  const isGroupChecked = (key: string) =>
    STORE_GROUPS[key].stores.every((id) => selected[id]);
  const isGroupIndeterminate = (key: string) => {
    const members = STORE_GROUPS[key].stores;
    const count = members.filter((id) => selected[id]).length;
    return count > 0 && count < members.length;
  };

  const toggleGroup = (key: string) => {
    const members = STORE_GROUPS[key].stores;
    const full = isGroupChecked(key);
    setSelected((prev) => {
      const next = { ...prev };
      members.forEach((id) => {
        next[id] = !full;
      });
      const anySelected = STORES.some((s) => next[s.Id]);
      return anySelected ? next : prev; // never allow zero stores selected
    });
  };

  const locTriggerLabel = (() => {
    if (selectedIds.length === STORES.length) return "All Stores";
    if (selectedIds.length === 1) {
      return (
        STORES.find((l) => l.Id === selectedIds[0])?.Name ?? selectedIds[0]
      );
    }
    const sorted = [...selectedIds].sort();
    const matchKey = Object.keys(STORE_GROUPS).find((key) => {
      const members = [...STORE_GROUPS[key].stores].sort();
      return (
        members.length === sorted.length &&
        members.every((m, i) => m === sorted[i])
      );
    });
    return matchKey
      ? STORE_GROUPS[matchKey].label
      : `${selectedIds.length} Stores selected`;
  })();

  // ── KPI values straight off the API response ────────────────────────
  // Every Table is a single summary row for the currently applied filters
  // (see DashboardReport.sql) — no client-side aggregation needed anymore.
  const sale = report?.Table1?.[0];
  const loyalty = report?.Table2?.[0];
  const ret = report?.Table3?.[0];

  const netSales = sale?.TotalSaleAmount ?? 0;
  const saleTxnCount = sale?.TransactionCount ?? 0;
  const avgSale = sale?.AvgSaleAmount ?? 0;
  const avgUnits = sale?.AvgUnitsPerTransaction ?? 0;
  const unitsSold = sale?.TotalUnitsSold ?? 0;
  const multiSales = sale?.MultiVitaminsSold ?? 0;
  const fishSales = sale?.FishOilSold ?? 0;
  const totalTax = sale?.TotalTaxCollected ?? 0;
  const lyNetSales = sale?.LastYearTotalSaleAmount ?? 0;
  const lySalesCount = sale?.LastYearTransactionCount ?? 0;

  const netReturns = ret?.TotalSaleAmount ?? 0;
  const returnTxnCount = ret?.TransactionCount ?? 0;

  const myRewardsSignups = loyalty?.MyRewards ?? 0;
  const proAccessSignups = loyalty?.ProAccess ?? 0;
  const newSubscriptions = loyalty?.NewSubscriptions ?? 0;
  const cancelledSubscriptions = loyalty?.CancelledSubscriptions ?? 0;

  // The API doesn't expose a dedicated non-loyalty customer count, so total
  // customer transactions (sale + return) stands in as the denominator for
  // "Loyalty Sign-Up Opportunity %" until one is added.
  const totalCustomerTxns = saleTxnCount + returnTxnCount;

  const kpis = {
    netSales,
    netReturns,
    totalTax,
    saleTxnCount,
    returnTxnCount,
    unitsSold,
    avgSale,
    avgUnits,
    multiSales,
    fishSales,
    nonLoyalty: totalCustomerTxns,
    rewards: { myRewards: myRewardsSignups, pro: proAccessSignups },
    subs: { total: newSubscriptions, cancelled: cancelledSubscriptions },
    lyNetSales,
    lySalesCount,
  };

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Store multi-select */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600">
              Location
            </label>
            <div className="relative" ref={locRef}>
              <button
                type="button"
                onClick={() => setLocOpen((v) => !v)}
                className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
              >
                <span
                  className={
                    unselectedIds.length > 0
                      ? "text-slate-900"
                      : "text-slate-400"
                  }
                >
                  {locTriggerLabel}
                </span>
                <div className="flex items-center gap-1">
                  {unselectedIds.length > 0 && (
                    <X
                      className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(allSelected());
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
                  <ul className="max-h-80 overflow-y-auto py-1">
                    <li>
                      <label
                        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${unselectedIds.length === 0 ? "font-semibold text-[#E60D2E]" : "text-slate-600"}`}
                      >
                        <TriCheckbox
                          checked={unselectedIds.length === 0}
                          indeterminate={
                            selectedIds.length > 0 && unselectedIds.length > 0
                          }
                          onChange={() => setSelected(allSelected())}
                        />
                        <strong>All Stores</strong>
                      </label>
                    </li>

                    <li
                      role="separator"
                      className="my-1 border-t border-slate-100"
                    />
                    <li className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Groups
                    </li>
                    {Object.entries(STORE_GROUPS).map(([key, group]) => {
                      const checked = isGroupChecked(key);
                      const indeterminate = isGroupIndeterminate(key);
                      return (
                        <li key={key}>
                          <label
                            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${checked ? "font-semibold text-[#E60D2E]" : "text-slate-700"}`}
                          >
                            <TriCheckbox
                              checked={checked}
                              indeterminate={indeterminate}
                              onChange={() => toggleGroup(key)}
                            />
                            {group.label}
                          </label>
                        </li>
                      );
                    })}

                    <li
                      role="separator"
                      className="my-1 border-t border-slate-100"
                    />
                    <li className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Individual Stores
                    </li>
                    {STORES.map((loc) => {
                      const checked = selectedIds.includes(loc.Id);
                      return (
                        <li key={loc.Id}>
                          <label
                            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${checked ? "font-semibold text-[#E60D2E]" : "text-slate-700"}`}
                          >
                            <TriCheckbox
                              checked={checked}
                              onChange={() => toggleStore(loc.Id)}
                            />
                            {loc.Id + " – " + loc.Name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Date range preset */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              Date Range
            </label>
            <select
              value={rangeKey}
              onChange={(e) => handleRangeChange(e.target.value as RangeKey)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {rangeKey === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fromDate}
                    onChange={(e) => setFromDate(maskDate(e.target.value))}
                    onClick={() => customFromRef.current?.showPicker()}
                    placeholder="MM/DD/YYYY"
                    maxLength={10}
                    className="h-9 w-36 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => customFromRef.current?.showPicker()}
                    className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-[#E60D2E] transition-colors"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                  <input
                    ref={customFromRef}
                    type="date"
                    value={mmddyyyyToISO(fromDate)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split("-");
                      if (y && m && d) setFromDate(`${m}/${d}/${y}`);
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={toDate}
                    onChange={(e) => setToDate(maskDate(e.target.value))}
                    onClick={() => customToRef.current?.showPicker()}
                    placeholder="MM/DD/YYYY"
                    maxLength={10}
                    className="h-9 w-36 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-8 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#E60D2E] focus:ring-2 focus:ring-[#E60D2E]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => customToRef.current?.showPicker()}
                    className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-[#E60D2E] transition-colors"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                  <input
                    ref={customToRef}
                    type="date"
                    value={mmddyyyyToISO(toDate)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split("-");
                      if (y && m && d) setToDate(`${m}/${d}/${y}`);
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-end gap-2 pb-0">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-lg bg-[#E60D2E] px-4 text-sm font-semibold text-white hover:bg-[#c40a27] transition-colors disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" />
              {loading ? "Loading…" : "Search"}
            </button>
          </div>

          <div className="ml-auto pb-1.5 text-xs text-slate-500">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : appliedFrom === appliedTo ? (
              appliedFrom
            ) : (
              `${appliedFrom} – ${appliedTo}`
            )}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DbCard
          icon={DollarSign}
          accent="green"
          label="Net Sales"
          value={fmt(kpis.netSales)}
        >
          <YoyBlock
            curVal={kpis.netSales}
            lyVal={kpis.lyNetSales}
            fmtFn={fmt}
            color="#059669"
          />
        </DbCard>

        <DbCard
          icon={TrendingUp}
          accent="blue"
          label="Sale Transactions"
          value={kpis.saleTxnCount}
        >
          <YoyBlock
            curVal={kpis.saleTxnCount}
            lyVal={kpis.lySalesCount}
            fmtFn={(v) => v.toFixed(0)}
            color="#1d4ed8"
          />
        </DbCard>

        <DbCard
          icon={Sigma}
          accent="purple"
          label="Avg Sale Amount"
          value={fmt(kpis.avgSale)}
          sub="per sale transaction"
        />

        <DbCard
          icon={Box}
          accent="cyan"
          label="Avg Units per Transaction"
          value={kpis.avgUnits.toFixed(1)}
          sub="across all sale transactions"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={Box}
              label="Total Units Sold"
              value={kpis.unitsSold}
              accent="green"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Undo2}
          accent="red"
          label="Net Returns"
          value={
            kpis.netReturns < 0
              ? `(${fmt(Math.abs(kpis.netReturns))})`
              : fmt(kpis.netReturns)
          }
          sub="total refunded to customers"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={TrendingDown}
              label="Return Transactions"
              value={kpis.returnTxnCount}
              accent="red"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Award}
          accent="green"
          label="MyRewards Signed Up"
          value={kpis.rewards.myRewards ?? 0}
          sub="new sign-ups this period"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={Target}
              label="Loyalty Sign-Up Opportunity"
              value={pctOr(kpis.rewards.myRewards ?? 0, kpis.nonLoyalty)}
              accent="green"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Crown}
          accent="pro"
          label="PRO Access Signed Up"
          value={kpis.rewards.pro ?? 0}
          sub="new sign-ups this period"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={Percent}
              label="% of Transactions"
              value={pctOr(kpis.rewards.pro ?? 0, kpis.saleTxnCount)}
              accent="pro"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Repeat}
          accent="teal"
          label="New Subscriptions"
          value={kpis.subs.total ?? 0}
          sub="auto-delivery sign-ups"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={X}
              label="Cancelled"
              value={kpis.subs.cancelled ?? 0}
              accent="teal"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Pill}
          accent="amber"
          label="Multivitamins Sold"
          value={fmt(kpis.multiSales)}
          sub="vitamin & multi category"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={Percent}
              label="% of Net Sales"
              value={pctOr(kpis.multiSales, kpis.netSales)}
              accent="amber"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Droplet}
          accent="sky"
          label="Fish Oil Sold"
          value={fmt(kpis.fishSales)}
          sub="fish oil & omega category"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={Percent}
              label="% of Net Sales"
              value={pctOr(kpis.fishSales, kpis.netSales)}
              accent="sky"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Receipt}
          accent="amber"
          label="Total Tax Collected"
          value={fmt(kpis.totalTax)}
          sub="across all transactions"
        />
      </div>
    </div>
  );
}
