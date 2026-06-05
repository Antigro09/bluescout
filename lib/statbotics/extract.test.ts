import { describe, it, expect } from "vitest";
import { extractEpa, type StatboticsTeamEvent } from "./client";

describe("extractEpa", () => {
  it("flattens the nested Statbotics EPA object", () => {
    const te: StatboticsTeamEvent = {
      team: 100,
      event: "2024casj",
      epa: {
        total_points: { mean: 19.65, sd: 3 },
        unitless: 1557,
        breakdown: {
          auto_points: 4.65,
          teleop_points: 13.07,
          endgame_points: 1.93,
        },
      },
      record: { qual: { winrate: 0.6364, rank: 8 } },
    };
    const r = extractEpa(te);
    expect(r.epaTotal).toBe(19.65);
    expect(r.epaAuto).toBe(4.65);
    expect(r.epaTeleop).toBe(13.07);
    expect(r.epaEndgame).toBe(1.93);
    expect(r.epaUnitless).toBe(1557);
    expect(r.winrate).toBeCloseTo(0.6364);
  });

  it("returns nulls when EPA data is absent", () => {
    const r = extractEpa({ team: 1, event: "x" });
    expect(r.epaTotal).toBeNull();
    expect(r.winrate).toBeNull();
  });
});
