"use client";

import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Receipt, ShoppingCart,
  BarChart2, MapPin, Package, CreditCard,
  DollarSign, Hash,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

// ── types ────────────────────────────────────────────────────────
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

interface Props {
  data: ApiRow[];
  onClose: () => void;
  inline?: boolean;
}

// ── helpers ──────────────────────────────────────────────────────
const n   = (v: string) => parseFloat(v) || 0;
const $   = (v: number, dec = 2) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: dec });
const pct = (v: number) => `${v.toFixed(1)}%`;

// ── palette ───────────────────────────────────────────────────────
const P = {
  blue:   "#3b82f6",
  cyan:   "#06b6d4",
  green:  "#10b981",
  rose:   "#f43f5e",
  amber:  "#f59e0b",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  pink:   "#ec4899",
  lime:   "#84cc16",
  emerald:"#34d399",
};

const TRAN_TYPE_COLOR: Record<string, string> = {
  Sale: P.blue, Employee: P.violet, Return: P.rose, TrainingMode: P.amber,
};

const RAINBOW = [P.blue, P.cyan, P.green, P.violet, P.amber, P.rose, P.indigo, P.pink, P.lime, P.emerald];

// ── recharts shared props ─────────────────────────────────────────
const GRID   = { strokeDasharray: "3 3", stroke: "#f1f5f9", vertical: false } as const;
const XAXIS  = { tick: { fontSize: 10, fill: "#94a3b8" }, axisLine: { stroke: "#e2e8f0" }, tickLine: false } as const;
const YAXIS  = { tick: { fontSize: 10, fill: "#94a3b8" }, axisLine: false, tickLine: false } as const;
const LEGEND = { iconType: "circle" as const, iconSize: 7, wrapperStyle: { fontSize: 11, color: "#64748b" } };

// ── Tooltip ───────────────────────────────────────────────────────
const Tip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl min-w-[140px]">
      {label && <p className="mb-2 font-semibold text-slate-700">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-slate-900">{$(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Section heading ───────────────────────────────────────────────
const Section = ({ icon: Icon, title, color = P.blue }: { icon: React.ElementType; title: string; color?: string }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
      <Icon className="h-3.5 w-3.5" style={{ color }} />
    </div>
    <span className="text-sm font-bold text-slate-800">{title}</span>
    <div className="flex-1 h-px ml-2 bg-slate-100" />
  </div>
);

// ── KPI card ──────────────────────────────────────────────────────
function Kpi({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub?: string; accent: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}15` }}>
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs mt-1 font-medium" style={{ color: accent }}>{sub}</p>}
    </div>
  );
}

// ── Chart card ────────────────────────────────────────────────────
function Chart({ title, sub, children, className = "" }: {
  title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function SalesAnalyticsModal({ data }: Props) {

  // ── derived data ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const sales   = data.filter((r) => r.TranType === "Sale");
    const returns = data.filter((r) => r.TranType === "Return");
    const totalSales   = sales.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0);
    const totalReturns = Math.abs(returns.reduce((s, r) => s + n(r["SALE AMOUNT"]), 0));
    const totalTax     = data.reduce((s, r) => s + n(r.TAX), 0);
    const netRevenue   = totalSales - totalReturns;
    const returnRate   = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
    const txnCount     = new Set(sales.map((r) => r.TransactionNumber)).size;
    const avgBasket    = txnCount > 0 ? totalSales / txnCount : 0;
    const totalUnits   = sales.reduce((s, r) => s + n(r["UNITS SOLD"]), 0);
    const taxRate      = totalSales > 0 ? (totalTax / totalSales) * 100 : 0;
    return { totalSales, totalReturns, totalTax, netRevenue, returnRate, txnCount, avgBasket, totalUnits, taxRate };
  }, [data]);

  const salesByDate = useMemo(() => {
    const map: Record<string, { date: string; Sales: number; Returns: number; Net: number; Employee: number; Tax: number; Units: number }> = {};
    data.forEach((r) => {
      if (!map[r.BusinessDate]) map[r.BusinessDate] = { date: r.BusinessDate, Sales: 0, Returns: 0, Net: 0, Employee: 0, Tax: 0, Units: 0 };
      const amt = n(r["SALE AMOUNT"]);
      if (r.TranType === "Sale")     { map[r.BusinessDate].Sales    += amt; map[r.BusinessDate].Units += n(r["UNITS SOLD"]); }
      if (r.TranType === "Return")   map[r.BusinessDate].Returns  += Math.abs(amt);
      if (r.TranType === "Employee") map[r.BusinessDate].Employee += amt;
      map[r.BusinessDate].Tax += n(r.TAX);
    });
    return Object.values(map).map((d) => ({ ...d, Net: +(d.Sales - d.Returns).toFixed(2) })).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const salesByLocation = useMemo(() => {
    const map: Record<string, { location: string; Sales: number; Returns: number; Tax: number; Txns: number }> = {};
    data.forEach((r) => {
      if (!map[r.LocationId]) map[r.LocationId] = { location: r.LocationId, Sales: 0, Returns: 0, Tax: 0, Txns: 0 };
      if (r.TranType === "Sale")   { map[r.LocationId].Sales += n(r["SALE AMOUNT"]); map[r.LocationId].Txns++; }
      if (r.TranType === "Return") map[r.LocationId].Returns += Math.abs(n(r["SALE AMOUNT"]));
      map[r.LocationId].Tax += n(r.TAX);
    });
    return Object.values(map).map((l) => ({ ...l, Net: +(l.Sales - l.Returns).toFixed(2), Avg: l.Txns > 0 ? +(l.Sales / l.Txns).toFixed(2) : 0 }));
  }, [data]);

  const processByDate = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      if (!map[r.BusinessDate]) map[r.BusinessDate] = { date: r.BusinessDate as unknown as number };
      map[r.BusinessDate][r.TranType] = (map[r.BusinessDate][r.TranType] ?? 0) + Math.abs(n(r["SALE AMOUNT"]));
    });
    return Object.values(map).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [data]);

  const topItems = useMemo(() => {
    const map: Record<string, { Revenue: number; Units: number; Txns: number }> = {};
    data.filter((r) => r.TranType === "Sale" && r.ItemCode).forEach((r) => {
      if (!map[r.ItemCode]) map[r.ItemCode] = { Revenue: 0, Units: 0, Txns: 0 };
      map[r.ItemCode].Revenue += n(r["SALE AMOUNT"]);
      map[r.ItemCode].Units   += n(r["UNITS SOLD"]);
      map[r.ItemCode].Txns++;
    });
    return Object.entries(map)
      .map(([item, v]) => ({ item, Revenue: +v.Revenue.toFixed(2), Units: +v.Units, Txns: v.Txns }))
      .sort((a, b) => b.Revenue - a.Revenue).slice(0, 10);
  }, [data]);

  const tenderBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r) => {
      if (!r.TENDER) return;
      map[r.TENDER] = (map[r.TENDER] ?? 0) + Math.abs(n(r["FINAL AMOUNT"]) || n(r["TOTAL PER LINE"]));
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  }, [data]);

  const tenderByDate = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      if (!r.TENDER) return;
      if (!map[r.BusinessDate]) map[r.BusinessDate] = { date: r.BusinessDate as unknown as number };
      const amt = Math.abs(n(r["FINAL AMOUNT"]) || n(r["TOTAL PER LINE"]));
      map[r.BusinessDate][r.TENDER] = (map[r.BusinessDate][r.TENDER] ?? 0) + amt;
    });
    return Object.values(map).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [data]);

  const tenderKeys = useMemo(() => [...new Set(data.map((r) => r.TENDER).filter(Boolean))], [data]);

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="space-y-8 p-6 bg-slate-50">

      {/* ── 1. EXECUTIVE SUMMARY ── */}
      <section>
        <Section icon={DollarSign} title="Executive Summary" color={P.blue} />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-4">
          <Kpi label="Gross Sales"   value={$(summary.totalSales)}   sub={`${summary.txnCount} transactions`}       accent={P.blue}   icon={TrendingUp} />
          <Kpi label="Net Revenue"   value={$(summary.netRevenue)}   sub="after deducting returns"                  accent={P.green}  icon={DollarSign} />
          <Kpi label="Total Returns" value={$(summary.totalReturns)} sub={`${pct(summary.returnRate)} return rate`} accent={summary.returnRate > 15 ? P.rose : P.green} icon={TrendingDown} />
          <Kpi label="Total Tax"     value={$(summary.totalTax)}     sub={`${pct(summary.taxRate)} effective rate`} accent={P.violet} icon={Receipt} />
          <Kpi label="Avg Basket"    value={$(summary.avgBasket)}    sub="per sale transaction"                     accent={P.cyan}   icon={ShoppingCart} />
          <Kpi label="Units Sold"    value={summary.totalUnits.toFixed(0)} sub="sale transactions only"            accent={P.amber}  icon={Hash} />
          <Kpi label="Rev / Unit"    value={$(summary.totalSales / (summary.totalUnits || 1))} sub="average"       accent={P.indigo} icon={BarChart2} />
          <Kpi label="Locations"     value={salesByLocation.length.toString()} sub="active this period"            accent={P.pink}   icon={MapPin} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Chart title="Revenue Trend" sub="Gross sales, net revenue, and returns over time">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesByDate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {([["gS", P.blue], ["gN", P.green]] as [string, string][]).map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="10%" stopColor={c} stopOpacity={0.2} />
                      <stop offset="90%" stopColor={c} stopOpacity={0}   />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" {...XAXIS} />
                <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                <Tooltip content={<Tip />} />
                <Legend {...LEGEND} />
                <Area type="monotone" dataKey="Sales"   stroke={P.blue}  strokeWidth={2} fill="url(#gS)" dot={{ r: 4, fill: P.blue,  stroke: "#fff", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Net"     stroke={P.green} strokeWidth={2} fill="url(#gN)" dot={{ r: 4, fill: P.green, stroke: "#fff", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Returns" stroke={P.rose}  strokeWidth={2} fill="none" strokeDasharray="5 3" dot={{ r: 4, fill: P.rose, stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Chart>
        </div>
      </section>

      {/* ── 2. DAILY PERFORMANCE ── */}
      <section>
        <Section icon={BarChart2} title="Daily Performance" color={P.cyan} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Chart title="Daily Process Volume" sub="Stacked revenue by transaction type per day">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={processByDate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" {...XAXIS} />
                <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                <Tooltip content={<Tip />} />
                <Legend {...LEGEND} />
                {Object.keys(TRAN_TYPE_COLOR).map((k) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={TRAN_TYPE_COLOR[k]} radius={k === "TrainingMode" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Units Sold & Tax per Day" sub="Volume and tax collected — dual axis">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={salesByDate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" {...XAXIS} />
                <YAxis yAxisId="u" {...YAXIS} width={40} />
                <YAxis yAxisId="t" orientation="right" tickFormatter={(v) => $(v, 0)} {...YAXIS} width={68} />
                <Tooltip content={<Tip />} />
                <Legend {...LEGEND} />
                <Line yAxisId="u" type="monotone" dataKey="Units" stroke={P.amber}  strokeWidth={2} dot={{ r: 4, fill: P.amber,  stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="t" type="monotone" dataKey="Tax"   stroke={P.violet} strokeWidth={2} dot={{ r: 4, fill: P.violet, stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Employee Sales by Date" sub="Revenue from employee transactions over time">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={salesByDate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={P.violet} stopOpacity={0.2} />
                    <stop offset="90%" stopColor={P.violet} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" {...XAXIS} />
                <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="Employee" stroke={P.violet} strokeWidth={2} fill="url(#gE)" dot={{ r: 4, fill: P.violet, stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Chart>
        </div>
      </section>

      {/* ── 3. LOCATION ANALYSIS ── */}
      <section>
        <Section icon={MapPin} title="Location Performance" color={P.amber} />
        <div className="grid grid-cols-1 gap-4">
          <Chart title="Sales, Returns & Tax by Location" sub="Full financial breakdown per store">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesByLocation} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="location" {...XAXIS} />
                <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                <Tooltip content={<Tip />} />
                <Legend {...LEGEND} />
                <Bar dataKey="Sales"   fill={P.blue}   radius={[4, 4, 0, 0]} />
                <Bar dataKey="Returns" fill={P.rose}   radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tax"     fill={P.violet} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>



          <Chart title="Daily Sales by Location" sub="Each store's contribution per business date">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={salesByDate.map((d) => {
                  const row: Record<string, string | number> = { date: d.date };
                  salesByLocation.forEach((l) => {
                    row[`Loc ${l.location}`] = data
                      .filter((r) => r.BusinessDate === d.date && r.LocationId === l.location && r.TranType === "Sale")
                      .reduce((s, r) => s + n(r["SALE AMOUNT"]), 0);
                  });
                  return row;
                })}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" {...XAXIS} />
                <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                <Tooltip content={<Tip />} />
                <Legend {...LEGEND} />
                {salesByLocation.map((l, i) => (
                  <Bar key={l.location} dataKey={`Loc ${l.location}`} stackId="s" fill={RAINBOW[i % RAINBOW.length]} radius={i === salesByLocation.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        </div>
      </section>

      {/* ── 4. PRODUCT ANALYSIS ── */}
      <section>
        <Section icon={Package} title="Product & SKU Analysis" color={P.green} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Chart title="Top 10 SKUs by Revenue" sub="Highest-grossing items from sale transactions">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topItems} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => $(v, 0)} {...XAXIS} />
                <YAxis type="category" dataKey="item" tick={{ fontSize: 11, fill: "#64748b" }} width={72} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="Revenue" radius={[0, 4, 4, 0]}>
                  {topItems.map((_, i) => <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Top 10 SKUs by Units Sold" sub="Volume leaders across sale transactions">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[...topItems].sort((a, b) => b.Units - a.Units)} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" {...XAXIS} />
                <YAxis type="category" dataKey="item" tick={{ fontSize: 11, fill: "#64748b" }} width={72} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <Tooltip />
                <Bar dataKey="Units" fill={P.cyan} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>

        </div>
      </section>

      {/* ── 5. PAYMENT ANALYSIS ── */}
      <section>
        <Section icon={CreditCard} title="Payment & Tender Analysis" color={P.violet} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Chart title="Tender Amounts Ranked" sub="Bar comparison across payment methods">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tenderBreakdown} margin={{ top: 4, right: 4, left: 0, bottom: 36 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" {...XAXIS} angle={-25} textAnchor="end" interval={0} />
                <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                  {tenderBreakdown.map((_, i) => <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Chart>

          {tenderKeys.length > 0 && (
            <Chart title="Tender Mix by Date" sub="How payment methods shift across business days">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tenderByDate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" {...XAXIS} />
                  <YAxis tickFormatter={(v) => $(v, 0)} {...YAXIS} width={72} />
                  <Tooltip content={<Tip />} />
                  <Legend {...LEGEND} />
                  {tenderKeys.map((k, i) => (
                    <Bar key={k} dataKey={k} stackId="t" fill={RAINBOW[i % RAINBOW.length]} radius={i === tenderKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Chart>
          )}
        </div>
      </section>


    </div>
  );
}
