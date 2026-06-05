import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { computeScoutAccuracy } from "@/lib/metrics/accuracy";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Scout accuracy" };

const TONE: Record<string, "success" | "default" | "warning" | "destructive" | "muted"> = {
  Excellent: "success",
  Good: "default",
  Fair: "warning",
  Review: "destructive",
  "—": "muted",
};

export default async function AccuracyPage() {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Scout accuracy" />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event.
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = await computeScoutAccuracy(event.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scout accuracy"
        subtitle="Scouted alliance output vs actual TBA scores — lower error is better."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3 text-left font-medium">Scouter</th>
                <th className="px-6 py-3 text-right font-medium">Reports</th>
                <th className="px-6 py-3 text-right font-medium">Compared</th>
                <th className="px-6 py-3 text-right font-medium">Avg error</th>
                <th className="px-6 py-3 text-right font-medium">Quality</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No completed matches with full scouting yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.scouterId} className="border-b border-border/40 last:border-0">
                  <td className="px-6 py-3 font-medium">{r.name}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{r.reports}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                    {r.comparedAlliances}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {r.avgErrorPct == null ? "—" : `${r.avgErrorPct}%`}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Badge variant={TONE[r.quality]}>{r.quality}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
