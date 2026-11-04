import { describe, it, expect, vi } from "vitest";
import { WorldResources } from "../game/WorldResources";
import * as T from "three";
import {
  Gathering,
  resourceSites,
  resourceReward,
  hasResourceSpace,
} from "../game/Resources";
import { CollisionWorld } from "../game/CollisionWorld";
import { ExplorerVehicle } from "../game/Vehicle";
import { driveStep } from "../game/VehiclePhysics";
import { chassisOverlaps } from "../game/VehicleCollision";
import { initialSim } from "../simulation/engine";
import { parseSave, type Save } from "../game/Save";

describe("surface supply gathering", () => {
  it.each(["moon", "mars"] as const)(
    "leaves a clear operator stance and a walkable way out at all remote rigs on %s",
    (d) => {
      vi.stubGlobal("document", {
        createElement: () => ({
          width: 512,
          height: 128,
          getContext: () => ({ fillRect() {}, fillText() {} }),
        }),
      });
      const scene = new T.Scene(),
        physics = new CollisionWorld();
      const supplies = new WorldResources(
        scene,
        d,
        () => 0,
        () => {},
        () => {},
      );
      physics.collect(scene, []);
      supplies.batch();
      for (const s of supplies.sites) {
        const p = physics.safeFoot(
          new T.Vector3(s.x, 0.12, s.z + 0.95),
          () => 0,
        );
        expect(physics.clearFoot(p)).toBe(true);
        const exit = physics.workExit(p, () => 0);
        expect(exit.distanceTo(p)).toBeGreaterThan(0.8);
        const moved = p.clone();
        physics.move(moved, exit.x - p.x, exit.z - p.z);
        expect(moved.distanceTo(exit)).toBeLessThan(0.05);
      }
      vi.unstubAllGlobals();
    },
  );
  it("completes the actual scene tool once, clears a held button, and restores scene depletion", () => {
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 512,
        height: 128,
        getContext: () => ({ fillRect() {}, fillText() {} }),
      }),
    });
    const done = vi.fn(),
      world = new WorldResources(
        new T.Scene(),
        "mars",
        () => 0,
        () => {},
        done,
      ),
      p = new T.Vector3(
        world.sites.find((s) => s.id === "battery-near")!.x,
        0,
        world.sites.find((s) => s.id === "battery-near")!.z + 1.3,
      );
    world.start("battery-near");
    world.buttonHeld = true;
    world.update(0.1, false, p);
    expect(world.extraction).not.toBeNull();
    expect(done).not.toHaveBeenCalled();
    world.buttonHeld = false;
    for (const target of [48, 76, 36]) {
      for (let i = 0; i < 200 && world.extraction!.stable < 1.2; i++) {
        const voltage = world.extraction!.voltage;
        world.update(0.05, false, p, voltage < target ? 1 : voltage > target + 2 ? -1 : 0);
      }
      world.key("KeyE");
      world.update(0.05, false, p);
    }
    world.key("KeyE");
    for (let i = 0; i < 8; i++) world.update(0.1, false, p);
    expect(done).toHaveBeenCalledTimes(1);
    expect(world.buttonHeld).toBe(false);
    expect(world.tool.visible).toBe(false);
    world.restore(["battery-near"]);
    expect(world.start("battery-near")).toBe(false);
    world.start("ice-near");
    world.cancel();
    expect(world.gather.active).toBeNull();
    vi.unstubAllGlobals();
  });
  it("requires holding near a site for three seconds and awards it once", () => {
    const g = new Gathering();
    expect(g.start("ice-near")).toBe(true);
    for (let i = 0; i < 29; i++) expect(g.update(0.1, true, true)).toBeNull();
    expect(g.update(0.1, true, true)).toBe("ice-near");
    expect(g.start("ice-near")).toBe(false);
    expect(g.update(1, true, true)).toBeNull();
  });
  it("cancels on release or leaving, does not grant partial rewards, and restores depleted sites", () => {
    const g = new Gathering();
    for (const held of [true, false]) {
      g.start("salvage-near");
      g.update(0.1, true, true);
      expect(g.update(0.1, held, !held)).toBeNull();
      expect(g.active).toBeNull();
      expect(g.collected.size).toBe(0);
    }
    g.restore(["battery-near"]);
    expect(g.start("battery-near")).toBe(false);
    g.restore();
    expect(g.start("battery-near")).toBe(true);
    expect(g.start("invented")).toBe(false);
  });
  it("restores useful reserves with capacity limits and distinct planetary sites", () => {
    for (const d of ["moon", "mars"] as const) {
      const sites = resourceSites(d);
      expect(new Set(sites.map((s) => s.id)).size).toBe(40);
      expect(sites.filter((s) => s.kind === "ice")).toHaveLength(16);
      const s = { ...initialSim(), water: 10, battery: 10, parts: 0 };
      for (const site of sites) {
        const result = resourceReward(s, site);
        expect(
          result[
            site.kind === "ice"
              ? "water"
              : site.kind === "battery"
                ? "battery"
                : "parts"
          ],
        ).toBe(10 * (site.kind !== "salvage" ? 1 : 0) + site.amount);
      }
      const full = { ...s, water: 100, battery: 100, parts: 20 };
      for (const site of sites) {
        expect(hasResourceSpace(full, site.kind)).toBe(false);
        expect(resourceReward(full, site)).toEqual(full);
      }
    }
    expect(resourceSites("moon")[0].name).not.toBe(
      resourceSites("mars")[0].name,
    );
  });
  it("keeps legacy saves and validates site depletion without allowing duplicate or invented sites", () => {
    const save: Save = {
      version: 1,
      destination: "moon",
      sim: initialSim(),
      allocation: {
        oxygen: true,
        greenhouse: true,
        recycler: true,
        backup: false,
      },
      mission: 0,
      done: [],
      position: [0, 0.12, 4],
      inside: false,
    };
    expect(parseSave(JSON.stringify(save))).toEqual(save);
    expect(
      parseSave(JSON.stringify({ ...save, collectedResources: ["ice-near"] }))
        ?.collectedResources,
    ).toEqual(["ice-near"]);
    for (const collectedResources of [
      null,
      {},
      ["ice-near", "ice-near"],
      ["fake"],
      [3],
    ])
      expect(
        parseSave(JSON.stringify({ ...save, collectedResources })),
      ).toBeNull();
  });
});
describe("buggy stops regression", () => {
  it("fits the chassis past roadside scenery while keeping the nose and turned body solid", () => {
    const obstacle = new T.Box3(
      new T.Vector3(1.42, 0, -0.1),
      new T.Vector3(1.55, 3, 0.1),
    );
    expect(chassisOverlaps(0, 0, 0, 1.35, 1.7, obstacle)).toBe(false);
    expect(chassisOverlaps(0, 0, Math.PI / 2, 1.35, 1.7, obstacle)).toBe(true);
    const nose = new T.Box3(
      new T.Vector3(-0.1, 0, -1.7),
      new T.Vector3(0.1, 3, -1.6),
    );
    expect(chassisOverlaps(0, 0, 0, 1.18, 1.7, nose)).toBe(true);
  });
  it("rolls over small surface rocks on slopes but stops at boulders on both worlds", () => {
    for (const d of ["moon", "mars"] as const) {
      const scene = new T.Scene(),
        rocks = new T.InstancedMesh(
          new T.BoxGeometry(0.3, 0.3, 0.3),
          new T.MeshBasicMaterial(),
          1,
        );
      rocks.userData.surfaceRock = true;
      rocks.setMatrixAt(0, new T.Matrix4().makeTranslation(1.1, 1.1, 0));
      scene.add(rocks);
      const physics = new CollisionWorld();
      physics.collect(scene, []);
      const rover = new ExplorerVehicle(
        new T.Scene(),
        d,
        (x) => x * 0.7,
        physics,
        () => {},
      );
      expect(rover.clearAt(0, 0)).toBe(true);
      physics.add(
        new T.Box3(new T.Vector3(-0.5, 0, -0.5), new T.Vector3(0.5, 2, 0.5)),
      );
      expect(rover.clearAt(0, 0)).toBe(false);
    }
  });
  it("does not build invisible walls from descendants of hidden scenery", () => {
    const scene = new T.Scene(),
      hidden = new T.Group();
    hidden.visible = false;
    hidden.add(
      new T.Mesh(new T.BoxGeometry(5, 5, 5), new T.MeshBasicMaterial()),
    );
    scene.add(hidden);
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    expect(physics.count).toBe(0);
  });
  it("drives across gentle slopes with substep-relative checks and still stops at cliffs", () => {
    for (const d of ["moon", "mars"] as const) {
      const rover = new ExplorerVehicle(
        new T.Scene(),
        d,
        (_x, z) => z * 0.35,
        new CollisionWorld(),
        () => {},
      );
      let s = { x: 0, z: 0, yaw: 0, speed: 6 };
      for (let i = 0; i < 120; i++)
        s = driveStep(
          s,
          { throttle: 1, steer: 0, brake: false },
          1 / 60,
          6,
          (x, z, yaw, fx, fz) => rover.canMove(x, z, yaw, fx, fz),
        );
      expect(s.z).toBeLessThan(-10);
      expect(s.speed).toBe(6);
      const cliff = new ExplorerVehicle(
        new T.Scene(),
        d,
        (_x, z) => (z < 0 ? 4 : 0),
        new CollisionWorld(),
        () => {},
      );
      expect(cliff.canMove(0, -0.05, 0, 0, 0.05)).toBe(false);
    }
  });
});
