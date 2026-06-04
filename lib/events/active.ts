import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { Event } from "@/lib/generated/prisma/client";

/** The event currently being scouted: DB `isActive`, else CURRENT_EVENT_KEY. */
export async function getActiveEvent(): Promise<Event | null> {
  const active = await prisma.event.findFirst({ where: { isActive: true } });
  if (active) return active;
  if (env.currentEventKey) {
    return prisma.event.findUnique({ where: { key: env.currentEventKey } });
  }
  return null;
}
