import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { computeEventMetrics } from "@/lib/metrics/compute";
import { estimateContribution, type ClimbLevelValue } from "@/config/rebuilt-2026";
import { PageHeader } from "@/components/app/page-header";
import { TeamRadar, ContributionTrend } from "@/components/dashboard/charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Team breakdown" };

export default async function TeamDashboardPage({
  params,
}: {
  params: Promise<{ teamNumber: string }>;
}) {
  await requireUser();
  const { teamNumber: raw } = await params;
  const teamNumber = parseInt(raw, 10);
  if (Number.isNaN(teamNumber)) notFound();

  const event = await getActiveEvent();
  if (!event) notFound();

  const all = await computeEventMetrics(event.id);
  const team = all.find((t) => t.teamNumber === teamNumber);
  if (!team) notFound();

  const [reports, pit, notes] = await Promise.all([
    prisma.matchScoutReport.findMany({
      where: { eventId: event.id, teamNumber },
      orderBy: { match: { matchNumber: "asc" } },
      select: {
        autoFuel: true,
        teleopFuel: true,
        autoClimbL1: true,
        endgameClimb: true,
        climbFailed: true,
        defensePlayed: true,
        reliability: true,
        noShow: true,
        match: { select: { matchNumber: true } },
      },
    }),
    prisma.pitScoutReport.findUnique({
      where: { eventId_teamNumber: { eventId: event.id, teamNumber } },
    }),
    prisma.superScoutNote.findMany({
      where: { eventId: event.id, teamNumber },
      orderBy: { scoutedAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
  ]);

  const maxAuto = Math.max(1, ...all.map((t) => t.avgAutoFuel));
  const maxTeleop = Math.max(1, ...all.map((t) => t.avgTeleopFuel));
  const radar = [
    { axis: "Auto", value: Math.round((team.avgAutoFuel / maxAuto) * 100) },
    { axis: "Teleop", value: Math.round((team.avgTeleopFuel / maxTeleop) * 100) },
    { axis: "Climb", value: Math.round(team.climbSuccessRate * 100) },
    { axis: "Defense", value: Math.round(team.defenseRate * 100) },
    { axis: "Consistency", value: Math.round(team.consistency * 100) },
  ];

  const trend = reports.map((r) => ({
    match: `Q${r.match.matchNumber}`,
    points: estimateContribution({
      autoFuel: r.autoFuel,
      teleopFuel: r.teleopFuel,
      autoClimbL1: r.autoClimbL1,
      endgameClimb: r.endgameClimb as ClimbLevelValue,
      climbFailed: r.climbFailed,
      noShow: r.noShow,
    }).total,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/rankings"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Rankings
        </Link>
        <PageHeader
          title={`Team ${teamNumber}`}
          subtitle={team.nickname ?? undefined}
          action={
            <Link
              href={`/pit/${teamNumber}`}
              className="text-sm text-primary hover:underline"
            >
              Edit pit / notes →
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Composite" value={team.composite} big />
        <StatCard label="Efficiency" value={team.efficiency} />
        <StatCard label="Reliability" value={team.reliability} />
        <StatCard
          label="EPA / Rank"
          value={`${fmt(team.epaTotal, 0)}${team.rank ? ` · #${team.rank}` : ""}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {team.matchesScouted > 0 ? (
              <TeamRadar data={radar} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No match scouting data yet — showing EPA only.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Point contribution by match</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ContributionTrend data={trend} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No scouted matches yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Match log ({team.matchesScouted})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Match</th>
                  <th className="px-4 py-2 text-right font-medium">Auto</th>
                  <th className="px-4 py-2 text-right font-medium">Teleop</th>
                  <th className="px-4 py-2 text-center font-medium">Climb</th>
                  <th className="px-4 py-2 text-center font-medium">Def</th>
                  <th className="px-4 py-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => {
                  const pts = estimateContribution({
                    autoFuel: r.autoFuel,
                    teleopFuel: r.teleopFuel,
                    autoClimbL1: r.autoClimbL1,
                    endgameClimb: r.endgameClimb as ClimbLevelValue,
                    climbFailed: r.climbFailed,
                    noShow: r.noShow,
                  }).total;
                  return (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2 font-medium">
                        Q{r.match.matchNumber}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {r.autoFuel}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {r.teleopFuel}
                      </td>
                      <td className="px-4 py-2 text-center text-xs">
                        {r.climbFailed ? "✗" : r.endgameClimb}
                      </td>
                      <td className="px-4 py-2 text-center text-xs">
                        {r.defensePlayed === "NONE" ? "—" : "D"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {pts}
                      </td>
                    </tr>
                  );
                })}
                {reports.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No scouted matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {pit ? (
                <>
                  <Row label="Drivetrain" value={pit.drivetrain ?? "—"} />
                  <Row
                    label="Weight"
                    value={pit.weightLbs ? `${pit.weightLbs} lb` : "—"}
                  />
                  <Row
                    label="Climbs"
                    value={pit.climbLevels.join(", ") || "—"}
                  />
                  <Row label="Vision" value={pit.hasVision ? "Yes" : "No"} />
                  {pit.scoringMechanism && (
                    <p className="pt-1 text-muted-foreground">
                      {pit.scoringMechanism}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Not pit-scouted yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes.</p>
              )}
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md border border-border bg-card/50 p-2 text-sm"
                >
                  <p className="whitespace-pre-wrap">{n.content}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {n.tags.map((t) => (
                      <Badge key={t} variant="muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  big,
}: {
  label: string;
  value: number | string;
  big?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={
            big
              ? "text-3xl font-bold text-primary tabular-nums"
              : "text-2xl font-bold tabular-nums"
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
