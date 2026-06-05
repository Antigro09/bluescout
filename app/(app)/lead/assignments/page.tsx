import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { clearAssignmentsAction } from "@/lib/assignments/actions";
import { LINEUP_POSITIONS } from "@/lib/assignments/positions";
import { PageHeader } from "@/components/app/page-header";
import { LineupForm } from "@/components/assignments/lineup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Assign scouters" };

export default async function LeadAssignmentsPage() {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assign scouters" />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event yet.{" "}
            <Link href="/admin/events" className="text-primary hover:underline">
              Sync and activate an event
            </Link>{" "}
            to start assigning.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [scouters, matches] = await Promise.all([
    prisma.user.findMany({
      where: { approved: true, active: true, role: { not: "VIEWER" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.match.findMany({
      where: { eventId: event.id, compLevel: "QM" },
      orderBy: { matchNumber: "asc" },
      select: {
        id: true,
        matchNumber: true,
        teams: {
          select: {
            id: true,
            teamNumber: true,
            alliance: true,
            position: true,
            assignments: {
              select: {
                status: true,
                scouterId: true,
                scouter: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  // Compute coverage + current lineup defaults from existing assignments.
  let slots = 0;
  let assigned = 0;
  let submitted = 0;
  const tally = new Map<string, Map<string, number>>();
  for (const m of matches) {
    for (const mt of m.teams) {
      slots++;
      const a = mt.assignments[0];
      if (a) {
        assigned++;
        if (a.status === "SUBMITTED") submitted++;
        const key = `${mt.alliance}${mt.position}`;
        const inner = tally.get(key) ?? new Map<string, number>();
        inner.set(a.scouterId, (inner.get(a.scouterId) ?? 0) + 1);
        tally.set(key, inner);
      }
    }
  }
  const defaults: Record<string, string> = {};
  for (const [key, inner] of tally) {
    let best = "";
    let bestN = 0;
    for (const [sid, n] of inner) {
      if (n > bestN) {
        best = sid;
        bestN = n;
      }
    }
    defaults[key] = best;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assign scouters"
        subtitle={`${event.name} · ${matches.length} qualification matches`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scouting lineup</CardTitle>
          <CardDescription>
            Assign each driver-station slot to a scouter for the whole event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineupForm scouters={scouters} defaults={defaults} />
          <form action={clearAssignmentsAction}>
            <Button variant="ghost" size="sm" type="submit">
              Clear unsubmitted assignments
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Robot-matches" value={slots} />
        <Stat label="Assigned" value={assigned} tone="primary" />
        <Stat label="Submitted" value={submitted} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
          <CardDescription>
            Each cell shows the team scouted in that slot. Color = status.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Match</th>
                {LINEUP_POSITIONS.map((p) => (
                  <th
                    key={p.key}
                    className={cn(
                      "px-2 py-2 text-center font-medium",
                      p.alliance === "RED" ? "text-red-500" : "text-blue-500",
                    )}
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="max-h-[28rem]">
              {matches.map((m) => {
                const byKey = new Map(
                  m.teams.map((mt) => [`${mt.alliance}${mt.position}`, mt]),
                );
                return (
                  <tr key={m.id} className="border-b border-border/40">
                    <td className="px-3 py-1.5 font-medium">Q{m.matchNumber}</td>
                    {LINEUP_POSITIONS.map((p) => {
                      const mt = byKey.get(p.key);
                      const a = mt?.assignments[0];
                      const tone =
                        a?.status === "SUBMITTED"
                          ? "bg-success/15 text-success"
                          : a
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground";
                      return (
                        <td key={p.key} className="px-1 py-1 text-center">
                          <span
                            title={a?.scouter?.name ?? "Unassigned"}
                            className={cn(
                              "inline-block min-w-12 rounded px-1.5 py-0.5 text-xs tabular-nums",
                              tone,
                            )}
                          >
                            {mt?.teamNumber ?? "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success";
}) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div
          className={cn(
            "text-2xl font-bold tabular-nums",
            tone === "primary" && "text-primary",
            tone === "success" && "text-success",
          )}
        >
          {value}
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
