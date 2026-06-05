import { prisma } from "@/lib/db";
import { ingestReports } from "@/lib/scouting/ingest";
import type { ReportInput } from "@/lib/scouting/schema";

// A portable, re-importable snapshot. Relationships use NATURAL keys (event key,
// match key, team number) rather than cuids, so a backup restores cleanly into a
// fresh database.
export const BACKUP_VERSION = 1;

export interface Backup {
  version: number;
  exportedAt: string;
  events: unknown[];
  teams: unknown[];
  eventTeams: unknown[];
  matches: unknown[];
  matchTeams: unknown[];
  matchReports: unknown[];
  pitReports: unknown[];
  superNotes: unknown[];
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Export everything in the database as a portable snapshot. */
export async function buildBackup(): Promise<Backup> {
  // Sequential (not Promise.all) — gentle on small/pooled Postgres during a
  // potentially large export.
  const events = await prisma.event.findMany();
  const teams = await prisma.team.findMany();
  const eventTeams = await prisma.eventTeam.findMany({
    include: { event: { select: { key: true } } },
  });
  const matches = await prisma.match.findMany({
    include: { event: { select: { key: true } } },
  });
  const matchTeams = await prisma.matchTeam.findMany({
    include: { match: { select: { key: true } } },
  });
  const matchReports = await prisma.matchScoutReport.findMany({
    include: {
      event: { select: { key: true } },
      match: { select: { key: true } },
      scouter: { select: { email: true } },
    },
  });
  const pitReports = await prisma.pitScoutReport.findMany({
    include: {
      event: { select: { key: true } },
      scouter: { select: { email: true } },
      photos: true,
    },
  });
  const superNotes = await prisma.superScoutNote.findMany({
    include: {
      event: { select: { key: true } },
      author: { select: { email: true } },
    },
  });

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    events: events.map((e) => ({
      key: e.key,
      name: e.name,
      shortName: e.shortName,
      year: e.year,
      weekNum: e.weekNum,
      city: e.city,
      stateProv: e.stateProv,
      country: e.country,
      startDate: iso(e.startDate),
      endDate: iso(e.endDate),
      isActive: e.isActive,
    })),
    teams: teams.map((t) => ({
      teamNumber: t.teamNumber,
      key: t.key,
      nickname: t.nickname,
      name: t.name,
      city: t.city,
      stateProv: t.stateProv,
      country: t.country,
      rookieYear: t.rookieYear,
      website: t.website,
    })),
    eventTeams: eventTeams.map((et) => {
      const { id, eventId, event, updatedAt, ...rest } = et;
      void id;
      void eventId;
      void updatedAt;
      return { ...rest, eventKey: event.key };
    }),
    matches: matches.map((m) => ({
      key: m.key,
      eventKey: m.event.key,
      compLevel: m.compLevel,
      setNumber: m.setNumber,
      matchNumber: m.matchNumber,
      scheduledTime: iso(m.scheduledTime),
      predictedTime: iso(m.predictedTime),
      actualTime: iso(m.actualTime),
      redScore: m.redScore,
      blueScore: m.blueScore,
      winningAlliance: m.winningAlliance,
      redBreakdown: m.redBreakdown,
      blueBreakdown: m.blueBreakdown,
      completed: m.completed,
    })),
    matchTeams: matchTeams.map((mt) => ({
      matchKey: mt.match.key,
      teamNumber: mt.teamNumber,
      alliance: mt.alliance,
      position: mt.position,
    })),
    matchReports: matchReports.map((r) => ({
      clientUuid: r.clientUuid,
      eventKey: r.event.key,
      matchKey: r.match.key,
      teamNumber: r.teamNumber,
      scouterEmail: r.scouter?.email ?? null,
      startPosition: r.startPosition,
      noShow: r.noShow,
      autoLeave: r.autoLeave,
      autoFuel: r.autoFuel,
      autoClimbL1: r.autoClimbL1,
      teleopFuel: r.teleopFuel,
      endgameClimb: r.endgameClimb,
      climbFailed: r.climbFailed,
      defensePlayed: r.defensePlayed,
      defenseRating: r.defenseRating,
      driverSkill: r.driverSkill,
      reliability: r.reliability,
      card: r.card,
      notes: r.notes,
      source: r.source,
      deviceId: r.deviceId,
      scoutedAt: iso(r.scoutedAt),
    })),
    pitReports: pitReports.map((p) => ({
      clientUuid: p.clientUuid,
      eventKey: p.event.key,
      teamNumber: p.teamNumber,
      scouterEmail: p.scouter?.email ?? null,
      drivetrain: p.drivetrain,
      weightLbs: p.weightLbs,
      widthIn: p.widthIn,
      lengthIn: p.lengthIn,
      heightIn: p.heightIn,
      motorCount: p.motorCount,
      scoringMechanism: p.scoringMechanism,
      maxFuelCapacity: p.maxFuelCapacity,
      climbLevels: p.climbLevels,
      autoDescription: p.autoDescription,
      autoMaxFuel: p.autoMaxFuel,
      language: p.language,
      hasVision: p.hasVision,
      notes: p.notes,
      scoutedAt: iso(p.scoutedAt),
      photos: p.photos.map((ph) => ({ url: ph.url, caption: ph.caption })),
    })),
    superNotes: superNotes.map((n) => ({
      clientUuid: n.clientUuid,
      eventKey: n.event.key,
      teamNumber: n.teamNumber,
      matchKey: n.matchKey,
      authorEmail: n.author?.email ?? null,
      content: n.content,
      aiSummary: n.aiSummary,
      tags: n.tags,
      scoutedAt: iso(n.scoutedAt),
    })),
  };
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

export interface RestoreResult {
  events: number;
  teams: number;
  eventTeams: number;
  matches: number;
  matchTeams: number;
  matchReports: { inserted: number; updated: number; skipped: number };
  pitReports: number;
  superNotes: number;
  warnings: string[];
}

type Row = Record<string, unknown>;
const s = (v: unknown): string | null => (v == null ? null : String(v));
const n = (v: unknown): number | null =>
  v == null || v === "" ? null : Number(v);
const b = (v: unknown): boolean => v === true;
const date = (v: unknown): Date | null => (v ? new Date(String(v)) : null);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/** Idempotently restore a backup, re-mapping relationships by natural keys. */
export async function restoreBackup(data: Backup): Promise<RestoreResult> {
  const warnings: string[] = [];
  const events = (data.events ?? []) as Row[];
  const teams = (data.teams ?? []) as Row[];
  const eventTeams = (data.eventTeams ?? []) as Row[];
  const matches = (data.matches ?? []) as Row[];
  const matchTeams = (data.matchTeams ?? []) as Row[];
  const matchReports = (data.matchReports ?? []) as Row[];
  const pitReports = (data.pitReports ?? []) as Row[];
  const superNotes = (data.superNotes ?? []) as Row[];

  // 1. Events (preserve isActive only on create — don't flip the current event).
  for (const e of events) {
    const key = s(e.key);
    if (!key) continue;
    const common = {
      name: s(e.name) ?? key,
      shortName: s(e.shortName),
      year: n(e.year) ?? new Date().getFullYear(),
      weekNum: n(e.weekNum),
      city: s(e.city),
      stateProv: s(e.stateProv),
      country: s(e.country),
      startDate: date(e.startDate),
      endDate: date(e.endDate),
    };
    await prisma.event.upsert({
      where: { key },
      create: { key, ...common, isActive: b(e.isActive) },
      update: common,
    });
  }

  // 2. Teams.
  for (const t of teams) {
    const teamNumber = n(t.teamNumber);
    if (teamNumber == null) continue;
    const data2 = {
      key: s(t.key) ?? `frc${teamNumber}`,
      nickname: s(t.nickname),
      name: s(t.name),
      city: s(t.city),
      stateProv: s(t.stateProv),
      country: s(t.country),
      rookieYear: n(t.rookieYear),
      website: s(t.website),
    };
    await prisma.team.upsert({
      where: { teamNumber },
      create: { teamNumber, ...data2 },
      update: data2,
    });
  }

  const eventIdByKey = new Map(
    (await prisma.event.findMany({ select: { id: true, key: true } })).map((e) => [
      e.key,
      e.id,
    ]),
  );

  // 3. EventTeam stats (TBA + Statbotics + SoS + season).
  const STAT_FIELDS = [
    "rank",
    "wins",
    "losses",
    "ties",
    "rankingScore",
    "opr",
    "dpr",
    "ccwm",
    "epaTotal",
    "epaAuto",
    "epaTeleop",
    "epaEndgame",
    "epaUnitless",
    "winrate",
    "seasonEpa",
    "seasonEpaAuto",
    "seasonEpaTeleop",
    "seasonEpaEndgame",
    "seasonWinrate",
    "seasonMatches",
    "scheduleDeltaEpa",
    "sosPercentile",
  ] as const;
  let eventTeamCount = 0;
  for (const et of eventTeams) {
    const eventId = eventIdByKey.get(String(et.eventKey));
    const teamNumber = n(et.teamNumber);
    if (!eventId || teamNumber == null) continue;
    const stats: Record<string, number | null> = {};
    for (const f of STAT_FIELDS) stats[f] = n(et[f]);
    await prisma.eventTeam.upsert({
      where: { eventId_teamNumber: { eventId, teamNumber } },
      create: { eventId, teamNumber, ...stats },
      update: stats,
    });
    eventTeamCount++;
  }

  // 4. Matches.
  for (const m of matches) {
    const key = s(m.key);
    const eventId = eventIdByKey.get(String(m.eventKey));
    const compLevel = s(m.compLevel);
    const matchNumber = n(m.matchNumber);
    if (!key || !eventId || !compLevel || matchNumber == null) continue;
    const md = {
      eventId,
      compLevel: compLevel as "QM" | "EF" | "QF" | "SF" | "F",
      setNumber: n(m.setNumber) ?? 1,
      matchNumber,
      scheduledTime: date(m.scheduledTime),
      predictedTime: date(m.predictedTime),
      actualTime: date(m.actualTime),
      redScore: n(m.redScore),
      blueScore: n(m.blueScore),
      winningAlliance: s(m.winningAlliance),
      completed: b(m.completed),
    };
    await prisma.match.upsert({
      where: { key },
      create: { key, ...md },
      update: md,
    });
  }

  const matchIdByKey = new Map(
    (await prisma.match.findMany({ select: { id: true, key: true } })).map((m) => [
      m.key,
      m.id,
    ]),
  );

  // 5. MatchTeams.
  let matchTeamCount = 0;
  for (const mt of matchTeams) {
    const matchId = matchIdByKey.get(String(mt.matchKey));
    const teamNumber = n(mt.teamNumber);
    const alliance = s(mt.alliance);
    const position = n(mt.position);
    if (!matchId || teamNumber == null || !alliance || position == null) continue;
    await prisma.matchTeam.upsert({
      where: { matchId_teamNumber: { matchId, teamNumber } },
      create: {
        matchId,
        teamNumber,
        alliance: alliance as "RED" | "BLUE",
        position,
      },
      update: { alliance: alliance as "RED" | "BLUE", position },
    });
    matchTeamCount++;
  }

  const matchTeamIdByKey = new Map(
    (
      await prisma.matchTeam.findMany({
        select: { id: true, teamNumber: true, match: { select: { key: true } } },
      })
    ).map((mt) => [`${mt.match.key}|${mt.teamNumber}`, mt.id]),
  );
  const userIdByEmail = new Map(
    (await prisma.user.findMany({ select: { id: true, email: true } })).map((u) => [
      u.email,
      u.id,
    ]),
  );

  // 6. Match reports — reuse the validated ingest pipeline.
  const reportPayloads: unknown[] = [];
  for (const r of matchReports) {
    const eventId = eventIdByKey.get(String(r.eventKey));
    const matchId = matchIdByKey.get(String(r.matchKey));
    const matchTeamId = matchTeamIdByKey.get(`${r.matchKey}|${n(r.teamNumber)}`);
    if (!eventId || !matchId || !matchTeamId) continue;
    const scouterId = r.scouterEmail
      ? userIdByEmail.get(String(r.scouterEmail))
      : undefined;
    reportPayloads.push({
      clientUuid: s(r.clientUuid),
      matchTeamId,
      matchId,
      eventId,
      teamNumber: n(r.teamNumber),
      ...(scouterId ? { scouterId } : {}),
      startPosition: r.startPosition ?? null,
      noShow: b(r.noShow),
      autoLeave: b(r.autoLeave),
      autoFuel: n(r.autoFuel) ?? 0,
      autoClimbL1: b(r.autoClimbL1),
      teleopFuel: n(r.teleopFuel) ?? 0,
      endgameClimb: r.endgameClimb ?? "NONE",
      climbFailed: b(r.climbFailed),
      defensePlayed: r.defensePlayed ?? "NONE",
      defenseRating: n(r.defenseRating),
      driverSkill: n(r.driverSkill),
      reliability: arr(r.reliability),
      card: r.card ?? "NONE",
      notes: s(r.notes),
      scoutedAt: s(r.scoutedAt) ?? undefined,
      deviceId: s(r.deviceId) ?? undefined,
    });
  }
  const reportResult = await ingestReports(
    reportPayloads as ReportInput[],
    "sync",
  );

  // 7. Pit reports + photos (identity = event+team).
  let pitCount = 0;
  for (const p of pitReports) {
    const eventId = eventIdByKey.get(String(p.eventKey));
    const teamNumber = n(p.teamNumber);
    if (!eventId || teamNumber == null) continue;
    const scouterId = p.scouterEmail
      ? userIdByEmail.get(String(p.scouterEmail))
      : null;
    const fields = {
      drivetrain: (s(p.drivetrain) as
        | "SWERVE"
        | "TANK"
        | "MECANUM"
        | "OTHER"
        | null) ?? null,
      weightLbs: n(p.weightLbs),
      widthIn: n(p.widthIn),
      lengthIn: n(p.lengthIn),
      heightIn: n(p.heightIn),
      motorCount: n(p.motorCount),
      scoringMechanism: s(p.scoringMechanism),
      maxFuelCapacity: n(p.maxFuelCapacity),
      climbLevels: arr(p.climbLevels) as ("L1" | "L2" | "L3")[],
      autoDescription: s(p.autoDescription),
      autoMaxFuel: n(p.autoMaxFuel),
      language: s(p.language),
      hasVision: b(p.hasVision),
      notes: s(p.notes),
      scouterId,
    };
    const pit = await prisma.pitScoutReport.upsert({
      where: { eventId_teamNumber: { eventId, teamNumber } },
      create: { clientUuid: s(p.clientUuid) ?? crypto.randomUUID(), eventId, teamNumber, ...fields },
      update: fields,
    });
    const photos = (Array.isArray(p.photos) ? p.photos : []) as Row[];
    await prisma.robotPhoto.deleteMany({ where: { pitReportId: pit.id } });
    for (const ph of photos) {
      const url = s(ph.url);
      if (url) await prisma.robotPhoto.create({ data: { pitReportId: pit.id, url, caption: s(ph.caption) } });
    }
    pitCount++;
  }

  // 8. Super-scout notes.
  let noteCount = 0;
  for (const note of superNotes) {
    const clientUuid = s(note.clientUuid);
    const eventId = eventIdByKey.get(String(note.eventKey));
    const teamNumber = n(note.teamNumber);
    if (!clientUuid || !eventId || teamNumber == null) continue;
    const authorId = note.authorEmail
      ? userIdByEmail.get(String(note.authorEmail)) ?? null
      : null;
    const fields = {
      eventId,
      teamNumber,
      matchKey: s(note.matchKey),
      authorId,
      content: s(note.content) ?? "",
      aiSummary: s(note.aiSummary),
      tags: arr(note.tags),
      scoutedAt: date(note.scoutedAt) ?? new Date(),
    };
    await prisma.superScoutNote.upsert({
      where: { clientUuid },
      create: { clientUuid, ...fields },
      update: fields,
    });
    noteCount++;
  }

  return {
    events: events.length,
    teams: teams.length,
    eventTeams: eventTeamCount,
    matches: matches.length,
    matchTeams: matchTeamCount,
    matchReports: {
      inserted: reportResult.inserted,
      updated: reportResult.updated,
      skipped: reportResult.skipped,
    },
    pitReports: pitCount,
    superNotes: noteCount,
    warnings,
  };
}
