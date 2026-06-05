import type { AllianceColor } from "@/lib/generated/prisma/enums";

export interface LineupPosition {
  key: string;
  alliance: AllianceColor;
  position: number;
  label: string;
}

export const LINEUP_POSITIONS: LineupPosition[] = [
  { key: "RED1", alliance: "RED", position: 1, label: "Red 1" },
  { key: "RED2", alliance: "RED", position: 2, label: "Red 2" },
  { key: "RED3", alliance: "RED", position: 3, label: "Red 3" },
  { key: "BLUE1", alliance: "BLUE", position: 1, label: "Blue 1" },
  { key: "BLUE2", alliance: "BLUE", position: 2, label: "Blue 2" },
  { key: "BLUE3", alliance: "BLUE", position: 3, label: "Blue 3" },
];

export type AssignState = { error?: string; message?: string } | undefined;
