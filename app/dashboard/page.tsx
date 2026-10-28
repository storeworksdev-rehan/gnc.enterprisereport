"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
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

// Shape of GET /api/Tran/getLocationGroups — see LocationGroups.sql.
// Table1 = location groups, Table2 = location ids. The two are unrelated —
// there's no hierarchy linking a GroupName to a LocationId, they're two
// separate flat lookup lists, each its own independent filter.
// Endpoint path below is a placeholder guess (naming matches
// getDashboardReportDummy) — update once the real route is confirmed.
interface LocationGroupRow {
  GroupName: string;
  GroupLevel: number;
  SortOrder: number;
}
interface LocationIdRow {
  LocationId: number;
}
interface LocationFiltersResponse {
  Table1: LocationGroupRow[];
  Table2: LocationIdRow[];
}

// Shape of GET /api/Tran/getDashboardReportDummy — see DashboardReport.sql.
// Table1 = sale-side metrics, Table2 = loyalty / subscription sign-ups,
// Table3 = prior-year comparison. Each is a single-row array.
interface DashboardSaleMetrics {
  TotalSaleAmount: number;
  TransactionCount: number;
  AvgSaleAmount: number;
  AvgUnitsPerTransaction: number;
  MultiVitaminsSold: number;
  FishOilSold: number;
  TotalTaxCollected: number;
  TotalUnitsSold: number;
}
interface DashboardLoyaltyMetrics {
  NewSubscriptions: number;
  MyRewards: number;
  ProAccess: number;
  CancelledSubscriptions: number;
}
// Despite the column names, TotalSaleAmount/TransactionCount here are LAST
// YEAR's net sale $ / sale transaction count (same period, prior year) —
// they feed the Net Sales / Sale Transactions cards' YoY comparison bars.
// NewSubscriptions is THIS period's count again (same value as
// DashboardLoyaltyMetrics.NewSubscriptions), not last year's — not
// currently consumed separately, kept for shape completeness.
interface DashboardLastYearMetrics {
  TotalSaleAmount: number;
  TransactionCount: number;
  NewSubscriptions: number;
}
interface DashboardReportResponse {
  Table1: DashboardSaleMetrics[];
  Table2: DashboardLoyaltyMetrics[];
  Table3: DashboardLastYearMetrics[];
}

const fmt = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtNum = (v: number) => Math.round(v).toLocaleString("en-US");
// Display-only padding for individual store ids — e.g. 1111 -> "01111",
// 63 -> "00063". The underlying value sent to the API stays the raw
// number; this only affects the text shown in the dropdown/trigger.
const padLocationId = (id: number | string) =>
  String(id).padStart(5, "0");
const pctOr = (num: number, den: number) =>
  den ? `${((num / den) * 100).toFixed(1)}%` : "—";

type RangeKey =
  | "today"
  | "this week"
  | "last week"
  | "this month"
  | "last month"
  | "this year"
  | "custom";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this week", label: "This Week" },
  { value: "last week", label: "Last Week" },
  { value: "this month", label: "This Month" },
  { value: "last month", label: "Last Month" },
  { value: "this year", label: "This Year" },
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
    case "this week": {
      const dow = (now.getDay() + 6) % 7; // 0 = Monday
      from = new Date(y, m, d - dow);
      to = new Date(y, m, d);
      break;
    }
    case "last week": {
      const dow = (now.getDay() + 6) % 7;
      from = new Date(y, m, d - dow - 7);
      to = new Date(y, m, d - dow - 1);
      break;
    }
    case "this month":
      from = new Date(y, m, 1);
      to = new Date(y, m, d);
      break;
    case "last month":
      from = new Date(y, m - 1, 1);
      to = new Date(y, m, 0);
      break;
    case "this year":
      from = new Date(y, 0, 1);
      to = new Date(y, m, d);
      break;
    default:
      return null;
  }
  return { from: toMMDDYYYY(from), to: toMMDDYYYY(to) };
}

// [Tran].[DailyDashboard]'s @DateRangeType takes these preset keys directly;
// a custom range is still @DateRangeType = 'Custom', with the actual bounds
// going through @CustomStartDate/@CustomEndDate separately.
const DATE_RANGE_TYPE_MAP: Record<RangeKey, string> = {
  today: "Today",
  "this week": "This Week",
  "last week": "Last Week",
  "this month": "This Month",
  "last month": "Last Month",
  "this year": "This Year",
  custom: "Custom",
};
function toDateRangeType(key: RangeKey): string {
  return DATE_RANGE_TYPE_MAP[key];
}

// @CustomStartDate / @CustomEndDate are sent as YYYYMMDD integers (e.g.
// 20261001), not date strings — converts from the MM/DD/YYYY the date
// inputs use. Returns undefined for an incomplete/empty date.
function toYYYYMMDDInt(mmddyyyy: string): number | undefined {
  const iso = mmddyyyyToISO(mmddyyyy);
  if (!iso) return undefined;
  return Number(iso.replace(/-/g, ""));
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

export default function DashboardPage() {
  // ── Location filter — one merged dropdown, single selection ─────────
  // Group (LocationName) and Location (LocationId) are still unrelated
  // filters underneath (see LocationGroups.sql — no shared key), but the
  // UI now presents them as one control: "All Stores" / a Group / an
  // individual Location, mutually exclusive. Selecting a group always
  // clears the location id and vice versa — selectGroup()/selectLocation()
  // below are the only setters used, so the two states can never both be
  // non-empty at once.
  const [locationGroups, setLocationGroups] = useState<LocationGroupRow[]>([]);
  const [locationIds, setLocationIds] = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup] = useState(""); // "" = none selected
  const [selectedLocationId, setSelectedLocationId] = useState(""); // "" = none selected
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

  const selectAllStores = () => {
    setSelectedGroup("");
    setSelectedLocationId("");
  };
  const selectGroup = (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedLocationId("");
  };
  const selectLocation = (id: number) => {
    setSelectedLocationId(String(id));
    setSelectedGroup("");
  };
  const locationTriggerLabel =
    selectedGroup ||
    (selectedLocationId ? padLocationId(selectedLocationId) : "") ||
    "All Stores";

  // Resolves the current Location filter selection into the LocationName /
  // LocationId pair to send to the API: a Group sends its name (LocationId
  // null), a Location sends its id (LocationName null), and "All Stores" —
  // neither selected — sends the literal "ALL" for LocationName only;
  // LocationId stays null.
  const locationFilterParams = (): {
    LocationName: string;
    LocationId: number | string;
  } => {
    if (selectedGroup) return { LocationName: selectedGroup, LocationId: "null" };
    if (selectedLocationId)
      return { LocationName: "null", LocationId: Number(selectedLocationId) };
    return { LocationName: "ALL", LocationId: "null" };
  };

  // Groups clustered by GroupLevel (ascending), each cluster's GroupNames
  // sorted by SortOrder ascending — all of GroupLevel 1 first, then all of
  // GroupLevel 2, etc., with a separator between clusters.
  const groupsByLevel = Array.from(
    new Set(locationGroups.map((g) => g.GroupLevel)),
  )
    .sort((a, b) => a - b)
    .map((level) => ({
      level,
      groups: locationGroups
        .filter((g) => g.GroupLevel === level)
        .sort((a, b) => a.SortOrder - b.SortOrder),
    }));

  useEffect(() => {
    axios
      .get<LocationFiltersResponse>(`${API_BASE}/api/Tran/getLocationGroups`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("enterprise_auth_token") ?? ""}`,
        },
      })
      .then((res) => {
        setLocationGroups(res.data?.Table1 ?? []);
        setLocationIds((res.data?.Table2 ?? []).map((r) => r.LocationId));
      })
      .catch((err) => {
        // Surfaced to the console rather than swallowed silently — if the
        // dropdowns are empty, check here (and the Network tab) for why:
        // wrong path, CORS, an untrusted self-signed cert on
        // https://localhost:44356, etc.
        console.error("Failed to load location groups/ids:", err);
      });
  }, []);

  const [rangeKey, setRangeKey] = useState<RangeKey>("today");
  const initial = resolveRange("today")!;
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const customFromRef = useRef<HTMLInputElement>(null);
  const customToRef = useRef<HTMLInputElement>(null);

  // Applied filters — only change when Search is clicked, matching the rest
  // of the app's filter-bar behavior. selectedGroup/selectedLocationId
  // don't need a separate "applied" copy — they're read directly at the
  // moment Search is clicked and sent to fetchDashboard() then.
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);

  // ── Dashboard data from the API ─────────────────────────────────────
  const [report, setReport] = useState<DashboardReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Matches [Tran].[DailyDashboard]'s full signature: @DateRangeType,
  // @LocationName, @Debug, @LocationId, @CustomStartDate, @CustomEndDate.
  // @LocationName carries the Group filter's GroupName, @LocationId the
  // Location filter's numeric id — the two are mutually exclusive (see
  // selectGroup()/selectLocation() above), so whichever one isn't selected
  // is sent as the literal value null rather than omitted, making that
  // exclusivity explicit on the wire instead of implicit.
  const fetchDashboard = (params: {
    DateRangeType?: string;
    LocationName?: string;
    LocationId?: number | string;
    CustomStartDate?: number;
    CustomEndDate?: number;
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
            LocationName: params.LocationName ?? "null",
            LocationId: params.LocationId ?? "null",
            ...(params.CustomStartDate !== undefined
              ? { CustomStartDate: params.CustomStartDate }
              : {}),
            ...(params.CustomEndDate !== undefined
              ? { CustomEndDate: params.CustomEndDate }
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

  // Initial load with the default ("Today") filters — Location defaults to
  // "All Stores" (neither Group nor Location selected yet), so this sends
  // LocationName/LocationId as "ALL", same as explicitly picking it.
  useEffect(() => {
    fetchDashboard({
      DateRangeType: toDateRangeType("today"),
      ...locationFilterParams(),
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

    // LocationName (Group) and LocationId (Location) are each a single
    // scalar value — single-select, not multi-select, so there's never a
    // CSV/array to join here. locationFilterParams() enforces the mutual
    // exclusivity on the wire: a Group nulls LocationId, a Location nulls
    // LocationName, and "All Stores" (neither selected) sends "ALL" for both.
    fetchDashboard({
      DateRangeType: toDateRangeType(rangeKey),
      ...locationFilterParams(),
      CustomStartDate:
        rangeKey === "custom" ? toYYYYMMDDInt(fromDate) : undefined,
      CustomEndDate: rangeKey === "custom" ? toYYYYMMDDInt(toDate) : undefined,
    });
  };

  // ── KPI values straight off the API response ────────────────────────
  // Every Table is a single summary row for the currently applied filters
  // (see DashboardReport.sql) — no client-side aggregation needed anymore.
  const sale = report?.Table1?.[0];
  const loyalty = report?.Table2?.[0];
  const lastYear = report?.Table3?.[0];

  const netSales = sale?.TotalSaleAmount ?? 0;
  const saleTxnCount = sale?.TransactionCount ?? 0;
  const avgSale = sale?.AvgSaleAmount ?? 0;
  const avgUnits = sale?.AvgUnitsPerTransaction ?? 0;
  const unitsSold = sale?.TotalUnitsSold ?? sale?.TransactionCount ?? 0;
  const multiSales = sale?.MultiVitaminsSold ?? 0;
  const fishSales = sale?.FishOilSold ?? 0;
  const totalTax = sale?.TotalTaxCollected ?? 0;
  // Table3.TotalSaleAmount/TransactionCount are last year's figures despite
  // the column names — see DashboardLastYearMetrics above.
  const lyNetSales = lastYear?.TotalSaleAmount ?? 0;
  const lySalesCount = lastYear?.TransactionCount ?? 0;

  const myRewardsSignups = loyalty?.MyRewards ?? 0;
  const proAccessSignups = loyalty?.ProAccess ?? 0;
  const newSubscriptions = loyalty?.NewSubscriptions ?? 0;
  const cancelledSubscriptions = loyalty?.CancelledSubscriptions ?? 0;

  // The API doesn't expose a dedicated non-loyalty customer count, so sale
  // transaction count stands in as the denominator for "Loyalty Sign-Up
  // Opportunity %" until one is added.

  // There's no return-side data anywhere in this response (see
  // DashboardReport.sql) — the card stays on screen showing $0 / 0 rather
  // than disappearing, until a real return-data result set is added.
  const netReturns = 0;
  const returnTxnCount = 0;

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
    nonLoyalty: saleTxnCount,
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
          {/* Location filter — one dropdown merging All Stores / Groups /
              Individual Stores. Checkbox-styled but single-select: picking
              any item clears the other two sections (selectAllStores /
              selectGroup / selectLocation all enforce that). */}
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
                <span>{locationTriggerLabel}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${locOpen ? "rotate-180" : ""}`}
                />
              </button>

              {locOpen && (
                <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-lg">
                  <ul className="max-h-80 overflow-y-auto py-1">
                    <li>
                      <label
                        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${!selectedGroup && !selectedLocationId ? "font-semibold text-[#E60D2E]" : "text-slate-600"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!selectedGroup && !selectedLocationId}
                          onChange={selectAllStores}
                          className="h-3.5 w-3.5 accent-[#E60D2E] shrink-0"
                        />
                        <strong>ALL STORES</strong>
                      </label>
                    </li>

                    <li
                      role="separator"
                      className="my-1 border-t border-slate-100"
                    />
                    <li className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      GROUPS
                    </li>
                    {groupsByLevel.map(({ level, groups }, i) => (
                      <Fragment key={level}>
                        {i > 0 && (
                          <li
                            role="separator"
                            className="my-1 border-t border-slate-100"
                          />
                        )}
                        {groups.map((g) => (
                          <li key={g.GroupName}>
                            <label
                              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${selectedGroup === g.GroupName ? "font-semibold text-[#E60D2E]" : "text-slate-700"}`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedGroup === g.GroupName}
                                onChange={() => selectGroup(g.GroupName)}
                                className="h-3.5 w-3.5 accent-[#E60D2E] shrink-0"
                              />
                              {g.GroupName}
                            </label>
                          </li>
                        ))}
                      </Fragment>
                    ))}

                    <li
                      role="separator"
                      className="my-1 border-t border-slate-100"
                    />
                    <li className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      INDIVIDUAL STORES
                    </li>
                    {locationIds.map((id) => (
                      <li key={id}>
                        <label
                          className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${selectedLocationId === String(id) ? "font-semibold text-[#E60D2E]" : "text-slate-700"}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLocationId === String(id)}
                            onChange={() => selectLocation(id)}
                            className="h-3.5 w-3.5 accent-[#E60D2E] shrink-0"
                          />
                          {padLocationId(id)}
                        </label>
                      </li>
                    ))}
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
          value={fmtNum(kpis.saleTxnCount)}
        >
          <YoyBlock
            curVal={kpis.saleTxnCount}
            lyVal={kpis.lySalesCount}
            fmtFn={fmtNum}
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
              value={fmtNum(kpis.unitsSold)}
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
              value={fmtNum(kpis.returnTxnCount)}
              accent="red"
            />
          </div>
        </DbCard>

        <DbCard
          icon={Award}
          accent="green"
          label="MyRewards Signed Up"
          value={fmtNum(kpis.rewards.myRewards ?? 0)}
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
          value={fmtNum(kpis.rewards.pro ?? 0)}
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
          value={fmtNum(kpis.subs.total ?? 0)}
          sub="auto-delivery sign-ups"
        >
          <div className="mt-2.5 w-full border-t border-slate-100 pt-2.5">
            <BreakRow
              icon={X}
              label="Cancelled"
              value={fmtNum(kpis.subs.cancelled ?? 0)}
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
