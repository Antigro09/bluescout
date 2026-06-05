import { describe, it, expect } from "vitest";
import { encodeReports, parseFrame, decodeFrames } from "./codec";
import type { ReportInput } from "@/lib/scouting/schema";

function mk(i: number): ReportInput {
  return {
    clientUuid: `uuid-${i}`,
    matchTeamId: `mt${i}`,
    matchId: `m${i}`,
    eventId: "e1",
    teamNumber: 1000 + i,
    noShow: false,
    autoLeave: true,
    autoFuel: i,
    autoClimbL1: false,
    teleopFuel: i * 2,
    endgameClimb: "L1",
    climbFailed: false,
    defensePlayed: "NONE",
    reliability: [],
    card: "NONE",
    notes: `note ${i}`,
  };
}

describe("QR codec", () => {
  it("round-trips a multi-frame batch losslessly", () => {
    const reports = Array.from({ length: 20 }, (_, i) => mk(i));
    const frames = encodeReports(reports);
    expect(frames.length).toBeGreaterThan(0);

    const map = new Map<number, string>();
    let total = 0;
    for (const f of frames) {
      const p = parseFrame(f);
      expect(p).not.toBeNull();
      map.set(p!.index, p!.data);
      total = p!.total;
    }
    const out = decodeFrames(map, total);
    expect(out).toHaveLength(20);
    expect(out[5].teamNumber).toBe(1005);
    expect(out[19].teleopFuel).toBe(38);
  });

  it("rejects non-BSQR frames", () => {
    expect(parseFrame("hello world")).toBeNull();
  });

  it("throws on a missing frame", () => {
    expect(() => decodeFrames(new Map([[0, "x"]]), 3)).toThrow();
  });
});
