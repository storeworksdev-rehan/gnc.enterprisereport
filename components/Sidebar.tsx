"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Tag,
  Store,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  ShieldCheck,
  Shield,
  KeyRound,
} from "lucide-react";

const topItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Sales Report", href: "/dashboard/sales-report", icon: BarChart3 },
  { label: "Deal Report", href: "/dashboard/deal-report", icon: Tag },
];

const authItems = [
  { label: "Roles", href: "/dashboard/authentication/roles", icon: Shield },
  { label: "Users", href: "/dashboard/authentication/users", icon: Users },
  { label: "Change Password", href: "/dashboard/authentication/change-password", icon: KeyRound },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [authOpen, setAuthOpen] = useState(
    authItems.some((i) => pathname.startsWith(i.href)),
  );

  const linkClass = (href: string) =>
    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      pathname === href || pathname.startsWith(href)
        ? "bg-[#E60D2E] text-white font-semibold"
        : "text-slate-400 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-[#2e2e2e] bg-[#1a1a1a] transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-[#2e2e2e] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E60D2E]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-white">
            GNC Enterprise
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {topItems.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                className={linkClass(href)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* Authentication group */}
        <div className="mt-4">
          {!collapsed && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Authentication
            </p>
          )}

          {collapsed ? (
            /* Collapsed — show child icons directly */
            <ul className="space-y-1">
              {authItems.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} title={label} className={linkClass(href)}>
                    <Icon className="h-4 w-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            /* Expanded — collapsible group */
            <>
              <button
                onClick={() => setAuthOpen((v) => !v)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">
                  Authentication
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    authOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {authOpen && (
                <ul className="mt-0.5 space-y-0.5 pl-4">
                  {authItems.map(({ label, href, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          pathname.startsWith(href)
                            ? "bg-[#E60D2E] text-white font-semibold"
                            : "text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-slate-600" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-slate-600" />
        )}
      </button>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-[#2e2e2e] px-4 py-3">
          <p className="text-xs text-slate-500">Internal Use Only</p>
        </div>
      )}
    </aside>
  );
}
