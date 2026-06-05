import { getDb, type CachedAssignment } from "@/lib/offline/db";
import type { ReportInput } from "@/lib/scouting/schema";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("bluescout_device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("bluescout_device", id);
  }
  return id;
}

export function getStoredUserId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("bluescout_uid") ?? undefined;
}

export async function cacheAssignments(list: CachedAssignment[]): Promise<void> {
  await getDb().assignments.bulkPut(list);
}

export async function getCachedAssignment(
  matchTeamId: string,
): Promise<CachedAssignment | undefined> {
  return getDb().assignments.get(matchTeamId);
}

export async function queueReport(payload: ReportInput): Promise<void> {
  await getDb().reports.put({
    clientUuid: payload.clientUuid,
    matchTeamId: payload.matchTeamId,
    payload,
    synced: 0,
    updatedAt: Date.now(),
  });
  // optimistic local status bump so the assignment list reflects "done"
  const a = await getDb().assignments.get(payload.matchTeamId);
  if (a) await getDb().assignments.update(payload.matchTeamId, { status: "SUBMITTED" });
}

export async function getQueuedForMatchTeam(
  matchTeamId: string,
): Promise<ReportInput | undefined> {
  const row = await getDb()
    .reports.where("matchTeamId")
    .equals(matchTeamId)
    .first();
  return row?.payload;
}

export async function pendingCount(): Promise<number> {
  return getDb().reports.where("synced").equals(0).count();
}

/** Push all queued reports to the server in one batch. */
export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const db = getDb();
  const pending = await db.reports.where("synced").equals(0).toArray();
  if (pending.length === 0) return { ok: 0, fail: 0 };
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports: pending.map((p) => p.payload) }),
    });
    if (!res.ok) return { ok: 0, fail: pending.length };
    await db.transaction("rw", db.reports, async () => {
      for (const p of pending) await db.reports.update(p.clientUuid, { synced: 1 });
    });
    return { ok: pending.length, fail: 0 };
  } catch {
    return { ok: 0, fail: pending.length };
  }
}
