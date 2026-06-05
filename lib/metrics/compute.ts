import { prisma } from "@/lib/db";
import { estimateContribution, type ClimbLevelValue } from "@/config/rebuilt-2026";
import { avg, clamp, stdDev } from "@/lib/utils";

export interface TeamMetrics {
  teamNumber: number;
  nickname: string | null;
  // scouting-derived
  matchesScouted: number;
  avgAutoFuel: number;
  avgTeleopFuel: number;
  avgContribution: number;
  climbSuccessRate: number; // 0..1
  bestClimb: ClimbLevelValue;
  defenseRate: number; // 0..1
  issueRate: number; // 0..1
  consistency: number; // 0..1
  // external
  rank: number | null;
  opr: number | null;
  epaTotal: number | null;
  epaAuto: number | null;
  epaTeleop: number | null;
  epaEndgame: number | null;
  winrate: number | null;
  // season-cumulative (all the team's events this year) + schedule
  seasonEpa: number | null;
  seasonWinrate: number | null;
  seasonMatches: number | null;
  scheduleDeltaEpa: number | null; // schedule tailwind(+)/headwind(−), points
  sosPercentile: number | null; // 0..100; higher = harder schedule (Statbotics)
  // composite (0..100)
  efficiency: number;
  reliability: number;
  composite: number;
}

const CLIMB_ORDER: Record<string, number> = { NONE: 0, L1: 1, L2: 2, L3: 3 };
const CLIMB_NAME: ClimbLevelValue[] = ["NONE", "L1", "L2", "L3"];

/** Build a min-max normalizer over the finite values in `values`. */
function normalizer(values: number[]): (v: number) => number {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return () => 0.5;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return (v: number) =>
    !Number.isFinite(v) || max === min ? 0.5 : (v - min) / (max - min);
}

interface ScoutAgg {
  matchesScouted: number;
  avgAutoFuel: number;
  avgTeleopFuel: number;
  avgContribution: number;
  climbSuccessRate: number;
  bestClimb: ClimbLevelValue;
  defenseRate: number;
  issueRate: number;
  consistency: number;
}

interface RawReport {
  autoFuel: number;
  teleopFuel: number;
  autoClimbL1: boolean;
  endgameClimb: string;
  climbFailed: boolean;
  defensePlayed: string;
  reliability: string[];
  noShow: boolean;
  card: string;
}

function aggregateScouting(reports: RawReport[]): ScoutAgg {
  const n = reports.length;
  if (n === 0) {
    return {
      matchesScouted: 0,
      avgAutoFuel: 0,
      avgTeleopFuel: 0,
      avgContribution: 0,
      climbSuccessRate: 0,
      bestClimb: "NONE",
      defenseRate: 0,
      issueRate: 0,
      consistency: 0.5,
    };
  }
  const contributions = reports.map(
    (r) =>
      estimateContribution({
        autoFuel: r.autoFuel,
        teleopFuel: r.teleopFuel,
        autoClimbL1: r.autoClimbL1,
        endgameClimb: r.endgameClimb as ClimbLevelValue,
        climbFailed: r.climbFailed,
        noShow: r.noShow,
      }).total,
  );
  const mean = avg(contributions);
  const cv = mean > 0 ? stdDev(contributions) / mean : 0;
  let best = 0;
  let climbs = 0;
  let defense = 0;
  let issues = 0;
  for (const r of reports) {
    const lvl = CLIMB_ORDER[r.endgameClimb] ?? 0;
    if (lvl > best) best = lvl;
    if (lvl > 0 && !r.climbFailed) climbs++;
    if (r.defensePlayed !== "NONE") defense++;
    if (r.reliability.length > 0 || r.noShow || r.card !== "NONE") issues++;
  }
  return {
    matchesScouted: n,
    avgAutoFuel: avg(reports.map((r) => r.autoFuel)),
    avgTeleopFuel: avg(reports.map((r) => r.teleopFuel)),
    avgContribution: mean,
    climbSuccessRate: climbs / n,
    bestClimb: CLIMB_NAME[best],
    defenseRate: defense / n,
    issueRate: issues / n,
    consistency: clamp(1 - cv, 0, 1),
  };
}

/** Compute blended efficiency/reliability/composite metrics for an event. */
export async function computeEventMetrics(
  eventId: string,
): Promise<TeamMetrics[]> {
  const [eventTeams, reports] = await Promise.all([
    prisma.eventTeam.findMany({
      where: { eventId },
      select: {
        teamNumber: true,
        rank: true,
        opr: true,
        epaTotal: true,
        epaAuto: true,
        epaTeleop: true,
        epaEndgame: true,
        winrate: true,
        seasonEpa: true,
        seasonWinrate: true,
        seasonMatches: true,
        scheduleDeltaEpa: true,
        sosPercentile: true,
        team: { select: { nickname: true } },
      },
    }),
    prisma.matchScoutReport.findMany({
      where: { eventId },
      select: {
        teamNumber: true,
        autoFuel: true,
        teleopFuel: true,
        autoClimbL1: true,
        endgameClimb: true,
        climbFailed: true,
        defensePlayed: true,
        reliability: true,
        noShow: true,
        card: true,
      },
    }),
  ]);

  const byTeam = new Map<number, RawReport[]>();
  for (const r of reports) {
    const arr = byTeam.get(r.teamNumber);
    if (arr) arr.push(r);
    else byTeam.set(r.teamNumber, [r]);
  }

  // First pass: per-team aggregates.
  const rows = eventTeams.map((et) => {
    const agg = aggregateScouting(byTeam.get(et.teamNumber) ?? []);
    return { et, agg };
  });

  // Normalizers across the field.
  const normContribution = normalizer(
    rows.filter((r) => r.agg.matchesScouted > 0).map((r) => r.agg.avgContribution),
  );
  const normEpa = normalizer(
    rows.map((r) => r.et.epaTotal ?? NaN),
  );

  const metrics: TeamMetrics[] = rows.map(({ et, agg }) => {
    const scouted = agg.matchesScouted > 0;
    const nEpa = et.epaTotal != null ? normEpa(et.epaTotal) : 0.5;
    const nContribution = scouted ? normContribution(agg.avgContribution) : nEpa;
    const efficiency = scouted
      ? (0.6 * nContribution + 0.4 * nEpa) * 100
      : nEpa * 100;

    const confidence = clamp(agg.matchesScouted / 6, 0, 1);
    const reliability = scouted
      ? (0.35 * agg.consistency +
          0.3 * agg.climbSuccessRate +
          0.2 * (1 - agg.issueRate) +
          0.15 * confidence) *
        100
      : // No scouting: lean on the more stable season win rate (bigger sample).
        ((et.seasonWinrate ?? et.winrate) ?? 0.5) * 70;

    const composite = 0.6 * efficiency + 0.4 * reliability;

    return {
      teamNumber: et.teamNumber,
      nickname: et.team.nickname,
      matchesScouted: agg.matchesScouted,
      avgAutoFuel: round(agg.avgAutoFuel, 1),
      avgTeleopFuel: round(agg.avgTeleopFuel, 1),
      avgContribution: round(agg.avgContribution, 1),
      climbSuccessRate: agg.climbSuccessRate,
      bestClimb: agg.bestClimb,
      defenseRate: agg.defenseRate,
      issueRate: agg.issueRate,
      consistency: agg.consistency,
      rank: et.rank,
      opr: et.opr,
      epaTotal: et.epaTotal,
      epaAuto: et.epaAuto,
      epaTeleop: et.epaTeleop,
      epaEndgame: et.epaEndgame,
      winrate: et.winrate,
      seasonEpa: et.seasonEpa,
      seasonWinrate: et.seasonWinrate,
      seasonMatches: et.seasonMatches,
      scheduleDeltaEpa: et.scheduleDeltaEpa,
      sosPercentile: et.sosPercentile,
      efficiency: Math.round(efficiency),
      reliability: Math.round(reliability),
      composite: Math.round(composite),
    };
  });

  metrics.sort((a, b) => b.composite - a.composite);
  return metrics;
}

function round(v: number, d: number): number {
  const m = 10 ** d;
  return Math.round(v * m) / m;
}
