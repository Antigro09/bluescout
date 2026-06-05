import { NextResponse } from "next/server";
import { getCurrentUser, isLead } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { buildTeamsCsv } from "@/lib/export/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isLead(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ error: "No active event" }, { status: 400 });
  }
  const csv = await buildTeamsCsv(event.id);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.key}-team-report.csv"`,
    },
  });
}
