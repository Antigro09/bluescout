import { env } from "@/lib/env";

// Subset of the Statbotics v3 team_event object (no API key required).
export interface StatboticsTeamEvent {
  team: number;
  event: string;
  team_name?: string;
  epa?: {
    total_points?: { mean?: number; sd?: number };
    unitless?: number;
    norm?: number;
    breakdown?: {
      total_points?: number;
      auto_points?: number;
      teleop_points?: number;
      endgame_points?: number;
    };
  };
  record?: {
    qual?: {
      wins?: number;
      losses?: number;
      ties?: number;
      winrate?: number;
      rank?: number;
    };
  };
}

// Subset of the Statbotics v3 team_year object (season-cumulative).
export interface StatboticsTeamYear {
  team: number;
  year: number;
  epa?: {
    total_points?: { mean?: number };
    breakdown?: {
      auto_points?: number;
      teleop_points?: number;
      endgame_points?: number;
    };
  };
  record?: {
    wins?: number;
    losses?: number;
    ties?: number;
    count?: number;
    winrate?: number;
  };
}

async function sbFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${env.statboticsBaseUrl}${path}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Statbotics request failed: ${path} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const statbotics = {
  /** All (team, event) EPA rows for an event in one call. */
  teamEvents: (eventKey: string) =>
    sbFetch<StatboticsTeamEvent[]>(
      `/team_events?event=${encodeURIComponent(eventKey)}&limit=1000`,
    ),
  /** A team's season-cumulative EPA + record (covers all their events that year). */
  teamYear: (team: number, year: number) =>
    sbFetch<StatboticsTeamYear>(`/team_year/${team}/${year}`),
};

/** Flatten the nested EPA object into the columns we store on EventTeam. */
export function extractEpa(te: StatboticsTeamEvent) {
  const epa = te.epa;
  return {
    epaTotal: epa?.total_points?.mean ?? epa?.breakdown?.total_points ?? null,
    epaAuto: epa?.breakdown?.auto_points ?? null,
    epaTeleop: epa?.breakdown?.teleop_points ?? null,
    epaEndgame: epa?.breakdown?.endgame_points ?? null,
    epaUnitless: epa?.unitless ?? null,
    winrate: te.record?.qual?.winrate ?? null,
  };
}

/** Flatten season team_year into the season columns on EventTeam. */
export function extractSeasonEpa(ty: StatboticsTeamYear) {
  const epa = ty.epa;
  return {
    seasonEpa: epa?.total_points?.mean ?? null,
    seasonEpaAuto: epa?.breakdown?.auto_points ?? null,
    seasonEpaTeleop: epa?.breakdown?.teleop_points ?? null,
    seasonEpaEndgame: epa?.breakdown?.endgame_points ?? null,
    seasonWinrate: ty.record?.winrate ?? null,
    seasonMatches: ty.record?.count ?? null,
  };
}
