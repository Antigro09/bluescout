"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  ListOrdered,
  CalendarRange,
  QrCode,
  Users,
  CalendarCog,
  Target,
  Swords,
  Download,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ALL = ["ADMIN", "SCOUT_LEAD", "SCOUTER", "STRATEGIST", "VIEWER"];
const STRAT = ["ADMIN", "SCOUT_LEAD", "STRATEGIST"];
const LEAD = ["ADMIN", "SCOUT_LEAD"];

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
  { href: "/assignments", label: "My Matches", icon: ClipboardList, roles: ALL },
  { href: "/pit", label: "Pit", icon: Wrench, roles: ALL },
  { href: "/picklist", label: "Picklists", icon: ListOrdered, roles: STRAT },
  { href: "/lead/assignments", label: "Assign", icon: CalendarRange, roles: LEAD },
  { href: "/lead/intake", label: "Scan", icon: QrCode, roles: LEAD },
  { href: "/lead/accuracy", label: "Accuracy", icon: Target, roles: LEAD },
  { href: "/admin/strategy", label: "Strategy", icon: Swords, roles: STRAT },
  { href: "/admin/export", label: "Data", icon: Download, roles: LEAD },
  { href: "/admin/users", label: "People", icon: Users, roles: LEAD },
  { href: "/admin/events", label: "Events", icon: CalendarCog, roles: LEAD },
];

export function MainNav({ role }: { role: string }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => l.roles.includes(role));

  return (
    <nav className="-mx-2 flex items-center gap-1 overflow-x-auto px-2">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <link.icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
