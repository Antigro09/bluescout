import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pit scouting" };

export default async function PitPage() {
  await requireUser();
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pit scouting" />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event selected yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [teams, pit] = await Promise.all([
    prisma.eventTeam.findMany({
      where: { eventId: event.id },
      orderBy: { teamNumber: "asc" },
      select: { teamNumber: true, team: { select: { nickname: true } } },
    }),
    prisma.pitScoutReport.findMany({
      where: { eventId: event.id },
      select: { teamNumber: true },
    }),
  ]);
  const scouted = new Set(pit.map((p) => p.teamNumber));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pit scouting"
        subtitle={`${event.name} · ${scouted.size}/${teams.length} teams scouted`}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((t) => {
          const done = scouted.has(t.teamNumber);
          return (
            <Link key={t.teamNumber} href={`/pit/${t.teamNumber}`}>
              <Card
                className={cn(
                  "h-full transition-colors hover:border-primary/50",
                  done && "border-success/40",
                )}
              >
                <CardContent className="flex items-center justify-between gap-2 py-4">
                  <div className="min-w-0">
                    <div className="text-lg font-bold">{t.teamNumber}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.team.nickname ?? "—"}
                    </div>
                  </div>
                  {done && (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
