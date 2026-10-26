"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/sales-report": "Sales Report",
  "/dashboard/deal-report": "Deal Report",
  "/dashboard/locations": "Locations",
  "/dashboard/users": "Users",
  "/dashboard/settings": "Settings",
  "/dashboard/authentication/roles": "Roles",
  "/dashboard/authentication/users": "Users",
  "/dashboard/authentication/regions": "Regions",
  "/dashboard/authentication/change-password": "Change Password",
  "/dashboard/portfolio/stores": "Stores",
  "/dashboard/portfolio/users": "Users",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  const toggleSidebar = () => setCollapsed((v) => !v);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
