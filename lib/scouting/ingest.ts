import { prisma } from "@/lib/db";
import { reportSchema, type ReportInput } from "@/lib/scouting/schema";

export interface IngestResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function toFields(d: ReportInput) {
  return {
    startPosition: d.startPosition ?? null,
    noShow: d.noShow,
    autoLeave: d.autoLeave,
    autoFuel: d.autoFuel,
    autoClimbL1: d.autoClimbL1,
    teleopFuel: d.teleopFuel,
    endgameClimb: d.endgameClimb,
    climbFailed: d.climbFailed,
    defensePlayed: d.defensePlayed,
    defenseRating: d.defenseRating ?? null,
    driverSkill: d.driverSkill ?? null,
    reliability: d.reliability,
    card: d.card,
    notes: d.notes ?? null,
  };
}

/**
 * Upsert a batch of match scouting reports idempotently by clientUuid, then
 * mark the corresponding assignment SUBMITTED. Shared by the online API,
 * background sync, and QR intake. Invalid rows are skipped, not fatal.
 */
export async function ingestReports(
  raw: unknown[],
  source: "online" | "sync" | "qr",
  fallbackScouterId?: string,
): Promise<IngestResult> {
  const result: IngestResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const item of raw) {
    const parsed = reportSchema.safeParse(item);
    if (!parsed.success) {
      result.skipped++;
      result.errors.push(parsed.error.issues[0]?.message ?? "invalid report");
      continue;
    }
    const d = parsed.data;
    const scouterId = d.scouterId ?? fallbackScouterId;
    const scoutedAt = d.scoutedAt ? new Date(d.scoutedAt) : new Date();
    const fields = toFields(d);

    try {
      const existing = await prisma.matchScoutReport.findUnique({
        where: { clientUuid: d.clientUuid },
        select: { id: true },
      });

      await prisma.matchScoutReport.upsert({
        where: { clientUuid: d.clientUuid },
        create: {
          clientUuid: d.clientUuid,
          event: { connect: { id: d.eventId } },
          match: { connect: { id: d.matchId } },
          matchTeam: { connect: { id: d.matchTeamId } },
          team: { connect: { teamNumber: d.teamNumber } },
          ...(scouterId ? { scouter: { connect: { id: scouterId } } } : {}),
          ...fields,
          source,
          deviceId: d.deviceId ?? null,
          scoutedAt,
        },
        update: { ...fields, scoutedAt },
      });

      await prisma.scoutAssignment.updateMany({
        where: {
          matchTeamId: d.matchTeamId,
          ...(scouterId ? { scouterId } : {}),
        },
        data: { status: "SUBMITTED" },
      });

      if (existing) result.updated++;
      else result.inserted++;
    } catch (e) {
      result.skipped++;
      result.errors.push(`${d.clientUuid}: ${(e as Error).message}`);
    }
  }

  return result;
}
