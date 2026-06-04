import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { setActiveEventAction } from "@/lib/events/actions";
import { PageHeader } from "@/components/app/page-header";
import { EventSyncForm } from "@/components/events/event-sync-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Events" };

export default async function EventsAdminPage() {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const events = await prisma.event.findMany({
    orderBy: [{ year: "desc" }, { startDate: "desc" }],
    include: { _count: { select: { matches: true, teamEntries: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Sync an event from The Blue Alliance & Statbotics, then set it active."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync an event</CardTitle>
          <CardDescription>
            {env.tbaAuthKey
              ? "Pulls teams, schedule, results, rankings, OPRs, and Statbotics EPA."
              : "Set TBA_AUTH_KEY in your .env to enable syncing from The Blue Alliance."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventSyncForm />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">No events synced yet.</p>
        )}
        {events.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {e.name}
                  {e.isActive && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="mr-1 size-3" /> Active
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {e.key} · {e._count.teamEntries} teams · {e._count.matches}{" "}
                  matches
                </div>
              </div>
              {!e.isActive && (
                <form action={setActiveEventAction}>
                  <input type="hidden" name="eventId" value={e.id} />
                  <Button size="sm" variant="outline" type="submit">
                    Set active
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
