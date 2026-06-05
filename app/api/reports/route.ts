import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { ingestReports } from "@/lib/scouting/ingest";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const reports = Array.isArray(body)
    ? body
    : ((body as { reports?: unknown[] })?.reports ?? [body]);

  const result = await ingestReports(reports, "sync", user.id);
  return NextResponse.json(result);
}
