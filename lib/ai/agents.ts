import { computeEventMetrics, type TeamMetrics } from "@/lib/metrics/compute";
import { getAIProvider } from "@/lib/ai/provider";

function metricsContext(metrics: TeamMetrics[]): string {
  return metrics
    .slice(0, 40)
    .map(
      (m) =>
        `#${m.teamNumber} ${m.nickname ?? ""}: composite ${m.composite}, efficiency ${m.efficiency}, reliability ${m.reliability}, avgPts ${m.avgContribution}, EPA ${m.epaTotal?.toFixed(0) ?? "?"}, climb ${Math.round(m.climbSuccessRate * 100)}%, matches ${m.matchesScouted}`,
    )
    .join("\n");
}

const ANALYST_SYSTEM = `You are a concise FRC strategy analyst for team 1086 (Blue Cheese) at the 2026 REBUILT event. Answer using ONLY the team data provided.
Columns: composite/efficiency/reliability are 0-100 blended scores; avgPts is scouted points per match; EPA is the Statbotics expected-points metric; climb% is climb success rate. Cite specific team numbers, be specific and brief.`;

/** Natural-language Q&A over the event's blended team metrics. */
export async function answerQuestion(
  eventId: string,
  question: string,
): Promise<string> {
  const provider = getAIProvider();
  const metrics = await computeEventMetrics(eventId);
  return provider.complete({
    system: ANALYST_SYSTEM,
    prompt: `Team data for the event:\n${metricsContext(metrics)}\n\nQuestion: ${question}`,
    maxTokens: 700,
  });
}

/** Summarize a team's qualitative super-scout notes. */
export async function summarizeNotes(notes: string[]): Promise<string> {
  const provider = getAIProvider();
  return provider.complete({
    system:
      "Summarize these FRC scouting notes into 1-2 sentences capturing the team's strengths, weaknesses, and how they play. Neutral and concise.",
    prompt: notes.join("\n---\n"),
    maxTokens: 200,
  });
}

/** Suggest a first-pick order with rationale. */
export async function suggestPicklist(eventId: string): Promise<string> {
  const provider = getAIProvider();
  const metrics = await computeEventMetrics(eventId);
  return provider.complete({
    system:
      "You are an FRC alliance-selection strategist for team 1086. Recommend a first-pick order balancing scoring output and reliability. Cite team numbers with a one-line reason each.",
    prompt: `Team data:\n${metricsContext(metrics)}\n\nList the top 8 first-pick candidates with a one-line reason each.`,
    maxTokens: 800,
  });
}
