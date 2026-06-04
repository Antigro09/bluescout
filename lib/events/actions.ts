"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { syncEvent } from "@/lib/sync/event-sync";

export type SyncState = { error?: string; message?: string } | undefined;

export async function syncEventAction(
  _prev: SyncState,
  formData: FormData,
): Promise<SyncState> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const key = String(formData.get("eventKey") ?? "")
    .trim()
    .toLowerCase();
  if (!/^\d{4}[a-z0-9]+$/.test(key)) {
    return { error: "Enter a valid TBA event key, e.g. 2026wabon." };
  }
  try {
    const r = await syncEvent(key);
    revalidatePath("/admin/events");
    revalidatePath("/dashboard");
    const warn = r.warnings.length
      ? ` · warnings: ${r.warnings.join("; ")}`
      : "";
    return {
      message: `Synced ${r.event} — ${r.teams} teams, ${r.matches} matches${warn}`,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setActiveEventAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const id = String(formData.get("eventId"));
  await prisma.$transaction([
    prisma.event.updateMany({
      data: { isActive: false },
      where: { isActive: true },
    }),
    prisma.event.update({ where: { id }, data: { isActive: true } }),
  ]);
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
}
