"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/rankings", label: "Rankings" },
  { href: "/dashboard/compare", label: "Compare" },
  { href: "/dashboard/simulator", label: "Simulator" },
  { href: "/dashboard/ask", label: "Ask AI" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <div className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
