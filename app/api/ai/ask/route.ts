import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/events/active";
import { isAIEnabled } from "@/lib/ai/provider";
import { answerQuestion } from "@/lib/ai/agents";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAIEnabled()) {
    return NextResponse.json(
      { error: "AI is disabled. Set AI_ENABLED=true and a provider key." },
      { status: 503 },
    );
  }
  const event = await getActiveEvent();
  if (!event) {
    return NextResponse.json({ error: "No active event." }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { question?: string };
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Empty question." }, { status: 400 });
  }
  try {
    const answer = await answerQuestion(event.id, question);
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
