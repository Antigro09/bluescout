import Link from "next/link";
import {
  ClipboardList,
  ListOrdered,
  Wrench,
  Users,
  CalendarRange,
  QrCode,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { requireUser, isLead, canStrategize } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  const lead = isLead(user);

  const [pendingCount, activeEvent, myPending] = await Promise.all([
    lead ? prisma.user.count({ where: { approved: false } }) : Promise.resolve(0),
    prisma.event.findFirst({ where: { isActive: true } }),
    prisma.scoutAssignment.count({
      where: { scouterId: user.id, status: "PENDING" },
    }),
  ]);

  const tiles = [
    {
      href: "/assignments",
      title: "My matches",
      desc: myPending
        ? `${myPending} assignment${myPending === 1 ? "" : "s"} to scout`
        : "Your assigned matches",
      icon: ClipboardList,
      show: true,
    },
    {
      href: "/pit",
      title: "Pit scouting",
      desc: "Robot capabilities & photos",
      icon: Wrench,
      show: true,
    },
    {
      href: "/dashboard/rankings",
      title: "Strategic rankings",
      desc: "Efficiency & reliability",
      icon: BarChart3,
      show: true,
    },
    {
      href: "/picklist",
      title: "Picklists",
      desc: "Collaborate in real time",
      icon: ListOrdered,
      show: canStrategize(user),
    },
    {
      href: "/lead/assignments",
      title: "Assign scouters",
      desc: "Match → robot → scouter",
      icon: CalendarRange,
      show: lead,
    },
    {
      href: "/lead/intake",
      title: "QR intake",
      desc: "Scan offline scouting data",
      icon: QrCode,
      show: lead,
    },
    {
      href: "/admin/users",
      title: "People",
      desc: pendingCount
        ? `${pendingCount} awaiting approval`
        : "Manage scouters & roles",
      icon: Users,
      show: lead,
      badge: pendingCount || undefined,
    },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={
          activeEvent
            ? `Active event: ${activeEvent.name}`
            : "No active event selected yet."
        }
        action={
          activeEvent ? (
            <Badge variant="secondary">{activeEvent.key}</Badge>
          ) : lead ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/events">Choose event</Link>
            </Button>
          ) : null
        }
      />

      {lead && pendingCount > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">
                {pendingCount} scouter{pendingCount === 1 ? "" : "s"} awaiting
                approval
              </p>
              <p className="text-sm text-muted-foreground">
                Approve accounts so they can start scouting.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/admin/users">
                Review <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <t.icon className="size-5" />
                  </div>
                  {t.badge ? <Badge variant="warning">{t.badge}</Badge> : null}
                </div>
                <CardTitle className="mt-3 text-base">{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
