import { prisma } from "@/lib/db";
import { estimateContribution, type ClimbLevelValue } from "@/config/rebuilt-2026";

export interface ScoutAccuracyRow {
  scouterId: string;
  name: string;
  reports: number;
  comparedAlliances: number;
  avgErrorPct: number | null;
  quality: "Excellent" | "Good" | "Fair" | "Review" | "—";
}

function qualityOf(err: number | null): ScoutAccuracyRow["quality"] {
  if (err == null) return "—";
  if (err < 0.15) return "Excellent";
  if (err < 0.3) return "Good";
  if (err < 0.5) return "Fair";
  return "Review";
}

/**
 * Estimate scouting accuracy by comparing each fully-scouted alliance's summed
 * point contribution against the actual alliance score from TBA. Lower average
 * error is better. A proxy — actual scores include fouls — but a useful signal.
 */
export async function computeScoutAccuracy(
  eventId: string,
): Promise<ScoutAccuracyRow[]> {
  const [matches, reports] = await Promise.all([
    prisma.match.findMany({
      where: {
        eventId,
        completed: true,
        redScore: { not: null },
        blueScore: { not: null },
      },
      select: {
        redScore: true,
        blueScore: true,
        teams: { select: { id: true, alliance: true } },
      },
    }),
    prisma.matchScoutReport.findMany({
      where: { eventId, scouterId: { not: null } },
      select: {
        matchTeamId: true,
        scouterId: true,
        autoFuel: true,
        teleopFuel: true,
        autoClimbL1: true,
        endgameClimb: true,
        climbFailed: true,
        noShow: true,
      },
    }),
  ]);

  const byMatchTeam = new Map(reports.map((r) => [r.matchTeamId, r]));
  const acc = new Map<string, { reports: number; errSum: number; errCount: number }>();
  const bump = (id: string) =>
    acc.get(id) ?? { reports: 0, errSum: 0, errCount: 0 };

  for (const r of reports) {
    if (!r.scouterId) continue;
    const e = bump(r.scouterId);
    e.reports += 1;
    acc.set(r.scouterId, e);
  }

  for (const m of matches) {
    for (const alliance of ["RED", "BLUE"] as const) {
      const score = alliance === "RED" ? m.redScore : m.blueScore;
      if (!score || score <= 0) continue;
      const robots = m.teams.filter((t) => t.alliance === alliance);
      const scouted = robots
        .map((rt) => byMatchTeam.get(rt.id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
      if (scouted.length < robots.length) continue;

      const predicted = scouted.reduce(
        (a, r) =>
          a +
          estimateContribution({
            autoFuel: r.autoFuel,
            teleopFuel: r.teleopFuel,
            autoClimbL1: r.autoClimbL1,
            endgameClimb: r.endgameClimb as ClimbLevelValue,
            climbFailed: r.climbFailed,
            noShow: r.noShow,
          }).total,
        0,
      );
      const errPct = Math.abs(predicted - score) / score;
      for (const r of scouted) {
        if (!r.scouterId) continue;
        const e = bump(r.scouterId);
        e.errSum += errPct;
        e.errCount += 1;
        acc.set(r.scouterId, e);
      }
    }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...acc.keys()] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return [...acc.entries()]
    .map(([id, e]) => {
      const avg = e.errCount > 0 ? e.errSum / e.errCount : null;
      return {
        scouterId: id,
        name: nameById.get(id) ?? "Unknown",
        reports: e.reports,
        comparedAlliances: e.errCount,
        avgErrorPct: avg == null ? null : Math.round(avg * 100),
        quality: qualityOf(avg),
      };
    })
    .sort((a, b) => (a.avgErrorPct ?? 999) - (b.avgErrorPct ?? 999));
}
