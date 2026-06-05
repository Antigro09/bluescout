import { NextResponse } from "next/server";
import { getCurrentUser, isLead } from "@/lib/auth/guards";
import { restoreBackup, type Backup } from "@/lib/export/backup";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isLead(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let data: Backup;
  try {
    data = (await req.json()) as Backup;
  } catch {
    return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
  }
  if (!data || !Array.isArray(data.events)) {
    return NextResponse.json(
      { error: "That doesn't look like a BlueScout backup." },
      { status: 400 },
    );
  }
  const result = await restoreBackup(data);
  return NextResponse.json(result);
}
