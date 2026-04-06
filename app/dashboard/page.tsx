import { BarChart3, TrendingUp, Store, RefreshCw } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Total Sales",
    value: "$4,821.36",
    change: "+8.2%",
    positive: true,
    icon: TrendingUp,
    color: "bg-[#E60D2E]",
  },
  {
    label: "Transactions",
    value: "142",
    change: "+3.1%",
    positive: true,
    icon: BarChart3,
    color: "bg-emerald-500",
  },
  {
    label: "Locations",
    value: "2",
    change: "Active",
    positive: true,
    icon: Store,
    color: "bg-violet-500",
  },
  {
    label: "Returns",
    value: "$215.43",
    change: "-12.4%",
    positive: false,
    icon: RefreshCw,
    color: "bg-rose-500",
  },
];

const recentActivity = [
  { id: "TXN-1246", location: "6106", date: "Mar 31, 2026", process: "Sale", total: "$17.48", status: "Completed" },
  { id: "TXN-1244", location: "6106", date: "Mar 31, 2026", process: "Return", total: "-$15.94", status: "Refunded" },
  { id: "TXN-1243", location: "6106", date: "Mar 31, 2026", process: "Sale", total: "$31.84", status: "Completed" },
  { id: "TXN-1242", location: "6106", date: "Mar 31, 2026", process: "Employee", total: "$55.58", status: "Completed" },
  { id: "TXN-1228", location: "9973", date: "Mar 30, 2026", process: "Sale", total: "$37.00", status: "Completed" },
];

const statusColors: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Refunded: "bg-rose-100 text-rose-700",
  Pending: "bg-amber-100 text-amber-700",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, change, positive, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className={`mt-3 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
              {change} <span className="text-slate-400 font-normal">vs last period</span>
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Transactions</h2>
          <Link
            href="/dashboard/sales-report"
            className="text-xs font-medium text-[#E60D2E] hover:text-[#c40a27] transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-slate-500">Transaction</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500">Location</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500">Date</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500">Type</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 text-right">Total</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-900">{row.id}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.location}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.date}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.process}</td>
                  <td className={`px-6 py-3.5 text-right font-medium ${row.total.startsWith("-") ? "text-rose-600" : "text-slate-900"}`}>
                    {row.total}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
