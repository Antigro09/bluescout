import type { Metadata } from "next";
import { Download, FileSpreadsheet, DatabaseBackup } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { PageHeader } from "@/components/app/page-header";
import { ImportForm } from "@/components/export/import-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Export & backup" };

function DownloadBtn({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Button variant="outline" disabled>
        <FileSpreadsheet className="size-4" />
        {label}
      </Button>
    );
  }
  return (
    <Button variant="outline" asChild>
      <a href={href}>
        <FileSpreadsheet className="size-4" />
        {label}
      </a>
    </Button>
  );
}

export default async function ExportPage() {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const event = await getActiveEvent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export & backup"
        subtitle="Download your scouting data for analysis, or back it up and restore it later."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spreadsheets (CSV)</CardTitle>
          <CardDescription>
            {event
              ? `Active event: ${event.name}. One row per robot / report.`
              : "No active event — activate one under Events."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <DownloadBtn href="/api/export/teams-csv" label="Team report (every robot)" disabled={!event} />
          <DownloadBtn href="/api/export/match-csv" label="Match scouting" disabled={!event} />
          <DownloadBtn href="/api/export/pit-csv" label="Pit scouting" disabled={!event} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full backup (JSON)</CardTitle>
          <CardDescription>
            Everything — match & pit scouting, photos, notes, plus all synced TBA
            &amp; Statbotics data (EPA, OPR, SoS, season). Re-importable below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/export/backup">
              <Download className="size-4" />
              Download full backup
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseBackup className="size-4" /> Restore from backup
          </CardTitle>
          <CardDescription>
            Upload a previously downloaded backup <code>.json</code> to restore
            lost data. Safe to run repeatedly — it merges by stable IDs and never
            duplicates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
