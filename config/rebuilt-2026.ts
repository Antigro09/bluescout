// ===========================================================================
// FRC 2026 "REBUILT" game configuration.
//
// This is the ONLY file that should need meaningful changes between seasons.
// It defines scoring values, ranking-point thresholds, and the scouting form
// field layout (which maps 1:1 onto the MatchScoutReport / PitScoutReport
// Prisma models).
// ===========================================================================

export const GAME = {
  year: 2026,
  name: "REBUILT",
  autoSeconds: 20,
  teleopSeconds: 140,
  scoring: {
    fuelAuto: 1, // points per fuel scored in active HUB during auto
    fuelTeleop: 1, // points per fuel scored in active HUB during teleop
    climbAutoL1: 15, // hang at Level 1 during auto
    climbTeleopL1: 10,
    climbTeleopL2: 20,
    climbTeleopL3: 30,
  },
  rankingPoints: {
    energized: 100, // fuel scored in active HUB
    supercharged: 360, // fuel scored in active HUB
    traversal: 50, // points earned from the Tower
    win: 3,
    tie: 1,
  },
} as const;

export type ClimbLevelValue = "NONE" | "L1" | "L2" | "L3";

export function teleopClimbPoints(level: ClimbLevelValue): number {
  switch (level) {
    case "L1":
      return GAME.scoring.climbTeleopL1;
    case "L2":
      return GAME.scoring.climbTeleopL2;
    case "L3":
      return GAME.scoring.climbTeleopL3;
    default:
      return 0;
  }
}

/** Inputs needed to estimate a single robot's point contribution in a match. */
export interface ScoredReport {
  autoFuel: number;
  teleopFuel: number;
  autoClimbL1: boolean;
  endgameClimb: ClimbLevelValue;
  climbFailed: boolean;
  noShow?: boolean;
}

/** Estimated points contributed by one robot (used for efficiency ranking). */
export function estimateContribution(r: ScoredReport): {
  auto: number;
  teleop: number;
  endgame: number;
  total: number;
} {
  if (r.noShow) return { auto: 0, teleop: 0, endgame: 0, total: 0 };
  const auto =
    r.autoFuel * GAME.scoring.fuelAuto +
    (r.autoClimbL1 ? GAME.scoring.climbAutoL1 : 0);
  const teleop = r.teleopFuel * GAME.scoring.fuelTeleop;
  const endgame = r.climbFailed ? 0 : teleopClimbPoints(r.endgameClimb);
  return { auto, teleop, endgame, total: auto + teleop + endgame };
}

// ---------------------------------------------------------------------------
// Scouting form field definitions (drive dynamic form rendering).
// `key` matches the corresponding Prisma model field.
// ---------------------------------------------------------------------------

export type ScoutFieldType =
  | "counter"
  | "boolean"
  | "select"
  | "rating"
  | "multiselect"
  | "text"
  | "number";

interface FieldBase {
  key: string;
  label: string;
  help?: string;
}

export type ScoutField = FieldBase &
  (
    | { type: "counter"; min?: number; max?: number; step?: number; big?: boolean }
    | { type: "boolean" }
    | { type: "select"; options: { value: string; label: string }[] }
    | { type: "rating"; max: number }
    | { type: "multiselect"; options: { value: string; label: string }[] }
    | { type: "text"; multiline?: boolean; placeholder?: string }
    | { type: "number"; min?: number; max?: number; step?: number; unit?: string }
  );

export interface FieldSection {
  id: string;
  title: string;
  accent?: "auto" | "teleop" | "endgame" | "neutral";
  fields: ScoutField[];
}

const START_POSITIONS = [
  { value: "LEFT", label: "Left" },
  { value: "CENTER", label: "Center" },
  { value: "RIGHT", label: "Right" },
];

const CLIMB_LEVELS = [
  { value: "NONE", label: "None" },
  { value: "L1", label: "Level 1 (10)" },
  { value: "L2", label: "Level 2 (20)" },
  { value: "L3", label: "Level 3 (30)" },
];

const DEFENSE = [
  { value: "NONE", label: "None" },
  { value: "SOME", label: "Some" },
  { value: "HEAVY", label: "Heavy" },
];

const CARDS = [
  { value: "NONE", label: "No card" },
  { value: "YELLOW", label: "Yellow" },
  { value: "RED", label: "Red" },
];

const RELIABILITY = [
  { value: "TIPPED", label: "Tipped over" },
  { value: "DISABLED", label: "Disabled" },
  { value: "BROKE_DOWN", label: "Broke down" },
  { value: "LOST_COMMS", label: "Lost comms" },
  { value: "BROWNOUT", label: "Brownout" },
  { value: "STUCK", label: "Stuck on field" },
];

export const MATCH_SCOUT_SECTIONS: FieldSection[] = [
  {
    id: "pre",
    title: "Pre-match",
    accent: "neutral",
    fields: [
      { key: "startPosition", label: "Starting position", type: "select", options: START_POSITIONS },
      { key: "noShow", label: "No-show / didn't move", type: "boolean", help: "Robot never left its start or was a no-show." },
    ],
  },
  {
    id: "auto",
    title: "Autonomous (20s)",
    accent: "auto",
    fields: [
      { key: "autoLeave", label: "Left starting zone", type: "boolean" },
      { key: "autoFuel", label: "Fuel scored (auto)", type: "counter", min: 0, big: true },
      { key: "autoClimbL1", label: "Climbed Level 1 in auto (+15)", type: "boolean" },
    ],
  },
  {
    id: "teleop",
    title: "Teleop",
    accent: "teleop",
    fields: [
      { key: "teleopFuel", label: "Fuel scored (teleop)", type: "counter", min: 0, big: true },
    ],
  },
  {
    id: "endgame",
    title: "Endgame",
    accent: "endgame",
    fields: [
      { key: "endgameClimb", label: "Tower climb level", type: "select", options: CLIMB_LEVELS },
      { key: "climbFailed", label: "Climb attempt failed", type: "boolean" },
    ],
  },
  {
    id: "qualitative",
    title: "Qualitative",
    accent: "neutral",
    fields: [
      { key: "defensePlayed", label: "Defense played", type: "select", options: DEFENSE },
      { key: "defenseRating", label: "Defense effectiveness", type: "rating", max: 5 },
      { key: "driverSkill", label: "Driver skill", type: "rating", max: 5 },
      { key: "reliability", label: "Issues observed", type: "multiselect", options: RELIABILITY },
      { key: "card", label: "Card", type: "select", options: CARDS },
      { key: "notes", label: "Notes", type: "text", multiline: true, placeholder: "Anything notable about strategy, breakdowns, etc." },
    ],
  },
];

const DRIVETRAINS = [
  { value: "SWERVE", label: "Swerve" },
  { value: "TANK", label: "Tank / WCD" },
  { value: "MECANUM", label: "Mecanum" },
  { value: "OTHER", label: "Other" },
];

export const PIT_SCOUT_SECTIONS: FieldSection[] = [
  {
    id: "robot",
    title: "Robot",
    accent: "neutral",
    fields: [
      { key: "drivetrain", label: "Drivetrain", type: "select", options: DRIVETRAINS },
      { key: "weightLbs", label: "Weight", type: "number", min: 0, unit: "lbs" },
      { key: "widthIn", label: "Width", type: "number", min: 0, unit: "in" },
      { key: "lengthIn", label: "Length", type: "number", min: 0, unit: "in" },
      { key: "heightIn", label: "Height", type: "number", min: 0, unit: "in" },
      { key: "motorCount", label: "# Drive motors", type: "number", min: 0 },
    ],
  },
  {
    id: "capabilities",
    title: "Capabilities",
    accent: "teleop",
    fields: [
      { key: "scoringMechanism", label: "Scoring mechanism", type: "text", placeholder: "How does it intake & shoot fuel?" },
      { key: "maxFuelCapacity", label: "Max fuel capacity", type: "number", min: 0 },
      { key: "climbLevels", label: "Can climb", type: "multiselect", options: CLIMB_LEVELS.filter((c) => c.value !== "NONE") },
      { key: "autoMaxFuel", label: "Max auto fuel", type: "number", min: 0 },
      { key: "autoDescription", label: "Auto routines", type: "text", multiline: true },
    ],
  },
  {
    id: "meta",
    title: "Other",
    accent: "neutral",
    fields: [
      { key: "language", label: "Programming language", type: "text" },
      { key: "hasVision", label: "Has vision / targeting", type: "boolean" },
      { key: "notes", label: "Notes", type: "text", multiline: true },
    ],
  },
];
