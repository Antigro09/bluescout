import { NextResponse } from "next/server";
import { getCurrentUser, isLead } from "@/lib/auth/guards";
import { buildBackup } from "@/lib/export/backup";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isLead(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const backup = await buildBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bluescout-backup-${stamp}.json"`,
    },
  });
}
