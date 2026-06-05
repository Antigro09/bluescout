// Demo seed: convenience users + realistic match reports for the active event.
//   npm run db:seed
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { Prisma } from "@/lib/generated/prisma/client";

const rnd = (n: number) => Math.random() * n;
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function ensureUser(
  email: string,
  name: string,
  role: "ADMIN" | "SCOUTER",
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role,
      approved: true,
    },
  });
}

async function main() {
  const admin = await ensureUser("lead@1086.test", "Lead Cheese", "ADMIN", "bluecheese");
  const scouterNames = ["Avery", "Blake", "Casey", "Devon", "Emerson", "Finley"];
  const scouters = [];
  for (const name of scouterNames) {
    scouters.push(
      await ensureUser(`${name.toLowerCase()}@1086.test`, name, "SCOUTER", "scout1086"),
    );
  }
  console.log(`Users ready: ${admin.email} + ${scouters.length} scouters.`);

  const event = await prisma.event.findFirst({ where: { isActive: true } });
  if (!event) {
    console.log(
      "No active event. Sync + activate one (npm run sync <key> --active), then re-run seed for demo match data.",
    );
    await prisma.$disconnect();
    return;
  }

  const ets = await prisma.eventTeam.findMany({
    where: { eventId: event.id },
    select: { teamNumber: true, epaAuto: true, epaTeleop: true, epaEndgame: true },
  });
  const epa = new Map(ets.map((e) => [e.teamNumber, e]));

  const matches = await prisma.match.findMany({
    where: { eventId: event.id, compLevel: "QM" },
    orderBy: { matchNumber: "asc" },
    take: 40,
    select: { id: true, teams: { select: { id: true, teamNumber: true } } },
  });

  await prisma.matchScoutReport.deleteMany({
    where: { eventId: event.id, source: "seed" },
  });

  const START = ["LEFT", "CENTER", "RIGHT"] as const;
  const DEF = ["NONE", "NONE", "NONE", "SOME", "HEAVY"] as const;
  const ISSUES = ["BROWNOUT", "DISABLED", "TIPPED"] as const;

  const data: Prisma.MatchScoutReportCreateManyInput[] = [];
  let si = 0;
  for (const m of matches) {
    for (const mt of m.teams) {
      const e = epa.get(mt.teamNumber);
      const autoFuel = Math.max(0, Math.round((e?.epaAuto ?? 4) * 0.9 + rnd(4) - 2));
      const teleopFuel = Math.max(0, Math.round((e?.epaTeleop ?? 8) + rnd(8) - 4));
      const climbRoll = (e?.epaEndgame ?? 5) + rnd(20) - 5;
      const endgameClimb =
        climbRoll > 22 ? "L3" : climbRoll > 14 ? "L2" : climbRoll > 7 ? "L1" : "NONE";
      const noShow = Math.random() < 0.03;
      data.push({
        clientUuid: `seed-${mt.id}`,
        eventId: event.id,
        matchId: m.id,
        matchTeamId: mt.id,
        teamNumber: mt.teamNumber,
        scouterId: scouters[si++ % scouters.length].id,
        startPosition: pick(START),
        noShow,
        autoLeave: Math.random() < 0.9,
        autoFuel: noShow ? 0 : autoFuel,
        autoClimbL1: Math.random() < 0.05,
        teleopFuel: noShow ? 0 : teleopFuel,
        endgameClimb: noShow ? "NONE" : endgameClimb,
        climbFailed: Math.random() < 0.08,
        defensePlayed: pick(DEF),
        defenseRating: Math.random() < 0.3 ? Math.ceil(rnd(5)) : null,
        driverSkill: Math.ceil(rnd(5)),
        reliability: Math.random() < 0.1 ? [pick(ISSUES)] : [],
        source: "seed",
        scoutedAt: new Date(),
      });
    }
  }
  await prisma.matchScoutReport.createMany({ data, skipDuplicates: true });
  console.log(`Seeded ${data.length} match reports for ${event.key}.`);

  const DRIVE = ["SWERVE", "TANK"] as const;
  for (const t of ets.slice(0, 8)) {
    await prisma.pitScoutReport.upsert({
      where: { eventId_teamNumber: { eventId: event.id, teamNumber: t.teamNumber } },
      create: {
        clientUuid: randomUUID(),
        eventId: event.id,
        teamNumber: t.teamNumber,
        scouterId: admin.id,
        drivetrain: pick(DRIVE),
        weightLbs: 100 + Math.round(rnd(25)),
        climbLevels: ["L1", "L2"],
        hasVision: Math.random() < 0.5,
        scoringMechanism: "Flywheel fuel shooter",
      },
      update: {},
    });
  }
  console.log("Seeded pit reports.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
