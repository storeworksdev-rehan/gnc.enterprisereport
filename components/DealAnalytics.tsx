"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

interface Props {
  data: ApiRow[];
}

const n = (v: string | number) => parseFloat(String(v)) || 0;
const $ = (v: number) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
const pct = (v: number) => `${v.toFixed(1)}%`;
const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return /^null$/i.test(s) ? "" : s;
};

const P = {
  red: "#e31837",
  dark: "#1a1a1a",
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  rose: "#f43f5e",
};
const PALETTE = [
  P.red,
  P.blue,
  P.green,
  P.amber,
  P.violet,
  P.cyan,
  P.rose,
  P.dark,
];

const GRID = {
  strokeDasharray: "3 3",
  stroke: "#f1f5f9",
  vertical: false,
} as const;
const XAXIS = {
  tick: { fontSize: 10, fill: "#94a3b8" },
  axisLine: { stroke: "#e2e8f0" },
  tickLine: false,
} as const;
const YAXIS = {
  tick: { fontSize: 10, fill: "#94a3b8" },
  axisLine: false,
  tickLine: false,
} as const;
const LEGEND = {
  iconType: "circle" as const,
  iconSize: 7,
  wrapperStyle: { fontSize: 11, color: "#64748b" },
};

const Tip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl min-w-40">
      {label && <p className="mb-2 font-semibold text-slate-700">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-slate-900">
            {typeof p.value === "number" && p.name !== "Count"
              ? $(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function Chart({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <p className="mb-4 text-sm font-semibold text-slate-800">{title}</p>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

const DEAL_TYPE_BADGE: Record<string, string> = {
  Promo: "bg-emerald-100 text-emerald-700",
  PromoCoupon: "bg-blue-100 text-blue-700",
  SmartCoupon: "bg-rose-100 text-rose-700",
  LoyaltyCertificate: "bg-amber-100 text-amber-700",
  "Employee Discount": "bg-violet-100 text-violet-700",
  "No Deal": "bg-slate-100 text-slate-500",
};

interface LeafRow {
  DealNumber: string;
  DealType: string;
  Lines: number;
  Qty: number;
  Sale: number;
  Discount: number;
  Avg: number;
}

interface EventGroup {
  EventNumber: string;
  Lines: number;
  Qty: number;
  Sale: number;
  Discount: number;
  children: LeafRow[];
}

interface GroupRow {
  DealName: string;
  Lines: number;
  Qty: number;
  Sale: number;
  Discount: number;
  events: EventGroup[];
}

export default function DealAnalytics({ data }: Props) {
  // ── KPI derivations ──────────────────────────────────────────────────────
  const uniqueTxns = useMemo(
    () =>
      new Set(
        data.map(
          (r) =>
            r.LocationId +
            r.RegisterNumber +
            r.TransactionNumber +
            r.BusinessDate,
        ),
      ).size,
    [data],
  );
  const totalSales = useMemo(
    () => data.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0),
    [data],
  );
  const totalDealDisc = useMemo(
    () => data.reduce((s, r) => s + n(r.DiscountAmount), 0),
    [data],
  );
  const totalManualDisc = useMemo(
    () => data.reduce((s, r) => s + n(r.ManualDiscountAmount), 0),
    [data],
  );
  const manualCount = useMemo(
    () => data.filter((r) => Number(r.IsManualDiscount) === 1).length,
    [data],
  );
  const totalDisc = totalDealDisc + totalManualDisc;
  const avgDiscPct = totalSales > 0 ? (totalDisc / totalSales) * 100 : 0;
  const withDeal = useMemo(
    () => data.filter((r) => r.DealType && r.DealType !== "No Deal").length,
    [data],
  );
  const dealHitRate = data.length > 0 ? (withDeal / data.length) * 100 : 0;

  // ── Chart 1: Deal Type Distribution (Count) ──────────────────────────────
  const byDealTypeCount = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r) => {
      const t = r.DealType || "Unknown";
      map[t] = (map[t] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([type, Count]) => ({ type, Count }))
      .sort((a, b) => b.Count - a.Count);
  }, [data]);

  // ── Chart 2: Discount by Deal Type (Deal + Manual) ───────────────────────
  const byDealTypeDisc = useMemo(() => {
    const map: Record<
      string,
      { DealDiscount: number; ManualDiscount: number }
    > = {};
    data.forEach((r) => {
      const t = r.DealType || "Unknown";
      if (!map[t]) map[t] = { DealDiscount: 0, ManualDiscount: 0 };
      map[t].DealDiscount += n(r.DiscountAmount);
      map[t].ManualDiscount += n(r.ManualDiscountAmount);
    });
    return Object.entries(map)
      .map(([type, v]) => ({
        type,
        "Deal Discount": +v.DealDiscount.toFixed(2),
        "Manual Discount": +v.ManualDiscount.toFixed(2),
      }))
      .sort(
        (a, b) =>
          b["Deal Discount"] +
          b["Manual Discount"] -
          (a["Deal Discount"] + a["Manual Discount"]),
      );
  }, [data]);

  // ── Chart 3: Deal Type Mix — % of Total Discount ─────────────────────────
  const dealTypePie = useMemo(() => {
    return byDealTypeDisc
      .filter((d) => d["Deal Discount"] + d["Manual Discount"] > 0)
      .map((d) => ({
        name: d.type,
        value: +(d["Deal Discount"] + d["Manual Discount"]).toFixed(2),
      }));
  }, [byDealTypeDisc]);

  // ── Grouped Summary: DealName → EventNumber → DealNumber ────────────────
  const groupedDealSummary = useMemo<GroupRow[]>(() => {
    type RawEvent = {
      EventNumber: string;
      Lines: number;
      Qty: number;
      Sale: number;
      Discount: number;
      _leaves: Record<string, LeafRow>;
    };
    type RawGroup = {
      DealName: string;
      Lines: number;
      Qty: number;
      Sale: number;
      Discount: number;
      _events: Record<string, RawEvent>;
    };
    const map: Record<string, RawGroup> = {};

    data.forEach((r) => {
      const ev = clean(r.EventNumber);
      const dn = clean(r.DealNumber);
      const name = clean(r.DealName);
      if (!name && !ev) return;
      if (!ev) return; // skip rows with no event number

      const groupKey = name || `Event ${ev}`;
      if (!map[groupKey])
        map[groupKey] = {
          DealName: groupKey,
          Lines: 0,
          Qty: 0,
          Sale: 0,
          Discount: 0,
          _events: {},
        };

      if (!map[groupKey]._events[ev]) {
        map[groupKey]._events[ev] = {
          EventNumber: ev,
          Lines: 0,
          Qty: 0,
          Sale: 0,
          Discount: 0,
          _leaves: {},
        };
      }

      const leafKey = `${dn}||${r.DealType}`;
      if (!map[groupKey]._events[ev]._leaves[leafKey]) {
        map[groupKey]._events[ev]._leaves[leafKey] = {
          DealNumber: dn,
          DealType: r.DealType,
          Lines: 0,
          Qty: 0,
          Sale: 0,
          Discount: 0,
          Avg: 0,
        };
      }

      const disc = n(r.DiscountAmount) + n(r.ManualDiscountAmount);
      const leaf = map[groupKey]._events[ev]._leaves[leafKey];
      leaf.Lines++;
      leaf.Qty += n(r.Quantity);
      leaf.Sale += n(r["SALE AMOUNT"]);
      leaf.Discount += disc;
      map[groupKey]._events[ev].Lines++;
      map[groupKey]._events[ev].Qty += n(r.Quantity);
      map[groupKey]._events[ev].Sale += n(r["SALE AMOUNT"]);
      map[groupKey]._events[ev].Discount += disc;
    });

    return Object.values(map)
      .map(({ _events, ...g }) => {
        const events: EventGroup[] = Object.values(_events)
          .map(({ _leaves, ...ev }) => ({
            ...ev,
            Qty: +ev.Qty.toFixed(0),
            Sale: +ev.Sale.toFixed(2),
            Discount: +ev.Discount.toFixed(2),
            children: Object.values(_leaves)
              .map((l) => ({
                ...l,
                Qty: +l.Qty.toFixed(0),
                Sale: +l.Sale.toFixed(2),
                Discount: +l.Discount.toFixed(2),
                Avg: l.Lines > 0 ? +(l.Discount / l.Lines).toFixed(2) : 0,
              }))
              .sort((a, b) => a.DealNumber.localeCompare(b.DealNumber)),
          }))
          .sort((a, b) => a.EventNumber.localeCompare(b.EventNumber));

        const Lines = events.reduce((s, e) => s + e.Lines, 0);
        const Qty = events.reduce((s, e) => s + e.Qty, 0);
        const Sale = +events.reduce((s, e) => s + e.Sale, 0).toFixed(2);
        const Discount = +events.reduce((s, e) => s + e.Discount, 0).toFixed(2);

        return { ...g, Lines, Qty, Sale, Discount, events };
      })
      .filter((g) => g.events.length > 0)
      .sort((a, b) => b.Discount - a.Discount);
  }, [data]);

  return (
    <div className="space-y-6 p-6 bg-slate-50">
      {/* ── 6-col KPI strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Kpi
          label="Total Transactions"
          value={uniqueTxns.toLocaleString()}
          accent={P.dark}
        />
        <Kpi label="Total Sale Amount" value={$(totalSales)} accent={P.red} />
        <Kpi
          label="Total Deal Discounts"
          value={$(totalDealDisc)}
          accent={P.rose}
        />
        <Kpi
          label="Total Manual Discounts"
          value={$(totalManualDisc)}
          sub={`${manualCount} lines`}
          accent={P.amber}
        />
        <Kpi label="Avg Discount %" value={pct(avgDiscPct)} accent={P.violet} />
        <Kpi label="Deal Hit Rate" value={pct(dealHitRate)} accent={P.green} />
      </div>

      {/* ── Row 1: Deal Type Distribution (Count) — full width ──────────── */}
      <Chart title="Deal Type Distribution (Count)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={byDealTypeCount}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid {...GRID} />
            <XAxis dataKey="type" {...XAXIS} />
            <YAxis {...YAXIS} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
              {byDealTypeCount.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Chart>

      {/* ── Row 2: Discount stacked + Pie — side by side ────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Chart title="Discount by Deal Type (Deal + Manual)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={byDealTypeDisc}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis dataKey="type" {...XAXIS} />
              <YAxis tickFormatter={(v) => $(v)} {...YAXIS} width={72} />
              <Tooltip content={<Tip />} />
              <Legend {...LEGEND} />
              <Bar
                dataKey="Deal Discount"
                stackId="s"
                fill={P.red}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Manual Discount"
                stackId="s"
                fill={P.amber}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Deal Type Mix (% of Total Discount)">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dealTypePie}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                fontSize={10}
                fill="#8884d8"
              >
                {dealTypePie.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => $(v)} />
              <Legend {...LEGEND} />
            </PieChart>
          </ResponsiveContainer>
        </Chart>
      </div>

      {/* ── Row 3: Grouped Deal Summary ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">
            Event / Deal Number Summary
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                {[
                  "Event #",
                  "Deal #",
                  "Deal Name",
                  "Deal Type",
                  "Line Count",
                  "Total Qty",
                  "Total Sale Amt",
                  "Total Discount",
                  "Avg Discount",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-500 ${i >= 4 ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedDealSummary.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    No event/deal data available.
                  </td>
                </tr>
              )}

              {groupedDealSummary.map((group) => {
                const avgDisc =
                  group.Lines > 0 ? group.Discount / group.Lines : 0;
                const uniqueTypes = [
                  ...new Set(
                    group.events.flatMap((e) =>
                      e.children.map((c) => c.DealType),
                    ),
                  ),
                ];

                return (
                  <>
                    {group.events.map((ev) => {
                      const evAvg = ev.Lines > 0 ? ev.Discount / ev.Lines : 0;
                      return (
                        <>
                          {/* ── Level 2: Event Number row ── */}
                          <tr
                            key={`ev-${group.DealName}-${ev.EventNumber}`}
                            className="bg-slate-50"
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5 pl-2">
                                <span className="text-slate-400 text-sm leading-none">
                                  ↳
                                </span>
                                <span className="font-mono text-xs font-semibold text-slate-700">
                                  Event&nbsp;#&nbsp;{ev.EventNumber}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-400">
                              —
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-400 italic">
                              {group.DealName}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-400">
                              —
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">
                              {ev.Lines}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">
                              {ev.Qty}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-900">
                              {$(ev.Sale)}
                            </td>
                            <td
                              className="px-4 py-2.5 text-right text-xs font-semibold"
                              style={{ color: P.red }}
                            >
                              {$(ev.Discount)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">
                              {$(evAvg)}
                            </td>
                          </tr>

                          {/* ── Level 3: Deal Number leaf rows ── */}
                          {ev.children.map((leaf, li) => (
                            <tr
                              key={`leaf-${group.DealName}-${ev.EventNumber}-${li}`}
                              className="bg-white hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-4 py-2 text-xs text-slate-300 pl-8">
                                —
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1.5 pl-2">
                                  <span className="text-slate-300 text-sm leading-none">
                                    ↳
                                  </span>
                                  <span className="font-mono text-xs text-slate-600">
                                    {leaf.DealNumber || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-300 italic pl-5">
                                {group.DealName}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DEAL_TYPE_BADGE[leaf.DealType] ?? "bg-slate-100 text-slate-600"}`}
                                >
                                  {leaf.DealType}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-slate-600">
                                {leaf.Lines}
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-slate-600">
                                {leaf.Qty}
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-slate-700">
                                {$(leaf.Sale)}
                              </td>
                              <td
                                className="px-4 py-2 text-right text-xs font-medium"
                                style={{ color: P.red }}
                              >
                                {$(leaf.Discount)}
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-slate-600">
                                {$(leaf.Avg)}
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
