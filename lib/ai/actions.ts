"use server";

import { requireUser, requireRole } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { prisma } from "@/lib/db";
import { isAIEnabled } from "@/lib/ai/provider";
import { summarizeNotes, suggestPicklist } from "@/lib/ai/agents";

export async function summarizeTeamNotesAction(
  teamNumber: number,
): Promise<{ summary?: string; error?: string }> {
  await requireUser();
  if (!isAIEnabled()) return { error: "AI is disabled." };
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  const notes = await prisma.superScoutNote.findMany({
    where: { eventId: event.id, teamNumber },
    select: { content: true },
  });
  if (notes.length === 0) return { error: "No notes to summarize." };
  try {
    return { summary: await summarizeNotes(notes.map((n) => n.content)) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function suggestPicklistAction(): Promise<{
  text?: string;
  error?: string;
}> {
  await requireRole(["ADMIN", "SCOUT_LEAD", "STRATEGIST"]);
  if (!isAIEnabled()) return { error: "AI is disabled." };
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  try {
    return { text: await suggestPicklist(event.id) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
