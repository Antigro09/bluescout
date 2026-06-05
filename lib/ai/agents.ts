import { computeEventMetrics, type TeamMetrics } from "@/lib/metrics/compute";
import { getAIProvider } from "@/lib/ai/provider";
import { getTeamProfile, profileToPrompt } from "@/lib/strategy/profile";

function metricsContext(metrics: TeamMetrics[]): string {
  return metrics
    .slice(0, 40)
    .map((m) => {
      const season =
        m.seasonEpa != null
          ? `seasonEPA ${m.seasonEpa.toFixed(0)}${m.seasonMatches ? ` (${m.seasonMatches}mt)` : ""}`
          : "seasonEPA ?";
      const sos =
        m.sosPercentile != null
          ? `SoS ${Math.round(m.sosPercentile)}%ile${
              m.scheduleDeltaEpa != null
                ? ` (Δ${m.scheduleDeltaEpa >= 0 ? "+" : ""}${m.scheduleDeltaEpa.toFixed(1)})`
                : ""
            }`
          : "SoS ?";
      return `#${m.teamNumber} ${m.nickname ?? ""}: comp ${m.composite}, eff ${m.efficiency}, rel ${m.reliability}, avgPts ${m.avgContribution}, EPA ${m.epaTotal?.toFixed(0) ?? "?"}, ${season}, climb ${Math.round(m.climbSuccessRate * 100)}%, ${sos}, scouted ${m.matchesScouted}`;
    })
    .join("\n");
}

const LEGEND = `Columns: composite/efficiency/reliability are 0-100 blended scores; avgPts is scouted points per match; EPA is the team's Statbotics expected points at THIS event; seasonEPA is their full-season EPA across all their events this year (mt = season matches played, i.e. confidence); climb% is climb success rate; SoS is the strength-of-schedule percentile where HIGHER = HARDER schedule (faced a tougher field). Δ is the raw schedule tailwind in points: positive Δ = an easier path, so a strong record/EPA from a LOW-SoS / high-positive-Δ team may be inflated.
Credit teams that produced against HIGH-SoS (tough) schedules; be skeptical of strong stats built on a LOW-SoS (easy) schedule. Prefer seasonEPA when a team has few scouted or event matches.`;

const ANALYST_SYSTEM = `You are a concise FRC strategy analyst for team 1086 (Blue Cheese) at the 2026 REBUILT event. Answer using ONLY the team data provided.
${LEGEND}
Cite specific team numbers, be specific and brief.`;

/** Natural-language Q&A over the event's blended team metrics. */
export async function answerQuestion(
  eventId: string,
  question: string,
): Promise<string> {
  const provider = getAIProvider();
  const [metrics, profile] = await Promise.all([
    computeEventMetrics(eventId),
    getTeamProfile(),
  ]);
  const profileBlock = profileToPrompt(profile);
  return provider.complete({
    system: profileBlock
      ? `${ANALYST_SYSTEM}\n\n${profileBlock}`
      : ANALYST_SYSTEM,
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

/** Suggest a first-pick order that complements our team. */
export async function suggestPicklist(eventId: string): Promise<string> {
  const provider = getAIProvider();
  const [metrics, profile] = await Promise.all([
    computeEventMetrics(eventId),
    getTeamProfile(),
  ]);
  const profileBlock = profileToPrompt(profile);

  const system = `You are an FRC alliance-selection strategist for team 1086 (Blue Cheese) at the 2026 REBUILT event.
${profileBlock ? profileBlock + "\n\n" : ""}Recommend a FIRST-PICK order that COMPLEMENTS us: prioritize robots that cover our weaknesses and match what we want in a partner, while balancing scoring output and reliability.
${LEGEND}
For each pick give a one-line reason tied specifically to OUR needs (how they cover a weakness or fit what we're looking for).`;

  return provider.complete({
    system,
    prompt: `Team data:\n${metricsContext(metrics)}\n\nList the top 8 first-pick candidates for team ${profile.teamNumber}, each with a one-line reason explaining how they complement us.`,
    maxTokens: 1000,
  });
}
