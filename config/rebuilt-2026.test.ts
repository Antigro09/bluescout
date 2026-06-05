import { describe, it, expect } from "vitest";
import { estimateContribution, teleopClimbPoints } from "./rebuilt-2026";

describe("REBUILT scoring", () => {
  it("teleop climb points by level", () => {
    expect(teleopClimbPoints("NONE")).toBe(0);
    expect(teleopClimbPoints("L1")).toBe(10);
    expect(teleopClimbPoints("L2")).toBe(20);
    expect(teleopClimbPoints("L3")).toBe(30);
  });

  it("estimates point contribution (auto fuel + auto climb + teleop + endgame)", () => {
    const r = estimateContribution({
      autoFuel: 5,
      teleopFuel: 12,
      autoClimbL1: true,
      endgameClimb: "L2",
      climbFailed: false,
    });
    expect(r.auto).toBe(20); // 5 fuel + 15 auto climb
    expect(r.teleop).toBe(12);
    expect(r.endgame).toBe(20);
    expect(r.total).toBe(52);
  });

  it("scores zero for a no-show", () => {
    const r = estimateContribution({
      autoFuel: 5,
      teleopFuel: 12,
      autoClimbL1: true,
      endgameClimb: "L3",
      climbFailed: false,
      noShow: true,
    });
    expect(r.total).toBe(0);
  });

  it("awards no endgame points for a failed climb", () => {
    const r = estimateContribution({
      autoFuel: 0,
      teleopFuel: 0,
      autoClimbL1: false,
      endgameClimb: "L3",
      climbFailed: true,
    });
    expect(r.endgame).toBe(0);
  });
});
