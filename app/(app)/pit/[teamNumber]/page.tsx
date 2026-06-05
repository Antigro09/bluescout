import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { PageHeader } from "@/components/app/page-header";
import { PitForm } from "@/components/scouting/pit-form";
import { PhotoUploader } from "@/components/scouting/photo-uploader";
import { SuperNotes } from "@/components/scouting/super-notes";
import type { FieldValue } from "@/components/scouting/field-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Pit scouting" };

export default async function PitTeamPage({
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

  const [team, report, notes] = await Promise.all([
    prisma.team.findUnique({
      where: { teamNumber },
      select: { teamNumber: true, nickname: true },
    }),
    prisma.pitScoutReport.findUnique({
      where: { eventId_teamNumber: { eventId: event.id, teamNumber } },
      include: { photos: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.superScoutNote.findMany({
      where: { eventId: event.id, teamNumber },
      orderBy: { scoutedAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
  ]);

  const initial: Record<string, FieldValue> = {
    drivetrain: report?.drivetrain ?? null,
    weightLbs: report?.weightLbs ?? null,
    widthIn: report?.widthIn ?? null,
    lengthIn: report?.lengthIn ?? null,
    heightIn: report?.heightIn ?? null,
    motorCount: report?.motorCount ?? null,
    scoringMechanism: report?.scoringMechanism ?? "",
    maxFuelCapacity: report?.maxFuelCapacity ?? null,
    climbLevels: report?.climbLevels ?? [],
    autoMaxFuel: report?.autoMaxFuel ?? null,
    autoDescription: report?.autoDescription ?? "",
    language: report?.language ?? "",
    hasVision: report?.hasVision ?? false,
    notes: report?.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pit"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All teams
        </Link>
        <PageHeader
          title={`Team ${teamNumber}`}
          subtitle={team?.nickname ?? undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PitForm teamNumber={teamNumber} initial={initial} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploader
                teamNumber={teamNumber}
                photos={(report?.photos ?? []).map((p) => ({
                  id: p.id,
                  url: p.url,
                  caption: p.caption,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Super-scout notes</CardTitle>
            </CardHeader>
            <CardContent>
              <SuperNotes
                teamNumber={teamNumber}
                notes={notes.map((n) => ({
                  id: n.id,
                  content: n.content,
                  tags: n.tags,
                  aiSummary: n.aiSummary,
                  authorName: n.author?.name ?? null,
                  scoutedAt: n.scoutedAt.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
