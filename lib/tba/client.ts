import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  TBAEvent,
  TBAMatch,
  TBAOPRs,
  TBARankings,
  TBATeam,
} from "@/lib/tba/types";

export class TbaError extends Error {}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Fetch a TBA APIv3 path with ETag caching (TBA's recommended pattern).
 * Cached payloads + ETags are stored in the ApiCache table so repeated syncs
 * are cheap and respectful of TBA's servers.
 */
async function tbaFetch<T>(path: string): Promise<T> {
  const key = env.tbaAuthKey;
  if (!key) {
    throw new TbaError(
      "TBA_AUTH_KEY is not configured. Add it to your .env to sync from The Blue Alliance.",
    );
  }
  const cacheKey = `tba:${path}`;
  const cached = await prisma.apiCache.findUnique({ where: { cacheKey } });

  const headers: Record<string, string> = { "X-TBA-Auth-Key": key };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;

  const res = await fetch(`${env.tbaBaseUrl}${path}`, {
    headers,
    cache: "no-store",
  });

  if (res.status === 304 && cached) {
    return cached.payload as T;
  }
  if (!res.ok) {
    throw new TbaError(`TBA request failed: ${path} → HTTP ${res.status}`);
  }

  const data = (await res.json()) as T;
  const etag = res.headers.get("etag");
  await prisma.apiCache.upsert({
    where: { cacheKey },
    create: { source: "TBA", cacheKey, payload: asJson(data), etag },
    update: { payload: asJson(data), etag, fetchedAt: new Date() },
  });
  return data;
}

export const tba = {
  event: (key: string) => tbaFetch<TBAEvent>(`/event/${key}`),
  eventTeams: (key: string) => tbaFetch<TBATeam[]>(`/event/${key}/teams`),
  eventMatches: (key: string) => tbaFetch<TBAMatch[]>(`/event/${key}/matches`),
  eventRankings: (key: string) =>
    tbaFetch<TBARankings>(`/event/${key}/rankings`),
  eventOPRs: (key: string) => tbaFetch<TBAOPRs>(`/event/${key}/oprs`),
  eventsByYear: (year: number) => tbaFetch<TBAEvent[]>(`/events/${year}/simple`),
};

export function teamNumberFromKey(teamKey: string): number {
  return parseInt(teamKey.replace(/^frc/, ""), 10);
}
