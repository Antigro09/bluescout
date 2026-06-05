import { describe, it, expect } from "vitest";
import { avg, stdDev, clamp, fmt } from "./utils";

describe("utils", () => {
  it("avg", () => {
    expect(avg([2, 4, 6])).toBe(4);
    expect(avg([])).toBe(0);
  });

  it("clamp", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it("fmt", () => {
    expect(fmt(null)).toBe("—");
    expect(fmt(undefined)).toBe("—");
    expect(fmt(3.14159, 2)).toBe("3.14");
  });

  it("stdDev", () => {
    expect(stdDev([5, 5, 5])).toBe(0);
    expect(stdDev([2, 4, 6])).toBeCloseTo(1.633, 2);
    expect(stdDev([7])).toBe(0);
  });
});
