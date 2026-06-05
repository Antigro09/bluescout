import { NextResponse } from "next/server";
import { getCurrentUser, isLead } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ingestReports } from "@/lib/scouting/ingest";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isLead(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const reports = (body as { reports?: unknown[] })?.reports ?? [];

  // QR-carried reports keep their original scouterId in the payload.
  const result = await ingestReports(reports, "qr");
  await prisma.qrSyncBatch.create({
    data: {
      receivedById: user.id,
      reportCount: result.inserted + result.updated,
      source: "qr",
    },
  });

  return NextResponse.json(result);
}
