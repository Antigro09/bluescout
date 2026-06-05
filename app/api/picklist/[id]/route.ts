import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { computeEventMetrics } from "@/lib/metrics/compute";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const list = await prisma.picklist.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { order: "asc" },
        include: { team: { select: { nickname: true } } },
      },
      doNotPick: { include: { team: { select: { nickname: true } } } },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!list) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const metrics = await computeEventMetrics(list.eventId);
  const byTeam = new Map(metrics.map((m) => [m.teamNumber, m]));

  const eventTeams = await prisma.eventTeam.findMany({
    where: { eventId: list.eventId },
    select: { teamNumber: true, team: { select: { nickname: true } } },
    orderBy: { teamNumber: "asc" },
  });
  const used = new Set([
    ...list.entries.map((e) => e.teamNumber),
    ...list.doNotPick.map((d) => d.teamNumber),
  ]);

  return NextResponse.json({
    id: list.id,
    name: list.name,
    kind: list.kind,
    locked: list.locked,
    entries: list.entries.map((e) => {
      const m = byTeam.get(e.teamNumber);
      return {
        id: e.id,
        teamNumber: e.teamNumber,
        nickname: e.team.nickname,
        picked: e.picked,
        note: e.note,
        composite: m?.composite ?? null,
        efficiency: m?.efficiency ?? null,
        reliability: m?.reliability ?? null,
      };
    }),
    doNotPick: list.doNotPick.map((d) => ({
      teamNumber: d.teamNumber,
      nickname: d.team.nickname,
      reason: d.reason,
    })),
    comments: list.comments.map((c) => ({
      id: c.id,
      content: c.content,
      teamNumber: c.teamNumber,
      author: c.author?.name ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    available: eventTeams
      .filter((t) => !used.has(t.teamNumber))
      .map((t) => ({ teamNumber: t.teamNumber, nickname: t.team.nickname })),
  });
}
