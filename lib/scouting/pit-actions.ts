"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireUser, isLead } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";

const pitSchema = z.object({
  teamNumber: z.number().int(),
  drivetrain: z.enum(["SWERVE", "TANK", "MECANUM", "OTHER"]).nullable().optional(),
  weightLbs: z.number().nullable().optional(),
  widthIn: z.number().nullable().optional(),
  lengthIn: z.number().nullable().optional(),
  heightIn: z.number().nullable().optional(),
  motorCount: z.number().int().nullable().optional(),
  scoringMechanism: z.string().max(500).nullable().optional(),
  maxFuelCapacity: z.number().int().nullable().optional(),
  climbLevels: z.array(z.enum(["L1", "L2", "L3"])).default([]),
  autoMaxFuel: z.number().int().nullable().optional(),
  autoDescription: z.string().max(1000).nullable().optional(),
  language: z.string().max(100).nullable().optional(),
  hasVision: z.boolean().default(false),
  notes: z.string().max(2000).nullable().optional(),
});

export type PitInput = z.infer<typeof pitSchema>;
export type PitState = { error?: string; ok?: boolean };

export async function savePitReportAction(input: PitInput): Promise<PitState> {
  const user = await requireUser();
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  const parsed = pitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { teamNumber, ...fields } = parsed.data;

  await prisma.pitScoutReport.upsert({
    where: { eventId_teamNumber: { eventId: event.id, teamNumber } },
    create: {
      clientUuid: randomUUID(),
      eventId: event.id,
      teamNumber,
      scouterId: user.id,
      ...fields,
    },
    update: { ...fields, scouterId: user.id },
  });
  revalidatePath(`/pit/${teamNumber}`);
  revalidatePath("/pit");
  return { ok: true };
}

async function ensurePitReport(eventId: string, teamNumber: number, scouterId: string) {
  const existing = await prisma.pitScoutReport.findUnique({
    where: { eventId_teamNumber: { eventId, teamNumber } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.pitScoutReport.create({
    data: { clientUuid: randomUUID(), eventId, teamNumber, scouterId },
    select: { id: true },
  });
  return created.id;
}

export async function addPhotoAction(
  teamNumber: number,
  dataUrl: string,
  caption?: string,
): Promise<PitState> {
  const user = await requireUser();
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > 800_000) {
    return { error: "Image too large or invalid." };
  }
  const pitId = await ensurePitReport(event.id, teamNumber, user.id);
  await prisma.robotPhoto.create({
    data: { pitReportId: pitId, url: dataUrl, caption: caption ?? null },
  });
  revalidatePath(`/pit/${teamNumber}`);
  return { ok: true };
}

export async function deletePhotoAction(photoId: string): Promise<void> {
  await requireUser();
  await prisma.robotPhoto.delete({ where: { id: photoId } });
}

export async function addSuperNoteAction(
  teamNumber: number,
  content: string,
  tags: string[],
): Promise<PitState> {
  const user = await requireUser();
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  if (!content.trim()) return { error: "Note is empty." };
  await prisma.superScoutNote.create({
    data: {
      clientUuid: randomUUID(),
      eventId: event.id,
      teamNumber,
      authorId: user.id,
      content: content.trim(),
      tags: tags.filter(Boolean).slice(0, 8),
    },
  });
  revalidatePath(`/pit/${teamNumber}`);
  return { ok: true };
}

export async function deleteSuperNoteAction(noteId: string): Promise<void> {
  const user = await requireUser();
  const note = await prisma.superScoutNote.findUnique({
    where: { id: noteId },
    select: { authorId: true, teamNumber: true },
  });
  if (!note) return;
  if (note.authorId !== user.id && !isLead(user)) return;
  await prisma.superScoutNote.delete({ where: { id: noteId } });
  revalidatePath(`/pit/${note.teamNumber}`);
}
