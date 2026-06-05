"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import type { TeamMetrics } from "@/lib/metrics/compute";
import { cn, fmt } from "@/lib/utils";

type SortKey =
  | "composite"
  | "efficiency"
  | "reliability"
  | "avgContribution"
  | "epaTotal"
  | "seasonEpa"
  | "sosPercentile"
  | "climbSuccessRate"
  | "matchesScouted"
  | "rank";

const COLUMNS: { key: SortKey; label: string; title?: string }[] = [
  { key: "composite", label: "Composite" },
  { key: "efficiency", label: "Efficiency" },
  { key: "reliability", label: "Reliability" },
  { key: "avgContribution", label: "Avg pts" },
  { key: "epaTotal", label: "EPA" },
  { key: "seasonEpa", label: "Season", title: "Season-long Statbotics EPA (all events this year)" },
  { key: "sosPercentile", label: "SoS", title: "Strength of schedule — higher = harder field faced" },
  { key: "climbSuccessRate", label: "Climb%" },
  { key: "matchesScouted", label: "Matches" },
];

function val(t: TeamMetrics, k: SortKey): number {
  const v = t[k];
  return typeof v === "number" ? v : -Infinity;
}

function tone(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-foreground";
  if (score >= 30) return "text-warning";
  return "text-muted-foreground";
}

// High SoS = tough schedule (stats are legit); low SoS = easy (caution: inflated).
function sosTone(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 66) return "text-primary";
  if (pct <= 33) return "text-warning";
  return "text-foreground";
}

export function RankingsTable({ teams }: { teams: TeamMetrics[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [dir, setDir] = useState<1 | -1>(-1);

  const sorted = [...teams].sort((a, b) => (val(a, sortKey) - val(b, sortKey)) * dir);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setDir(-1);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[54rem] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-3 text-left font-medium">#</th>
            <th className="px-3 py-3 text-left font-medium">Team</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-3 py-3 text-right font-medium">
                <button
                  onClick={() => toggleSort(c.key)}
                  title={c.title}
                  className={cn(
                    "inline-flex items-center gap-1 hover:text-foreground",
                    sortKey === c.key && "text-foreground",
                  )}
                >
                  {c.label}
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr
              key={t.teamNumber}
              onClick={() => router.push(`/dashboard/team/${t.teamNumber}`)}
              className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-accent/50"
            >
              <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                {i + 1}
              </td>
              <td className="px-3 py-2.5">
                <div className="font-semibold">{t.teamNumber}</div>
                <div className="max-w-40 truncate text-xs text-muted-foreground">
                  {t.nickname ?? "—"}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${t.composite}%` }}
                    />
                  </div>
                  <span className="w-7 font-bold tabular-nums">
                    {t.composite}
                  </span>
                </div>
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right font-medium tabular-nums",
                  tone(t.efficiency),
                )}
              >
                {t.efficiency}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right font-medium tabular-nums",
                  tone(t.reliability),
                )}
              >
                {t.reliability}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {t.matchesScouted > 0 ? fmt(t.avgContribution, 1) : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {fmt(t.epaTotal, 1)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                {fmt(t.seasonEpa, 0)}
              </td>
              <td
                title={
                  t.scheduleDeltaEpa != null
                    ? `Δ ${t.scheduleDeltaEpa >= 0 ? "+" : ""}${t.scheduleDeltaEpa.toFixed(1)} pts schedule tailwind`
                    : undefined
                }
                className={cn(
                  "px-3 py-2.5 text-right tabular-nums",
                  sosTone(t.sosPercentile),
                )}
              >
                {t.sosPercentile != null ? `${Math.round(t.sosPercentile)}%` : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {t.matchesScouted > 0
                  ? `${Math.round(t.climbSuccessRate * 100)}%`
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                {t.matchesScouted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
