import type { Metadata } from "next";
import { requireUser, isLead } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { computeEventMetrics } from "@/lib/metrics/compute";
import { PageHeader } from "@/components/app/page-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { RankingsTable } from "@/components/dashboard/rankings-table";
import { ShareButton } from "@/components/share/share-button";
import { createDashboardShareAction } from "@/lib/share/actions";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Strategic rankings" };

export default async function RankingsPage() {
  const user = await requireUser();
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Strategic rankings" action={<DashboardNav />} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event. Sync and activate one to see rankings.
          </CardContent>
        </Card>
      </div>
    );
  }

  const teams = await computeEventMetrics(event.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Strategic rankings"
        subtitle={`${event.name} · ranked by efficiency & reliability`}
        action={
          <div className="flex items-center gap-2">
            {isLead(user) && (
              <ShareButton action={createDashboardShareAction} />
            )}
            <DashboardNav />
          </div>
        }
      />
      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No teams yet for this event.
          </CardContent>
        </Card>
      ) : (
        <RankingsTable teams={teams} />
      )}
      <p className="text-xs text-muted-foreground">
        Composite = 60% efficiency + 40% reliability. Efficiency blends scouted
        point contribution with Statbotics EPA; reliability blends consistency,
        climb success, and issue rate (weighted by how many matches were
        scouted). Tap a row for the full team breakdown.
      </p>
    </div>
  );
}
