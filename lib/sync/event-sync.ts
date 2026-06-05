import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { tba, teamNumberFromKey } from "@/lib/tba/client";
import {
  statbotics,
  extractEpa,
  extractSeasonEpa,
} from "@/lib/statbotics/client";
import type { CompLevel } from "@/lib/generated/prisma/enums";
import { avg, stdDev } from "@/lib/utils";

const COMP: Record<string, CompLevel> = {
  qm: "QM",
  ef: "EF",
  qf: "QF",
  sf: "SF",
  f: "F",
};

/** Run async work over items with a bounded concurrency. */
async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      await fn(items[i++]);
    }
  });
  await Promise.all(workers);
}

/** Standard normal CDF (Abramowitz–Stegun approximation). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function dateOrNull(value?: string | null): Date | null {
  return value ? new Date(value) : null;
}

function secsToDate(value?: number | null): Date | null {
  return value ? new Date(value * 1000) : null;
}

export interface SyncResult {
  event: string;
  teams: number;
  matches: number;
  warnings: string[];
}

/** Pull an event's teams, schedule, results, rankings, OPRs, and EPA into the DB. */
export async function syncEvent(eventKey: string): Promise<SyncResult> {
  const warnings: string[] = [];

  const [evt, teams, matches] = await Promise.all([
    tba.event(eventKey),
    tba.eventTeams(eventKey),
    tba.eventMatches(eventKey),
  ]);

  const eventData = {
    name: evt.name,
    shortName: evt.short_name ?? null,
    year: evt.year,
    weekNum: evt.week ?? null,
    city: evt.city ?? null,
    stateProv: evt.state_prov ?? null,
    country: evt.country ?? null,
    startDate: dateOrNull(evt.start_date),
    endDate: dateOrNull(evt.end_date),
  };
  const event = await prisma.event.upsert({
    where: { key: eventKey },
    create: { key: eventKey, ...eventData },
    update: eventData,
  });

  // Every team referenced by the event teams list or the schedule.
  const teamInfo = new Map(teams.map((t) => [t.team_number, t]));
  const allTeamNumbers = new Set<number>(teamInfo.keys());
  for (const m of matches) {
    for (const k of [...m.alliances.red.team_keys, ...m.alliances.blue.team_keys]) {
      allTeamNumbers.add(teamNumberFromKey(k));
    }
  }

  for (const num of allTeamNumbers) {
    const t = teamInfo.get(num);
    const data = {
      nickname: t?.nickname ?? null,
      name: t?.name ?? null,
      city: t?.city ?? null,
      stateProv: t?.state_prov ?? null,
      country: t?.country ?? null,
      rookieYear: t?.rookie_year ?? null,
      website: t?.website ?? null,
    };
    await prisma.team.upsert({
      where: { teamNumber: num },
      create: { teamNumber: num, key: `frc${num}`, ...(t ? data : {}) },
      update: t ? data : {},
    });
  }

  // Attendance rows for the official event team list.
  for (const t of teams) {
    await prisma.eventTeam.upsert({
      where: {
        eventId_teamNumber: { eventId: event.id, teamNumber: t.team_number },
      },
      create: { eventId: event.id, teamNumber: t.team_number },
      update: {},
    });
  }

  // Matches + alliance memberships.
  for (const m of matches) {
    const comp = COMP[m.comp_level];
    if (!comp) continue;
    const redScore = m.alliances.red.score;
    const blueScore = m.alliances.blue.score;
    const done =
      redScore != null && redScore >= 0 && blueScore != null && blueScore >= 0;
    const matchData = {
      eventId: event.id,
      compLevel: comp,
      setNumber: m.set_number,
      matchNumber: m.match_number,
      scheduledTime: secsToDate(m.time),
      predictedTime: secsToDate(m.predicted_time),
      actualTime: secsToDate(m.actual_time),
      redScore: done ? redScore : null,
      blueScore: done ? blueScore : null,
      winningAlliance: m.winning_alliance ?? null,
      redBreakdown: jsonOrNull(m.score_breakdown?.red),
      blueBreakdown: jsonOrNull(m.score_breakdown?.blue),
      completed: done,
    };
    const match = await prisma.match.upsert({
      where: { key: m.key },
      create: { key: m.key, ...matchData },
      update: matchData,
    });

    const entries = [
      ...m.alliances.red.team_keys.map((k, i) => ({
        k,
        alliance: "RED" as const,
        pos: i + 1,
      })),
      ...m.alliances.blue.team_keys.map((k, i) => ({
        k,
        alliance: "BLUE" as const,
        pos: i + 1,
      })),
    ];
    for (const e of entries) {
      const num = teamNumberFromKey(e.k);
      await prisma.matchTeam.upsert({
        where: { matchId_teamNumber: { matchId: match.id, teamNumber: num } },
        create: {
          matchId: match.id,
          teamNumber: num,
          alliance: e.alliance,
          position: e.pos,
        },
        update: { alliance: e.alliance, position: e.pos },
      });
    }
  }

  await syncRankings(event.id, eventKey, warnings);
  await syncOprs(event.id, eventKey, warnings);
  await syncEpa(event.id, eventKey, warnings);
  await syncSeasonEpa(
    event.id,
    evt.year,
    teams.map((t) => t.team_number),
    warnings,
  );
  await syncSos(event.id, warnings);

  return {
    event: eventKey,
    teams: teams.length,
    matches: matches.length,
    warnings,
  };
}

interface EventTeamStats {
  rank?: number | null;
  wins?: number | null;
  losses?: number | null;
  ties?: number | null;
  rankingScore?: number | null;
  opr?: number | null;
  dpr?: number | null;
  ccwm?: number | null;
  epaTotal?: number | null;
  epaAuto?: number | null;
  epaTeleop?: number | null;
  epaEndgame?: number | null;
  epaUnitless?: number | null;
  winrate?: number | null;
  seasonEpa?: number | null;
  seasonEpaAuto?: number | null;
  seasonEpaTeleop?: number | null;
  seasonEpaEndgame?: number | null;
  seasonWinrate?: number | null;
  seasonMatches?: number | null;
  scheduleDeltaEpa?: number | null;
  sosPercentile?: number | null;
}

async function ensureEventTeam(
  eventId: string,
  teamNumber: number,
  data: EventTeamStats,
): Promise<void> {
  await prisma.team.upsert({
    where: { teamNumber },
    create: { teamNumber, key: `frc${teamNumber}` },
    update: {},
  });
  await prisma.eventTeam.upsert({
    where: { eventId_teamNumber: { eventId, teamNumber } },
    create: { event: { connect: { id: eventId } }, team: { connect: { teamNumber } }, ...data },
    update: data,
  });
}

async function syncRankings(
  eventId: string,
  eventKey: string,
  warnings: string[],
): Promise<void> {
  try {
    const { rankings } = await tba.eventRankings(eventKey);
    if (!rankings) return;
    for (const r of rankings) {
      await ensureEventTeam(eventId, teamNumberFromKey(r.team_key), {
        rank: r.rank,
        wins: r.record?.wins ?? null,
        losses: r.record?.losses ?? null,
        ties: r.record?.ties ?? null,
        rankingScore: r.sort_orders?.[0] ?? null,
      });
    }
  } catch (e) {
    warnings.push(`Rankings: ${(e as Error).message}`);
  }
}

async function syncOprs(
  eventId: string,
  eventKey: string,
  warnings: string[],
): Promise<void> {
  try {
    const { oprs, dprs, ccwms } = await tba.eventOPRs(eventKey);
    if (!oprs) return;
    for (const teamKey of Object.keys(oprs)) {
      const num = teamNumberFromKey(teamKey);
      await ensureEventTeam(eventId, num, {
        opr: oprs[teamKey] ?? null,
        dpr: dprs?.[teamKey] ?? null,
        ccwm: ccwms?.[teamKey] ?? null,
      });
    }
  } catch (e) {
    warnings.push(`OPRs: ${(e as Error).message}`);
  }
}

async function syncEpa(
  eventId: string,
  eventKey: string,
  warnings: string[],
): Promise<void> {
  try {
    const rows = await statbotics.teamEvents(eventKey);
    for (const te of rows) {
      await ensureEventTeam(eventId, te.team, extractEpa(te));
    }
  } catch (e) {
    warnings.push(`Statbotics EPA: ${(e as Error).message}`);
  }
}

/** Season-cumulative EPA/record (incorporates each team's earlier events). */
async function syncSeasonEpa(
  eventId: string,
  year: number,
  teamNumbers: number[],
  warnings: string[],
): Promise<void> {
  let failures = 0;
  await mapPool(teamNumbers, 6, async (num) => {
    try {
      const ty = await statbotics.teamYear(num, year);
      await ensureEventTeam(eventId, num, extractSeasonEpa(ty));
    } catch {
      failures++;
    }
  });
  if (failures) warnings.push(`Season EPA: ${failures} team(s) unavailable`);
}

/**
 * Strength of schedule. For each team, using event EPAs:
 *   ΔEPA = μ + 2·(avg partner EPA) − 3·(avg opponent EPA)
 * (the schedule tailwind/headwind for an average team). The percentile is the
 * normal CDF of −ΔEPA / (√0.5·σ/√n), where σ is the field EPA spread and n the
 * team's match count. Following Statbotics, a HIGHER percentile = HARDER schedule
 * (Δ stays the raw tailwind: positive Δ = easier path / possibly inflated stats).
 */
async function syncSos(eventId: string, warnings: string[]): Promise<void> {
  try {
    const ets = await prisma.eventTeam.findMany({
      where: { eventId },
      select: { teamNumber: true, epaTotal: true },
    });
    const epaByTeam = new Map<number, number>();
    for (const e of ets) if (e.epaTotal != null) epaByTeam.set(e.teamNumber, e.epaTotal);
    if (epaByTeam.size < 4) return;
    const mu = avg([...epaByTeam.values()]);
    const sigma = stdDev([...epaByTeam.values()]);
    if (sigma === 0) return;

    const matches = await prisma.match.findMany({
      where: { eventId, compLevel: "QM" },
      select: { teams: { select: { teamNumber: true, alliance: true } } },
    });

    const acc = new Map<
      number,
      { partners: number[]; opponents: number[]; n: number }
    >();
    for (const m of matches) {
      const red = m.teams.filter((x) => x.alliance === "RED").map((x) => x.teamNumber);
      const blue = m.teams.filter((x) => x.alliance === "BLUE").map((x) => x.teamNumber);
      for (const [own, opp] of [
        [red, blue],
        [blue, red],
      ] as const) {
        for (const t of own) {
          const a =
            acc.get(t) ?? { partners: [] as number[], opponents: [] as number[], n: 0 };
          for (const p of own)
            if (p !== t && epaByTeam.has(p)) a.partners.push(epaByTeam.get(p)!);
          for (const o of opp) if (epaByTeam.has(o)) a.opponents.push(epaByTeam.get(o)!);
          a.n += 1;
          acc.set(t, a);
        }
      }
    }

    for (const [team, a] of acc) {
      if (a.n === 0) continue;
      const pbar = a.partners.length ? avg(a.partners) : mu;
      const obar = a.opponents.length ? avg(a.opponents) : mu;
      const deltaEpa = mu + 2 * pbar - 3 * obar;
      const sosStd = (Math.sqrt(0.5) * sigma) / Math.sqrt(a.n);
      // Statbotics convention: higher percentile = harder schedule.
      const pct = sosStd > 0 ? normalCdf(-deltaEpa / sosStd) * 100 : 50;
      await ensureEventTeam(eventId, team, {
        scheduleDeltaEpa: round1(deltaEpa),
        sosPercentile: Math.round(pct),
      });
    }
  } catch (e) {
    warnings.push(`SoS: ${(e as Error).message}`);
  }
}
