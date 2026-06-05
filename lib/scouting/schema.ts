import { z } from "zod";

export const CLIMB_LEVELS = ["NONE", "L1", "L2", "L3"] as const;
export const START_POSITIONS = ["LEFT", "CENTER", "RIGHT"] as const;
export const DEFENSE_LEVELS = ["NONE", "SOME", "HEAVY"] as const;
export const CARDS = ["NONE", "YELLOW", "RED"] as const;
export const RELIABILITY_EVENTS = [
  "TIPPED",
  "DISABLED",
  "BROKE_DOWN",
  "LOST_COMMS",
  "BROWNOUT",
  "STUCK",
] as const;

/** One match scouting report. Shared by online submit, background sync, and QR. */
export const reportSchema = z.object({
  clientUuid: z.string().min(8),
  matchTeamId: z.string().min(1),
  matchId: z.string().min(1),
  eventId: z.string().min(1),
  teamNumber: z.number().int(),
  scouterId: z.string().optional(),

  startPosition: z.enum(START_POSITIONS).nullable().optional(),
  noShow: z.boolean().default(false),

  autoLeave: z.boolean().default(false),
  autoFuel: z.number().int().min(0).max(999).default(0),
  autoClimbL1: z.boolean().default(false),

  teleopFuel: z.number().int().min(0).max(999).default(0),

  endgameClimb: z.enum(CLIMB_LEVELS).default("NONE"),
  climbFailed: z.boolean().default(false),

  defensePlayed: z.enum(DEFENSE_LEVELS).default("NONE"),
  defenseRating: z.number().int().min(1).max(5).nullable().optional(),
  driverSkill: z.number().int().min(1).max(5).nullable().optional(),
  reliability: z.array(z.enum(RELIABILITY_EVENTS)).default([]),
  card: z.enum(CARDS).default("NONE"),
  notes: z.string().max(2000).nullable().optional(),

  scoutedAt: z.string().optional(),
  deviceId: z.string().optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const reportsBatchSchema = z.object({
  reports: z.array(reportSchema).max(1000),
});
