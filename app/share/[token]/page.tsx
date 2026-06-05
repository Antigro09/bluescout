import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { computeEventMetrics } from "@/lib/metrics/compute";
import { Wordmark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Shared", robots: { index: false } };

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Wordmark />
          <Badge variant="muted">Read-only</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) notFound();
  if (link.expiresAt && link.expiresAt < new Date()) notFound();

  if (link.scope === "DASHBOARD" && link.eventId) {
    const [event, metrics] = await Promise.all([
      prisma.event.findUnique({ where: { id: link.eventId } }),
      computeEventMetrics(link.eventId),
    ]);
    return (
      <Shell title={`${event?.name ?? "Event"} · Strategic rankings`}>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Team</th>
                <th className="px-3 py-2 text-right font-medium">Composite</th>
                <th className="px-3 py-2 text-right font-medium">Efficiency</th>
                <th className="px-3 py-2 text-right font-medium">Reliability</th>
                <th className="px-3 py-2 text-right font-medium">EPA</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((t, i) => (
                <tr key={t.teamNumber} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{t.teamNumber}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {t.nickname ?? ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {t.composite}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.efficiency}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.reliability}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(t.epaTotal, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Shell>
    );
  }

  if (link.scope === "PICKLIST" && link.picklistId) {
    const list = await prisma.picklist.findUnique({
      where: { id: link.picklistId },
      include: {
        entries: {
          orderBy: { order: "asc" },
          include: { team: { select: { nickname: true } } },
        },
      },
    });
    if (!list) notFound();
    return (
      <Shell title={`${list.name} · Picklist`}>
        <ol className="space-y-1.5">
          {list.entries.map((e, i) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="w-6 text-center font-bold text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="font-semibold">{e.teamNumber}</span>
              <span className="text-sm text-muted-foreground">
                {e.team.nickname ?? ""}
              </span>
              {e.picked && <Badge variant="muted" className="ml-auto">Picked</Badge>}
            </li>
          ))}
        </ol>
      </Shell>
    );
  }

  notFound();
}
