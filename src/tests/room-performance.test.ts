import { describe, it, expect, vi } from "vitest";
import * as T from "three";
import { buildHabitat } from "../game/habitats/Habitat";
import { RecoveryRoom } from "../game/habitats/RecoveryRoom";
import { CollisionWorld } from "../game/CollisionWorld";
import {
  initialAdventure,
  collectSample,
  buildProject,
  validAdventure,
} from "../game/Adventure";
import { initialSim, tick } from "../simulation/engine";
import { serviceReward } from "../simulation/ServiceRewards";
import { renderRatio, RenderBudget } from "../game/RenderBudget";
import { suitMovement } from "../game/MovementTuning";
import { TerrainStream } from "../game/environments/TerrainStream";
import { wheelSurface, suspensionSupport } from "../game/VehicleTerrain";
import { parseSave } from "../game/Save";
import { habitatSkin } from "../game/habitats/HabitatSkin";
import { interiorDetail } from "../game/habitats/InteriorDetail";
import { outpostDetail } from "../game/environments/OutpostDetail";
import { WorldRepairs } from "../game/WorldRepairs";
import { ExplorerVehicle } from "../game/Vehicle";
import { navigationTarget } from "../game/Navigation";
const canvas = () => ({
  width: 0,
  height: 0,
  getContext: () => new Proxy(
    { createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (ctx, key) => Reflect.get(ctx, key) ?? (() => {}) },
  ),
});
describe("recovery-room expansion and useful servicing", () => {
  it("keeps the fully dressed doorway clear from the live-playtest approach", () => {
    vi.stubGlobal("document", { createElement: canvas });
    const scene = new T.Scene(),
      h = buildHabitat(scene);
    habitatSkin(scene, h.doors);
    interiorDetail(scene);
    outpostDetail(scene, false);
    new WorldRepairs(
      scene,
      "moon",
      () => {},
      () => {},
    );
    const room = new RecoveryRoom(scene),
      physics = new CollisionWorld();
    physics.collect(scene, h.doors);
    room.sync(true);
    const p = new T.Vector3(8.235, 0.13, -23.188);
    physics.move(p, 3, 0, room.bounds());
    expect(p.x).toBeGreaterThan(11);
    vi.unstubAllGlobals();
  });
  it("unlocks a saved room by spending real salvage, energy and sample research", () => {
    const a = collectSample(initialAdventure(), "sample-dark");
    const built = buildProject(a, initialSim(), "medbay")!;
    expect(built.adventure.upgrades).toContain("medbay");
    expect(validAdventure(built.adventure)).toBe(true);
    expect(built.sim.parts).toBe(3);
    expect(built.sim.battery).toBe(56);
    expect(built.adventure.research).toBe(0);
    expect(buildProject(built.adventure, built.sim, "medbay")).toBeNull();
  });
  it("opens the actual habitat wall, allows walking into the furnished room, and keeps walls solid", () => {
    vi.stubGlobal("document", { createElement: canvas });
    const scene = new T.Scene();
    buildHabitat(scene);
    const room = new RecoveryRoom(scene),
      physics = new CollisionWorld();
    physics.collect(scene, []);
    let p = new T.Vector3(6, 0.13, -23);
    physics.move(p, 6, 0, room.bounds());
    expect(p.x).toBeLessThan(6.6);
    room.sync(true);
    p = new T.Vector3(6, 0.13, -23);
    physics.move(p, 5.5, 0, room.bounds());
    expect(p.x).toBeGreaterThan(11.4);
    expect(room.contains(p)).toBe(true);
    const wall = p.clone();
    physics.move(wall, 10, 0, room.bounds());
    expect(wall.x).toBeLessThan(16);
    physics.move(p, -6, 0, room.bounds());
    expect(p.x).toBeLessThan(6);
    vi.unstubAllGlobals();
  });
  it("restores health and suit air only in the built powered room and consumes food/power", () => {
    const s = { ...initialSim(), health: 50, suit: 40 };
    const a = {
      oxygen: true,
      greenhouse: false,
      recycler: false,
      backup: false,
    };
    const normal = tick(s, a, "moon", true, ["medbay"]);
    const healing = tick(s, a, "moon", true, ["medbay"], true);
    expect(healing.health).toBeGreaterThan(normal.health);
    expect(healing.suit).toBeGreaterThan(normal.suit);
    expect(healing.food).toBeLessThan(normal.food);
    expect(healing.battery).toBeLessThan(normal.battery);
    expect(tick(s, a, "moon", true, [], true).health).toBe(50);
  });
  it("makes hydroponics and filter replacement grant different capped resource benefits", () => {
    const s = {
      ...initialSim(),
      oxygen: 50,
      suit: 40,
      water: 50,
      food: 50,
      crop: 20,
    };
    const water = serviceReward(s, "greenhouse"),
      air = serviceReward(s, "life");
    expect(water).toMatchObject({
      water: 58,
      food: 62,
      crop: 45,
      irrigation: true,
      oxygen: 50,
      parts: 5,
    });
    expect(air).toMatchObject({ oxygen: 68, suit: 60, water: 50, parts: 5 });
    expect(
      serviceReward({ ...s, food: 99, water: 99, crop: 99 }, "greenhouse"),
    ).toMatchObject({ food: 100, water: 100, crop: 100 });
  });
});
describe("open exploration and efficient rendering", () => {
  it("aligns the recovery-room route before turning into the doorway", () => {
    const room = { id: "medbay", x: 11.2, z: -23 };
    expect(navigationTarget({ x: 0, z: -21.5 }, true, room)).toMatchObject({
      x: 0,
      z: -23,
      phase: "room-align",
    });
    expect(navigationTarget({ x: 0, z: -23 }, true, room)).toMatchObject({
      x: 11.2,
      z: -23,
      phase: "room-enter",
    });
  });
  it.each(["moon", "mars"] as const)(
    "drives over classified medium rocks but stops at a large boulder on %s",
    (d) => {
      const scene = new T.Scene(),
        medium = new T.Mesh(new T.BoxGeometry(1.6, 1.3, 1.6));
      medium.position.set(0, 0.65, 0);
      medium.userData.surfaceRock = true;
      scene.add(medium);
      const large = new T.Mesh(new T.BoxGeometry(4.5, 3.2, 4.5));
      large.position.set(0, 1.6, -9);
      large.userData.surfaceRock = true;
      scene.add(large);
      const physics = new CollisionWorld();
      physics.collect(scene, []);
      const car = new ExplorerVehicle(
        scene,
        d,
        () => 0,
        physics,
        () => {},
      );
      expect(car.clearAt(0, 0, 0)).toBe(true);
      expect(car.clearAt(0, -9, 0)).toBe(false);
      expect(
        suspensionSupport(0, 0, 0, () => 0, physics).height,
      ).toBeGreaterThan(0.8);
    },
  );
  it("limits a 4K school canvas to approximately one million pixels and adapts down under load", () => {
    const ratio = renderRatio("School computer", 3840, 2160, 2);
    expect(3840 * 2160 * ratio * ratio).toBeLessThanOrEqual(1_000_001);
    const budget = new RenderBudget();
    for (let i = 0; i < 90; i++) budget.observe(40);
    expect(budget.scale).toBeCloseTo(0.9);
  });
  it("keeps a bounded set of ground tiles under the buggy beyond the old border", () => {
    const scene = new T.Scene(),
      stream = new TerrainStream(scene, "moon", new T.MeshBasicMaterial());
    stream.update(650, 400);
    expect(stream.tiles.size).toBeLessThanOrEqual(25);
    expect(stream.tiles.has("5:3")).toBe(true);
    const first = [...stream.tiles.values()][0];
    const dispose = vi.spyOn(first.geometry, "dispose");
    stream.update(1500, 1500);
    expect(dispose).toHaveBeenCalled();
    expect(stream.tiles.size).toBe(25);
  });
  it("saves and reloads positions outside the old 100 metre fence", () => {
    const s = {
      version: 1,
      destination: "moon",
      mission: 0,
      done: [],
      position: [650, 40, 400],
      inside: false,
      allocation: {
        oxygen: true,
        greenhouse: false,
        recycler: false,
        backup: false,
      },
      sim: initialSim(),
      vehicle: { position: [650, 40, 400], yaw: 0, riding: true },
    };
    expect(parseSave(JSON.stringify(s))).toMatchObject({
      position: [650, 40, 400],
      vehicle: { position: [650, 40, 400] },
    });
  });
  it("gives both planets shorter playable jumps while keeping the Moon floatier", () => {
    const moon = suitMovement("moon"),
      mars = suitMovement("mars");
    expect((2 * moon.jumpSpeed) / moon.gravity).toBeGreaterThan(
      (2 * mars.jumpSpeed) / mars.gravity,
    );
    expect((2 * moon.jumpSpeed) / moon.gravity).toBeLessThan(1.6);
  });
  it("climbs a medium boulder with a smooth wheel envelope and visible body lift", () => {
    const p = new CollisionWorld(),
      rock = new T.Box3(new T.Vector3(-1, 0, -1), new T.Vector3(1, 1.1, 1));
    p.add(rock);
    p.rollable.add(rock);
    expect(wheelSurface(0, 0, () => 0, p)).toBeCloseTo(1.1);
    expect(wheelSurface(2, 0, () => 0, p)).toBe(0);
    expect(suspensionSupport(0, 0, 0, () => 0, p).height).toBeGreaterThan(0.7);
  });
});

