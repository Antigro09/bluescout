import { prisma } from "@/lib/db";
import { estimateContribution, type ClimbLevelValue } from "@/config/rebuilt-2026";
import { computeEventMetrics } from "@/lib/metrics/compute";

function cell(v: unknown): string {
  if (v == null) return "";
  const str = typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

/** One row per match scouting report. */
export async function buildMatchCsv(eventId: string): Promise<string> {
  const reports = await prisma.matchScoutReport.findMany({
    where: { eventId },
    orderBy: [
      { match: { compLevel: "asc" } },
      { match: { matchNumber: "asc" } },
      { teamNumber: "asc" },
    ],
    select: {
      teamNumber: true,
      startPosition: true,
      noShow: true,
      autoLeave: true,
      autoFuel: true,
      autoClimbL1: true,
      teleopFuel: true,
      endgameClimb: true,
      climbFailed: true,
      defensePlayed: true,
      defenseRating: true,
      driverSkill: true,
      reliability: true,
      card: true,
      notes: true,
      source: true,
      scoutedAt: true,
      match: { select: { compLevel: true, matchNumber: true } },
      team: { select: { nickname: true } },
      scouter: { select: { name: true } },
    },
  });

  const headers = [
    "match", "team", "nickname", "scouter", "startPosition", "noShow",
    "autoLeave", "autoFuel", "autoClimbL1", "teleopFuel", "endgameClimb",
    "climbFailed", "defense", "defenseRating", "driverSkill", "reliability",
    "card", "estPoints", "source", "scoutedAt", "notes",
  ];
  const rows = reports.map((r) => [
    `${r.match.compLevel}${r.match.matchNumber}`,
    r.teamNumber,
    r.team.nickname ?? "",
    r.scouter?.name ?? "",
    r.startPosition ?? "",
    r.noShow,
    r.autoLeave,
    r.autoFuel,
    r.autoClimbL1,
    r.teleopFuel,
    r.endgameClimb,
    r.climbFailed,
    r.defensePlayed,
    r.defenseRating ?? "",
    r.driverSkill ?? "",
    r.reliability.join("|"),
    r.card,
    estimateContribution({
      autoFuel: r.autoFuel,
      teleopFuel: r.teleopFuel,
      autoClimbL1: r.autoClimbL1,
      endgameClimb: r.endgameClimb as ClimbLevelValue,
      climbFailed: r.climbFailed,
      noShow: r.noShow,
    }).total,
    r.source,
    r.scoutedAt.toISOString(),
    r.notes ?? "",
  ]);
  return toCsv(headers, rows);
}

/** One row per pit scouting report. */
export async function buildPitCsv(eventId: string): Promise<string> {
  const reports = await prisma.pitScoutReport.findMany({
    where: { eventId },
    orderBy: { teamNumber: "asc" },
    include: { team: { select: { nickname: true } }, _count: { select: { photos: true } } },
  });
  const headers = [
    "team", "nickname", "drivetrain", "weightLbs", "widthIn", "lengthIn",
    "heightIn", "motorCount", "scoringMechanism", "maxFuelCapacity",
    "climbLevels", "autoMaxFuel", "autoDescription", "language", "hasVision",
    "photos", "notes", "scoutedAt",
  ];
  const rows = reports.map((p) => [
    p.teamNumber,
    p.team.nickname ?? "",
    p.drivetrain ?? "",
    p.weightLbs ?? "",
    p.widthIn ?? "",
    p.lengthIn ?? "",
    p.heightIn ?? "",
    p.motorCount ?? "",
    p.scoringMechanism ?? "",
    p.maxFuelCapacity ?? "",
    p.climbLevels.join("|"),
    p.autoMaxFuel ?? "",
    p.autoDescription ?? "",
    p.language ?? "",
    p.hasVision,
    p._count.photos,
    p.notes ?? "",
    p.scoutedAt.toISOString(),
  ]);
  return toCsv(headers, rows);
}

/** One row per team: every metric + TBA + Statbotics + SoS + pit summary. */
export async function buildTeamsCsv(eventId: string): Promise<string> {
  const metrics = await computeEventMetrics(eventId);
  const pits = await prisma.pitScoutReport.findMany({
    where: { eventId },
    select: { teamNumber: true, drivetrain: true, weightLbs: true, climbLevels: true },
  });
  const pitByTeam = new Map(pits.map((p) => [p.teamNumber, p]));
  const noteRows = await prisma.superScoutNote.findMany({
    where: { eventId },
    select: { teamNumber: true },
  });
  const notesByTeam = new Map<number, number>();
  for (const x of noteRows)
    notesByTeam.set(x.teamNumber, (notesByTeam.get(x.teamNumber) ?? 0) + 1);

  const headers = [
    "team", "nickname", "composite", "efficiency", "reliability",
    "matchesScouted", "avgAutoFuel", "avgTeleopFuel", "avgPoints",
    "climbSuccessPct", "bestClimb", "defenseRatePct", "issueRatePct",
    "consistencyPct", "rank", "opr", "epaTotal", "epaAuto", "epaTeleop",
    "epaEndgame", "winratePct", "seasonEpa", "seasonWinratePct", "seasonMatches",
    "scheduleDeltaEpa", "sosPercentile", "pitDrivetrain", "pitWeightLbs",
    "pitClimbLevels", "notes",
  ];
  const pct = (v: number | null) => (v == null ? "" : Math.round(v * 100));
  const rows = metrics.map((m) => {
    const pit = pitByTeam.get(m.teamNumber);
    return [
      m.teamNumber,
      m.nickname ?? "",
      m.composite,
      m.efficiency,
      m.reliability,
      m.matchesScouted,
      m.avgAutoFuel,
      m.avgTeleopFuel,
      m.avgContribution,
      Math.round(m.climbSuccessRate * 100),
      m.bestClimb,
      Math.round(m.defenseRate * 100),
      Math.round(m.issueRate * 100),
      Math.round(m.consistency * 100),
      m.rank ?? "",
      m.opr != null ? Math.round(m.opr * 10) / 10 : "",
      m.epaTotal ?? "",
      m.epaAuto ?? "",
      m.epaTeleop ?? "",
      m.epaEndgame ?? "",
      pct(m.winrate),
      m.seasonEpa ?? "",
      pct(m.seasonWinrate),
      m.seasonMatches ?? "",
      m.scheduleDeltaEpa ?? "",
      m.sosPercentile ?? "",
      pit?.drivetrain ?? "",
      pit?.weightLbs ?? "",
      pit?.climbLevels.join("|") ?? "",
      notesByTeam.get(m.teamNumber) ?? 0,
    ];
  });
  return toCsv(headers, rows);
}
