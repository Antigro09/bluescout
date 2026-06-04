// Team & app identity for FRC 1086 Blue Cheese.
export const APP_NAME = "BlueScout";
export const APP_TAGLINE = "Scouting & strategy for FRC 1086 Blue Cheese";
export const TEAM_NUMBER = 1086;
export const TEAM_NAME = "Blue Cheese";
export const SEASON_YEAR = 2026;
export const GAME_NAME = "REBUILT";

// Brand colors (team blue + yellow). Also mirrored as CSS variables in globals.css.
export const BRAND = {
  blue: "#1d4ed8",
  blueDark: "#1e3a8a",
  yellow: "#facc15",
  yellowDark: "#eab308",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SCOUT_LEAD: "Scout Lead",
  SCOUTER: "Scouter",
  STRATEGIST: "Strategist",
  VIEWER: "Viewer",
};

export const ROLE_ORDER = [
  "ADMIN",
  "SCOUT_LEAD",
  "STRATEGIST",
  "SCOUTER",
  "VIEWER",
] as const;
