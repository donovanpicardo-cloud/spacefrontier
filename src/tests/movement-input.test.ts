import { describe, expect, it } from "vitest";
import * as T from "three";
import { updateMovementInput, sprintHeld } from "../game/MovementInput";
import { horizontalStep } from "../game/AstronautMotion";
import { CollisionWorld } from "../game/CollisionWorld";
import { ExplorerVehicle } from "../game/Vehicle";

describe("sprint input across crash handoff and focus changes", () => {
  it.each(["ShiftLeft", "ShiftRight"])(
    "sprints with %s and returns to walking on release",
    (code) => {
      const keys = new Set<string>();
      updateMovementInput(keys, { code, shiftKey: true }, true);
      updateMovementInput(keys, { code: "KeyW", shiftKey: true }, true);
      expect(sprintHeld(keys)).toBe(true);
      let velocity = { x: 0, z: 0 };
      for (let i = 0; i < 120; i++)
        velocity = horizontalStep(
          velocity,
          { x: 0, z: -1 },
          0,
          true,
          true,
          sprintHeld(keys),
          1 / 60,
        );
      expect(-velocity.z).toBeCloseTo(4.5, 3);
      updateMovementInput(keys, { code, shiftKey: false }, false);
      expect(sprintHeld(keys)).toBe(false);
      for (let i = 0; i < 120; i++)
        velocity = horizontalStep(
          velocity,
          { x: 0, z: -1 },
          0,
          true,
          true,
          sprintHeld(keys),
          1 / 60,
        );
      expect(-velocity.z).toBeCloseTo(2.1, 3);
    },
  );
  it("recovers a physically held Shift after crash loading clears the key buffer", () => {
    const keys = new Set(["ShiftLeft"]);
    keys.clear();
    updateMovementInput(keys, { code: "KeyW", shiftKey: true }, true);
    expect(sprintHeld(keys)).toBe(true);
    updateMovementInput(keys, { code: "KeyW", shiftKey: false }, false);
    expect(sprintHeld(keys)).toBe(false);
  });
  it("keeps sprint while either Shift remains held and clears a missed release", () => {
    const keys = new Set<string>();
    updateMovementInput(keys, { code: "ShiftLeft", shiftKey: true }, true);
    updateMovementInput(keys, { code: "ShiftRight", shiftKey: true }, true);
    updateMovementInput(keys, { code: "ShiftLeft", shiftKey: true }, false);
    expect(sprintHeld(keys)).toBe(true);
    updateMovementInput(keys, { code: "KeyW", shiftKey: false }, true);
    expect(sprintHeld(keys)).toBe(false);
  });
});

describe("post-crash buggy departure", () => {
  it("chooses a clear heading when the parked buggy points into a nearby wreck", () => {
    const physics = new CollisionWorld();
    // The chassis is clear at spawn but the old forward route reaches this solid wreck.
    physics.add(new T.Box3(new T.Vector3(-6, -1, 7), new T.Vector3(-2, 4, 13)));
    const vehicle = new ExplorerVehicle(
      new T.Scene(),
      "moon",
      () => 0,
      physics,
      () => {},
    );
    const start = vehicle.root.position.clone();
    expect(vehicle.state.yaw).not.toBeCloseTo(Math.PI + Math.PI / 6);
    vehicle.driving = true;
    const player = new T.Object3D();
    for (let i = 0; i < 180; i++)
      vehicle.update(1 / 60, { throttle: 1, steer: 0, brake: false }, player);
    expect(vehicle.root.position.distanceTo(start)).toBeGreaterThan(6);
    expect(vehicle.state.speed).toBeGreaterThan(3);
  });
});

