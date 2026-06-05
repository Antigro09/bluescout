"use server";

import { randomBytes } from "node:crypto";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { env } from "@/lib/env";

export type ShareResult = { url?: string; error?: string };

export async function createDashboardShareAction(): Promise<ShareResult> {
  const user = await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();
  if (!event) return { error: "No active event." };
  const token = randomBytes(12).toString("base64url");
  await prisma.shareLink.create({
    data: {
      token,
      scope: "DASHBOARD",
      eventId: event.id,
      createdById: user.id,
      label: event.name,
    },
  });
  return { url: `${env.appUrl}/share/${token}` };
}

export async function createPicklistShareAction(
  picklistId: string,
): Promise<ShareResult> {
  const user = await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const token = randomBytes(12).toString("base64url");
  await prisma.shareLink.create({
    data: { token, scope: "PICKLIST", picklistId, createdById: user.id },
  });
  return { url: `${env.appUrl}/share/${token}` };
}
