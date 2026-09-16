import { describe, it, expect } from "vitest";
import { projectPoint } from "./perspective";
describe("3D perspective projection", () => {
  it("is the identity transform at zero degrees", () => {
    expect(projectPoint(200, 300, 700, 1400, 0)).toEqual({ x: 200, y: 300 });
  });
  it("keeps the center stationary", () => {
    expect(projectPoint(350, 700, 700, 1400, 30)).toEqual({ x: 350, y: 700 });
  });
  it("foreshortens width and makes the near edge taller", () => {
    const far = projectPoint(0, 0, 700, 1400, 30),
      near = projectPoint(700, 0, 700, 1400, 30);
    expect(far.x).toBeGreaterThan(0);
    expect(near.x - far.x).toBeLessThan(700);
    expect(near.y).toBeLessThan(far.y);
  });
  it("opposite angles mirror the projection", () => {
    const a = projectPoint(0, 0, 700, 1400, 30),
      b = projectPoint(700, 0, 700, 1400, -30);
    expect(a.x).toBeCloseTo(700 - b.x);
    expect(a.y).toBeCloseTo(b.y);
  });
});
