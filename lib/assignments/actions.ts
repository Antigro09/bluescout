"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { LINEUP_POSITIONS, type AssignState } from "@/lib/assignments/positions";

/**
 * Apply a per-position scouting lineup to every qualification match of the
 * active event. Each scouter watches one driver-station slot all event — the
 * standard stands-scouting setup. Already-submitted reports are never disturbed.
 */
export async function applyLineupAction(
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const lead = await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();
  if (!event) {
    return { error: "No active event. Sync and activate one under Events first." };
  }

  const lineup = new Map<string, string>();
  for (const p of LINEUP_POSITIONS) {
    const v = String(formData.get(p.key) ?? "");
    if (v) lineup.set(p.key, v);
  }
  if (lineup.size === 0) {
    return { error: "Choose at least one scouter for a position." };
  }

  const matchTeams = await prisma.matchTeam.findMany({
    where: { match: { eventId: event.id, compLevel: "QM" } },
    select: { id: true, matchId: true, alliance: true, position: true },
  });

  const targets = matchTeams
    .map((mt) => {
      const scouterId = lineup.get(`${mt.alliance}${mt.position}`);
      return scouterId
        ? { matchTeamId: mt.id, matchId: mt.matchId, scouterId }
        : null;
    })
    .filter((t): t is { matchTeamId: string; matchId: string; scouterId: string } =>
      Boolean(t),
    );

  const ids = targets.map((t) => t.matchTeamId);
  const existing = await prisma.scoutAssignment.findMany({
    where: { matchTeamId: { in: ids } },
    select: { id: true, matchTeamId: true, status: true },
  });
  const submittedMt = new Set(
    existing.filter((e) => e.status === "SUBMITTED").map((e) => e.matchTeamId),
  );
  const toDelete = existing
    .filter((e) => e.status !== "SUBMITTED")
    .map((e) => e.id);
  const toCreate = targets
    .filter((t) => !submittedMt.has(t.matchTeamId))
    .map((t) => ({
      eventId: event.id,
      matchId: t.matchId,
      matchTeamId: t.matchTeamId,
      scouterId: t.scouterId,
      assignedById: lead.id,
      status: "PENDING" as const,
    }));

  await prisma.$transaction([
    prisma.scoutAssignment.deleteMany({ where: { id: { in: toDelete } } }),
    prisma.scoutAssignment.createMany({ data: toCreate, skipDuplicates: true }),
  ]);

  revalidatePath("/lead/assignments");
  revalidatePath("/assignments");
  const matchCount = new Set(toCreate.map((c) => c.matchId)).size;
  return {
    message: `Assigned ${toCreate.length} robot-matches across ${matchCount} matches.`,
  };
}

export async function clearAssignmentsAction(): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();
  if (!event) return;
  await prisma.scoutAssignment.deleteMany({
    where: { eventId: event.id, status: { not: "SUBMITTED" } },
  });
  revalidatePath("/lead/assignments");
  revalidatePath("/assignments");
}

/** Per-robot override (used by the status grid). */
export async function assignOneAction(formData: FormData): Promise<void> {
  const lead = await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();
  if (!event) return;
  const matchTeamId = String(formData.get("matchTeamId"));
  const scouterId = String(formData.get("scouterId") ?? "");
  const mt = await prisma.matchTeam.findUnique({
    where: { id: matchTeamId },
    select: { matchId: true },
  });
  if (!mt) return;
  await prisma.scoutAssignment.deleteMany({
    where: { matchTeamId, status: { not: "SUBMITTED" } },
  });
  if (scouterId) {
    await prisma.scoutAssignment.create({
      data: {
        eventId: event.id,
        matchId: mt.matchId,
        matchTeamId,
        scouterId,
        assignedById: lead.id,
      },
    });
  }
  revalidatePath("/lead/assignments");
  revalidatePath("/assignments");
}
