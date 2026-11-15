import { describe, it, expect } from "vitest";
import { horizontalStep, ballisticStep } from "../game/AstronautMotion";
import { resourceSites } from "../game/Resources";
import { repairPlan, cableStart, socketY } from "../game/RepairPlan";
import { World } from "../game/World";
it("does not restart an active tool or erase held E when its interact shortcut fires again", () => {
  const w = Object.create(World.prototype) as World;
  Object.assign(w, {
    resources: { gather: { active: "ice-near" } },
    keys: new Set(["KeyE"]),
    repairApproach: null,
  });
  expect(w.beginGather("ice-near")).toBe(true);
  expect(w.keys.has("KeyE")).toBe(true);
  expect(w.repairApproach).toBeNull();
});
describe("planetary jumps and field expeditions", () => {
  it("retains takeoff speed when movement keys are released and the camera rotates in flight", () => {
    let v = { x: 0, z: 0 };
    for (let i = 0; i < 60; i++)
      v = horizontalStep(v, { x: 0, z: -1 }, 0, true, true, false, 1 / 60);
    const launch = { ...v };
    let distance = 0;
    for (let i = 0; i < 90; i++) {
      const next = horizontalStep(
        v,
        { x: 0, z: 0 },
        Math.PI / 2,
        false,
        true,
        false,
        1 / 60,
      );
      distance += next.dz;
      v = next;
    }
    expect(v.x).toBeCloseTo(launch.x, 8);
    expect(v.z).toBeCloseTo(launch.z, 8);
    expect(distance).toBeCloseTo(launch.z * 1.5, 8);
    const landing = horizontalStep(
      v,
      { x: 0, z: 0 },
      0,
      true,
      true,
      false,
      0.04,
    );
    expect(Math.abs(landing.z)).toBeLessThan(Math.abs(v.z));
  });
  it("allows gentle suit steering without an instant airborne reversal", () => {
    const v = { x: 1.2, z: -2.4 };
    const next = horizontalStep(v, { x: -1, z: 1 }, 2, false, true, true, 0.04);
    expect(Math.hypot(next.x - v.x, next.z - v.z)).toBeLessThanOrEqual(
      2.2 * 0.04 + 1e-8,
    );
    expect(next.z).toBeLessThan(0);
  });
  it.each([1.62, 3.71])(
    "integrates constant gravity consistently at 30 and 60 FPS: %s m/s²",
    (gravity) => {
      const fly = (dt: number) => {
        let velocity = 2.3,
          y = 0;
        for (let t = 0; t < 0.5 - 1e-6; t += dt) {
          const step = ballisticStep(velocity, gravity, dt);
          y += step.dy;
          velocity = step.velocity;
        }
        return { y, velocity };
      };
      expect(fly(1 / 30).y).toBeCloseTo(2.3 * 0.5 - 0.5 * gravity * 0.25, 7);
      expect(fly(1 / 60)).toEqual(
        expect.objectContaining({
          y: expect.closeTo(fly(1 / 30).y, 7),
          velocity: expect.closeTo(fly(1 / 30).velocity, 7),
        }),
      );
    },
  );
  it.each(["moon", "mars"] as const)(
    "puts finite, smaller supply rewards across the whole playable map on %s",
    (d) => {
      const sites = resourceSites(d);
      expect(new Set(sites.map(s => s.id)).size).toBe(40);
      expect(
        sites.every(
          (s) =>
            Math.hypot(s.x, s.z) > 25 &&
            Math.abs(s.x) < 600 &&
            Math.abs(s.z) < 600,
        ),
      ).toBe(true);
      expect(
        new Set(sites.map((s) => Math.sign(s.x) + "," + Math.sign(s.z))).size,
      ).toBe(4);
      for (const resource of ["ice", "battery"]) {
        const stations = sites.filter(s => s.kind === resource);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          const sector = stations.filter(s => Math.sign(s.x) === x && Math.sign(s.z) === z);
          expect(sector.some(s => Math.hypot(s.x, s.z) < 50)).toBe(true);
          expect(sector.some(s => Math.hypot(s.x, s.z) > 400)).toBe(true);
        }
      }
      for (const kind of ["greenhouse", "life"] as const)
        expect(repairPlan(d, kind).some((s) => s.type === "brush")).toBe(false);
    },
  );
  it("puts ordered left wires opposite a deranged right-hand socket order", () => {
    const starts = [0, 1, 2].map((i) => cableStart(i, 3));
    expect(new Set(starts.map((p) => p.x)).size).toBe(1);
    expect(starts.every((p, i) => Math.abs(p.y - socketY(i, 3)) > 0.1)).toBe(
      true,
    );
    expect(repairPlan("moon", "greenhouse")[0].count).toBe(2);
  });
});

