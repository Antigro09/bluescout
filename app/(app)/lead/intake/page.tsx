import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { QrScan } from "@/components/qr/qr-scan";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Scan intake" };

export default async function IntakePage() {
  await requireRole(["ADMIN", "SCOUT_LEAD"]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan intake"
        subtitle="Scan a scouter's QR code to import their offline reports into the database."
      />
      <Card>
        <CardContent className="py-6">
          <QrScan />
        </CardContent>
      </Card>
    </div>
  );
}
