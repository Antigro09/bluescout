import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { computeEventMetrics } from "@/lib/metrics/compute";
import { PageHeader } from "@/components/app/page-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Simulator } from "@/components/dashboard/simulator";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Simulator" };

export default async function SimulatorPage() {
  await requireUser();
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Simulator" action={<DashboardNav />} />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active event.
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = await computeEventMetrics(event.id);
  const teams = metrics.map((m) => ({
    teamNumber: m.teamNumber,
    nickname: m.nickname,
    epaTotal: m.epaTotal,
    epaAuto: m.epaAuto,
    epaTeleop: m.epaTeleop,
    epaEndgame: m.epaEndgame,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alliance simulator"
        subtitle="Project alliance output and predict matches from EPA."
        action={<DashboardNav />}
      />
      <Simulator teams={teams} />
    </div>
  );
}
