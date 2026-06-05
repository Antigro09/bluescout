import Dexie, { type Table } from "dexie";
import type { ReportInput } from "@/lib/scouting/schema";

export interface CachedAssignment {
  matchTeamId: string;
  eventId: string;
  eventKey: string;
  matchId: string;
  matchNumber: number;
  compLevel: string;
  teamNumber: number;
  nickname: string | null;
  alliance: string;
  position: number;
  status: string;
  cachedAt: number;
}

export interface QueuedReport {
  clientUuid: string;
  matchTeamId: string;
  payload: ReportInput;
  synced: number; // 0 = pending, 1 = sent
  updatedAt: number;
}

class BlueScoutDB extends Dexie {
  assignments!: Table<CachedAssignment, string>;
  reports!: Table<QueuedReport, string>;

  constructor() {
    super("bluescout");
    this.version(1).stores({
      assignments: "matchTeamId, eventId, status",
      reports: "clientUuid, matchTeamId, synced",
    });
  }
}

let instance: BlueScoutDB | null = null;

/** Lazily construct the Dexie DB (browser only). */
export function getDb(): BlueScoutDB {
  if (!instance) instance = new BlueScoutDB();
  return instance;
}
