"use client";

import { useEffect, useState } from "react";
import { getDb } from "@/lib/offline/db";
import type { ReportInput } from "@/lib/scouting/schema";
import { QrGenerate } from "@/components/qr/qr-generate";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function QrPage() {
  const [reports, setReports] = useState<ReportInput[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDb()
      .reports.where("synced")
      .equals(0)
      .toArray()
      .then((rows) => {
        setReports(rows.map((r) => r.payload));
        setLoaded(true);
      });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Share via QR"
        subtitle="No wifi? Show this to your scout lead to hand off your reports."
      />
      <Card>
        <CardContent className="py-6">
          {loaded ? (
            <QrGenerate reports={reports} />
          ) : (
            <p className="text-center text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
