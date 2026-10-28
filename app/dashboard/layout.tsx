"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  // Sidebar hidden entirely for now — onMenuClick kept as a no-op on Header
  // so re-adding <Sidebar> later just means wiring real state back in.
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
