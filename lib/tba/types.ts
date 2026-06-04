// Minimal subset of The Blue Alliance APIv3 response shapes used by BlueScout.

export interface TBAEvent {
  key: string;
  name: string;
  short_name?: string | null;
  year: number;
  week?: number | null;
  city?: string | null;
  state_prov?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  event_type?: number;
}

export interface TBATeam {
  key: string;
  team_number: number;
  nickname?: string | null;
  name?: string | null;
  city?: string | null;
  state_prov?: string | null;
  country?: string | null;
  rookie_year?: number | null;
  website?: string | null;
}

export interface TBAMatchAlliance {
  team_keys: string[];
  score: number | null;
}

export interface TBAMatch {
  key: string;
  comp_level: string; // qm | ef | qf | sf | f
  set_number: number;
  match_number: number;
  alliances: { red: TBAMatchAlliance; blue: TBAMatchAlliance };
  winning_alliance?: string; // "red" | "blue" | ""
  time?: number | null;
  predicted_time?: number | null;
  actual_time?: number | null;
  score_breakdown?: { red?: unknown; blue?: unknown } | null;
}

export interface TBARankingEntry {
  rank: number;
  team_key: string;
  record: { wins: number; losses: number; ties: number } | null;
  sort_orders?: number[] | null;
}

export interface TBARankings {
  rankings: TBARankingEntry[] | null;
}

export interface TBAOPRs {
  oprs?: Record<string, number>;
  dprs?: Record<string, number>;
  ccwms?: Record<string, number>;
}
