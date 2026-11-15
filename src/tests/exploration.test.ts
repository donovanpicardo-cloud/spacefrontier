import { describe, it, expect } from "vitest";
import { orbitDelta, shoulderFraming } from "../game/CameraInput";
import { terrainHeight } from "../game/environments/Terrain";
describe("cursor-controlled shoulder camera", () => {
  it("widens framing and lowers the focus when an obstacle forces the camera close", () => {
    const open = shoulderFraming(4.7),
      tight = shoulderFraming(1.6);
    expect(open.fov).toBe(52);
    expect(tight.fov).toBeGreaterThan(open.fov);
    expect(tight.aimDrop).toBeGreaterThan(0);
    expect(shoulderFraming(0.2).fov).toBeLessThanOrEqual(82);
  });
  it("orbits in both directions and allows a complete revolution", () => {
    const right = orbitDelta(0, 0.2, 100, 0, 1),
      left = orbitDelta(0, 0.2, -100, 0, 1);
    expect(right.yaw).toBeLessThan(0);
    expect(left.yaw).toBeGreaterThan(0);
    expect(Math.abs(orbitDelta(0, 0.2, 3000, 0, 1).yaw)).toBeGreaterThan(
      Math.PI * 2,
    );
  });
  it("respects sensitivity and clamps vertical movement", () => {
    expect(orbitDelta(0, 0.2, 100, 0, 2).yaw).toBeCloseTo(
      orbitDelta(0, 0.2, 100, 0, 1).yaw * 2,
    );
    expect(orbitDelta(0, 0.2, 0, 10000, 1).pitch).toBe(0.95);
    expect(orbitDelta(0, 0.2, 0, -10000, 1).pitch).toBe(-0.42);
  });
  it("recovers from invalid deltas without poisoning the camera", () => {
    expect(orbitDelta(0, 0.2, NaN, 0, 1)).toEqual({ yaw: 0, pitch: 0.2 });
  });
});
describe("planetary terrain traversability", () => {
  it("keeps the habitat, airlock and solar foundations level on both worlds", () => {
    for (const d of ["moon", "mars"] as const)
      for (const [x, z] of [
        [0, -10],
        [0, -22],
        [-6, -33],
        [6, -13],
        [15, -4],
        [0, 4],
      ])
        expect(terrainHeight(x, z, d)).toBe(0);
  });
  it("is deterministic, finite and geologically distinct outside the outpost", () => {
    for (let x = -100; x <= 100; x += 10)
      for (let z = -100; z <= 100; z += 10)
        expect(Number.isFinite(terrainHeight(x, z, "moon"))).toBe(true);
    expect(terrainHeight(-24, 17, "moon")).toBe(terrainHeight(-24, 17, "moon"));
    expect(terrainHeight(-24, 17, "moon")).not.toBeCloseTo(
      terrainHeight(-24, 17, "mars"),
    );
  });
});
