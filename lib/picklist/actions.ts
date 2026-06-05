"use server";

import { revalidatePath } from "next/cache";
import { requireRole, canStrategize } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { computeEventMetrics } from "@/lib/metrics/compute";
import { notifyPicklistChanged } from "@/lib/realtime/emit";
import type { PicklistKind } from "@/lib/generated/prisma/enums";

async function requireStrategist() {
  return requireRole(["ADMIN", "SCOUT_LEAD", "STRATEGIST"]);
}

export async function createPicklistAction(
  name: string,
  kind: PicklistKind,
): Promise<{ id?: string; error?: string }> {
  const user = await requireStrategist();
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  const list = await prisma.picklist.create({
    data: {
      eventId: event.id,
      name: name.trim() || "Picklist",
      kind,
      createdById: user.id,
    },
  });
  revalidatePath("/picklist");
  return { id: list.id };
}

export async function seedFromRankingsAction(
  name: string,
): Promise<{ id?: string; error?: string }> {
  const user = await requireStrategist();
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  const metrics = await computeEventMetrics(event.id);
  const list = await prisma.picklist.create({
    data: {
      eventId: event.id,
      name: name.trim() || "Overall picklist",
      kind: "OVERALL",
      createdById: user.id,
      entries: {
        create: metrics.map((m, i) => ({
          teamNumber: m.teamNumber,
          order: i,
        })),
      },
    },
  });
  revalidatePath("/picklist");
  return { id: list.id };
}

export async function addEntryAction(
  picklistId: string,
  teamNumber: number,
): Promise<void> {
  await requireStrategist();
  const count = await prisma.picklistEntry.count({ where: { picklistId } });
  await prisma.picklistEntry.upsert({
    where: { picklistId_teamNumber: { picklistId, teamNumber } },
    create: { picklistId, teamNumber, order: count },
    update: {},
  });
  await prisma.doNotPickEntry.deleteMany({ where: { picklistId, teamNumber } });
  notifyPicklistChanged(picklistId);
}

export async function removeEntryAction(entryId: string): Promise<void> {
  await requireStrategist();
  const entry = await prisma.picklistEntry.findUnique({
    where: { id: entryId },
    select: { picklistId: true },
  });
  if (!entry) return;
  await prisma.picklistEntry.delete({ where: { id: entryId } });
  notifyPicklistChanged(entry.picklistId);
}

export async function reorderEntriesAction(
  picklistId: string,
  orderedIds: string[],
): Promise<void> {
  await requireStrategist();
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.picklistEntry.update({ where: { id }, data: { order: i } }),
    ),
  );
  notifyPicklistChanged(picklistId);
}

export async function togglePickedAction(entryId: string): Promise<void> {
  await requireStrategist();
  const entry = await prisma.picklistEntry.findUnique({
    where: { id: entryId },
    select: { picklistId: true, picked: true },
  });
  if (!entry) return;
  await prisma.picklistEntry.update({
    where: { id: entryId },
    data: { picked: !entry.picked },
  });
  notifyPicklistChanged(entry.picklistId);
}

export async function toggleDoNotPickAction(
  picklistId: string,
  teamNumber: number,
): Promise<void> {
  await requireStrategist();
  const dnp = await prisma.doNotPickEntry.findUnique({
    where: { picklistId_teamNumber: { picklistId, teamNumber } },
  });
  if (dnp) {
    await prisma.doNotPickEntry.delete({ where: { id: dnp.id } });
  } else {
    await prisma.picklistEntry.deleteMany({ where: { picklistId, teamNumber } });
    await prisma.doNotPickEntry.create({
      data: { picklistId, teamNumber },
    });
  }
  notifyPicklistChanged(picklistId);
}

export async function addCommentAction(
  picklistId: string,
  content: string,
  teamNumber?: number,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  if (!content.trim()) return;
  await prisma.picklistComment.create({
    data: {
      picklistId,
      authorId: user.id,
      content: content.trim().slice(0, 500),
      teamNumber: teamNumber ?? null,
    },
  });
  notifyPicklistChanged(picklistId);
}

export async function setLockedAction(
  picklistId: string,
  locked: boolean,
): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  await prisma.picklist.update({ where: { id: picklistId }, data: { locked } });
  notifyPicklistChanged(picklistId);
}

export async function deletePicklistAction(picklistId: string): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  await prisma.picklist.delete({ where: { id: picklistId } });
  revalidatePath("/picklist");
}

// re-export for type-only convenience in client (function, allowed in use server)
export async function canEditPicklist(): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? canStrategize(user) : false;
}
