import type { Metadata } from "next";
import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events/active";
import { PageHeader } from "@/components/app/page-header";
import { CreatePicklistForm } from "@/components/picklist/create-picklist-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Picklists" };

export default async function PicklistsPage() {
  await requireRole(["ADMIN", "SCOUT_LEAD", "STRATEGIST"]);
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Picklists" />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const lists = await prisma.picklist.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Picklists"
        subtitle={`${event.name} · build them together in real time`}
      />
      <Card>
        <CardContent className="py-5">
          <CreatePicklistForm />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {lists.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No picklists yet. Seed one from your rankings to get started.
          </p>
        )}
        {lists.map((l) => (
          <Link key={l.id} href={`/picklist/${l.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <ListOrdered className="size-5 text-primary" />
                  <div>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l._count.entries} teams
                    </div>
                  </div>
                </div>
                {l.locked && <Badge variant="warning">Locked</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
