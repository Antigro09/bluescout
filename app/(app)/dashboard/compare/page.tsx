import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { computeEventMetrics, type TeamMetrics } from "@/lib/metrics/compute";
import { PageHeader } from "@/components/app/page-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { MultiRadar } from "@/components/dashboard/charts";
import { TeamComparePicker } from "@/components/dashboard/team-compare-picker";
import { Card, CardContent } from "@/components/ui/card";
import { cn, fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Compare" };

const AXES = ["Auto", "Teleop", "Climb", "Defense", "Consistency"] as const;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ teams?: string }>;
}) {
  await requireUser();
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compare" action={<DashboardNav />} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event.
          </CardContent>
        </Card>
      </div>
    );
  }

  const all = await computeEventMetrics(event.id);
  const sp = await searchParams;
  const selected = (sp.teams ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
    .slice(0, 4);
  const picked = selected
    .map((n) => all.find((t) => t.teamNumber === n))
    .filter((t): t is TeamMetrics => Boolean(t));

  const maxAuto = Math.max(1, ...all.map((t) => t.avgAutoFuel));
  const maxTeleop = Math.max(1, ...all.map((t) => t.avgTeleopFuel));
  const axisVal = (t: TeamMetrics, axis: (typeof AXES)[number]): number => {
    switch (axis) {
      case "Auto":
        return Math.round((t.avgAutoFuel / maxAuto) * 100);
      case "Teleop":
        return Math.round((t.avgTeleopFuel / maxTeleop) * 100);
      case "Climb":
        return Math.round(t.climbSuccessRate * 100);
      case "Defense":
        return Math.round(t.defenseRate * 100);
      case "Consistency":
        return Math.round(t.consistency * 100);
    }
  };
  const radarData = AXES.map((axis) => {
    const row: Record<string, number | string> = { axis };
    for (const t of picked) row[String(t.teamNumber)] = axisVal(t, axis);
    return row;
  });

  const rows: { label: string; get: (t: TeamMetrics) => number | null }[] = [
    { label: "Composite", get: (t) => t.composite },
    { label: "Efficiency", get: (t) => t.efficiency },
    { label: "Reliability", get: (t) => t.reliability },
    { label: "Avg points", get: (t) => t.avgContribution },
    { label: "EPA total", get: (t) => t.epaTotal },
    { label: "EPA auto", get: (t) => t.epaAuto },
    { label: "EPA teleop", get: (t) => t.epaTeleop },
    { label: "EPA endgame", get: (t) => t.epaEndgame },
    { label: "Climb %", get: (t) => Math.round(t.climbSuccessRate * 100) },
    { label: "OPR", get: (t) => t.opr },
    { label: "Matches scouted", get: (t) => t.matchesScouted },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compare teams"
        subtitle="Pick up to four teams to compare side by side."
        action={<DashboardNav />}
      />
      <TeamComparePicker
        all={all.map((t) => ({ teamNumber: t.teamNumber, nickname: t.nickname }))}
        selected={selected}
      />

      {picked.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Add teams above to compare them.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="py-5">
              <MultiRadar
                data={radarData}
                teams={picked.map((t) => String(t.teamNumber))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Metric</th>
                    {picked.map((t) => (
                      <th
                        key={t.teamNumber}
                        className="px-4 py-3 text-right font-medium"
                      >
                        {t.teamNumber}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const vals = picked.map((t) => row.get(t));
                    const best = Math.max(
                      ...vals.map((v) => (v == null ? -Infinity : v)),
                    );
                    return (
                      <tr
                        key={row.label}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-4 py-2 text-muted-foreground">
                          {row.label}
                        </td>
                        {vals.map((v, i) => (
                          <td
                            key={i}
                            className={cn(
                              "px-4 py-2 text-right tabular-nums",
                              v != null && v === best && best > -Infinity
                                ? "font-bold text-success"
                                : "",
                            )}
                          >
                            {v == null ? "—" : fmt(v, 1)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
