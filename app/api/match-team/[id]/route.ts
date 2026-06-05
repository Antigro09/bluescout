import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const mt = await prisma.matchTeam.findUnique({
    where: { id },
    select: {
      id: true,
      teamNumber: true,
      alliance: true,
      position: true,
      matchId: true,
      team: { select: { nickname: true } },
      match: {
        select: {
          matchNumber: true,
          compLevel: true,
          eventId: true,
          event: { select: { key: true } },
        },
      },
    },
  });
  if (!mt) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    matchTeamId: mt.id,
    teamNumber: mt.teamNumber,
    nickname: mt.team.nickname,
    alliance: mt.alliance,
    position: mt.position,
    matchId: mt.matchId,
    matchNumber: mt.match.matchNumber,
    compLevel: mt.match.compLevel,
    eventId: mt.match.eventId,
    eventKey: mt.match.event.key,
  });
}
