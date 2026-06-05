import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";

/** Assignment context for the current scouter, used to warm the offline cache. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const event = await getActiveEvent();
  if (!event) return NextResponse.json({ eventKey: null, assignments: [] });

  const rows = await prisma.scoutAssignment.findMany({
    where: { scouterId: user.id, eventId: event.id },
    select: {
      status: true,
      matchTeam: {
        select: {
          id: true,
          teamNumber: true,
          alliance: true,
          position: true,
          matchId: true,
          team: { select: { nickname: true } },
          match: { select: { matchNumber: true, compLevel: true } },
        },
      },
    },
  });

  const assignments = rows.map((r) => ({
    matchTeamId: r.matchTeam.id,
    eventId: event.id,
    eventKey: event.key,
    matchId: r.matchTeam.matchId,
    matchNumber: r.matchTeam.match.matchNumber,
    compLevel: r.matchTeam.match.compLevel,
    teamNumber: r.matchTeam.teamNumber,
    nickname: r.matchTeam.team.nickname,
    alliance: r.matchTeam.alliance,
    position: r.matchTeam.position,
    status: r.status,
    cachedAt: Date.now(),
  }));

  return NextResponse.json({ eventKey: event.key, assignments });
}
