import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardList, QrCode } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { PageHeader } from "@/components/app/page-header";
import { AssignmentCache } from "@/components/scouting/assignment-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My matches" };

const COMP_LABEL: Record<string, string> = {
  QM: "Qual",
  EF: "EF",
  QF: "QF",
  SF: "SF",
  F: "Final",
};

export default async function AssignmentsPage() {
  const user = await requireUser();
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="My matches" />
        <EmptyCard>No active event yet. Check back once scouting starts.</EmptyCard>
      </div>
    );
  }

  const assignments = await prisma.scoutAssignment.findMany({
    where: { scouterId: user.id, eventId: event.id },
    orderBy: [{ match: { compLevel: "asc" } }, { match: { matchNumber: "asc" } }],
    select: {
      id: true,
      status: true,
      matchTeamId: true,
      match: { select: { matchNumber: true, compLevel: true } },
      matchTeam: {
        select: {
          teamNumber: true,
          alliance: true,
          position: true,
          team: { select: { nickname: true } },
        },
      },
      report: { select: { id: true } },
    },
  });

  const pending = assignments.filter((a) => a.status !== "SUBMITTED").length;

  return (
    <div className="space-y-6">
      <AssignmentCache />
      <PageHeader
        title="My matches"
        subtitle={`${event.name} · ${pending} to scout`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/qr">
              <QrCode className="size-4" />
              Share via QR
            </Link>
          </Button>
        }
      />

      {assignments.length === 0 ? (
        <EmptyCard>
          No matches assigned yet. Your scout lead will assign you a driver-station
          slot.
        </EmptyCard>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const done = a.status === "SUBMITTED" || a.report;
            return (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div
                    className={cn(
                      "flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-md text-xs font-semibold",
                      a.matchTeam.alliance === "RED"
                        ? "bg-red-500/15 text-red-500"
                        : "bg-blue-500/15 text-blue-500",
                    )}
                  >
                    <span className="text-[10px] uppercase opacity-70">
                      {COMP_LABEL[a.match.compLevel]}
                    </span>
                    <span className="text-base">{a.match.matchNumber}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      Team {a.matchTeam.teamNumber}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {a.matchTeam.team.nickname ?? "—"} ·{" "}
                      {a.matchTeam.alliance === "RED" ? "Red" : "Blue"}{" "}
                      {a.matchTeam.position}
                    </div>
                  </div>
                  {done ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 size-3" />
                        Done
                      </Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/scout/${a.matchTeamId}`}>Edit</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button asChild size="sm">
                      <Link href={`/scout/${a.matchTeamId}`}>
                        <ClipboardList className="size-4" />
                        Scout
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
