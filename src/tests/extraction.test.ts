import { TerrainStream } from "../game/environments/TerrainStream";
import { describe, it, expect } from "vitest";
import { Extraction } from "../game/Extraction";
import { batchStatic } from "../game/environments/StaticBatch";
import * as T from "three";
import { CollisionWorld } from "../game/CollisionWorld";
import { radioDelay } from "../game/EarthRadio";
import { initialSim, reinforceShelter } from "../simulation/engine";
import { parseSave } from "../game/Save";
import {
  terrainGeometry,
  terrainSegments,
  terrainHeight,
} from "../game/environments/Terrain";
import { resourceSites } from "../game/Resources";
import { sampleSites, robotSites } from "../game/Adventure";
import { ExplorerVehicle } from "../game/Vehicle";
describe("deliberate resource recovery", () => {
  it("keeps the rider aligned with the sloping chassis and each tire above its own surface", () => {
    const ground = (x: number, z: number) => x * 0.18 + z * 0.12;
    const scene = new T.Scene(), physics = new CollisionWorld(), rider = new T.Group();
    const car = new ExplorerVehicle(scene, "moon", ground, physics, () => {});
    car.driving = true;
    const mounts = car.wheels.map(wheel => wheel.position.clone());
    const front = car.wheels[0].getWorldPosition(new T.Vector3());
    const rock = new T.Mesh(new T.BoxGeometry(0.48, 0.3, 0.48));
    rock.userData.surfaceRock = true;
    rock.position.set(front.x, ground(front.x, front.z) + 0.15, front.z);
    const rocks = new T.Scene();
    rocks.add(rock);
    physics.collect(rocks, []);
    for (let i = 0; i < 30; i++) {
      car.update(1 / 60, { throttle: 0, steer: 0, brake: true }, rider);
      expect(rider.position.distanceTo(car.seat())).toBeLessThan(1e-6);
      expect(rider.quaternion.angleTo(car.root.quaternion)).toBeLessThan(1e-6);
      for (const [index, wheel] of car.wheels.entries()) {
        expect(wheel.position.distanceTo(mounts[index])).toBeLessThan(1e-6);
        const hub = wheel.getWorldPosition(new T.Vector3());
        expect(hub.y - 0.51).toBeGreaterThanOrEqual(ground(hub.x, hub.z) - 1e-6);
      }
      const raised = car.wheels[0].getWorldPosition(new T.Vector3());
      expect(raised.y - 0.51).toBeGreaterThanOrEqual(rock.position.y + 0.15 - 1e-6);
    }
  });
  it.each(["moon", "mars"] as const)(
    "can exit a stopped vehicle at every tested parking angle on %s",
    (d) => {
      const world = new CollisionWorld(),
        car = new ExplorerVehicle(
          new T.Scene(),
          d,
          () => 0,
          world,
          () => {},
        ),
        player = new T.Group();
      for (let i = 0; i < 16; i++) {
        car.reset();
        car.state.yaw = (i * Math.PI) / 8;
        car.root.rotation.y = car.state.yaw;
        car.driving = true;
        const point = car.exit(player.position);
        expect(point, `parking angle ${i}`).not.toBeNull();
        expect(
          car.bounds().some((b) => world.overlaps(point!.x, point!.z, b)),
        ).toBe(false);
      }
    },
  );
  it.each(["moon", "mars"] as const)(
    "keeps the school terrain efficient and aligned with the playable sites on %s",
    (d) => {
      const g = terrainGeometry(d, terrainSegments("School computer"));
      expect(g.index!.count / 3).toBeLessThan(140000);
      const terrain = new T.Mesh(
        g,
        new T.MeshBasicMaterial({ side: T.DoubleSide }),
      );
      terrain.updateMatrixWorld(true);
      const stream = new TerrainStream(new T.Scene(), d, terrain.material);
      for (const p of [
        ...resourceSites(d),
        ...sampleSites(d),
        ...robotSites(d),
        { x: 0, z: 4 },
        { x: 0, z: -10 },
      ]) {
        stream.update(p.x, p.z);
        const hit = new T.Raycaster(
          new T.Vector3(p.x, 100, p.z),
          new T.Vector3(0, -1, 0),
        ).intersectObjects([terrain, ...stream.tiles.values()])[0];
        expect(hit).toBeDefined();
        expect(
          Math.abs(hit.point.y - terrainHeight(p.x, p.z, d)),
          `${d}: ${JSON.stringify(p)}`,
        ).toBeLessThan(0.25);
      }
    },
    // Full terrain/site raycasts exceed 5s on shared CI CPUs; geometry limits
    // and every alignment assertion remain enforced. This is not a frame benchmark.
    20_000,
  );
  it("uses heat management for ice, not aiming or crank strokes", () => {
    const task = new Extraction("ice");
    for (let i = 0; i < 80; i++) task.update(0.1, 1, true, 3, 1);
    expect(task.overheated).toBe(true);
    expect(task.stage).toBe(0);
    expect(task.drilled).toBeGreaterThan(0);
    let completed = false;
    for (let i = 0; i < 200 && !completed; i++) {
      const held = task.stage === 1 ? task.released : !task.overheated;
      completed = task.update(0.1, 0, held, 3);
    }
    expect(completed).toBe(true);
    expect(task.progress).toBe(1);
    expect(task.update(0.1, 0, true, 1)).toBe(false);
  });
  it("requires stable regulation and a fresh latch input for each cell before unplugging", () => {
    const task = new Extraction("battery");
    task.key("KeyE");
    task.update(0.05, 0, true, 3);
    expect(task.cell).toBe(0);
    for (const target of [48, 76, 36]) {
      for (let i = 0; i < 200 && task.stable < 1.2; i++) {
        const trim = task.voltage < target ? 1 : task.voltage > target + 2 ? -1 : 0;
        task.update(0.05, trim, false, 3);
      }
      expect(task.stable).toBe(1.2);
      task.key("KeyE");
      task.update(0.05, 0, true, 3);
    }
    expect(task.stage).toBe(1);
    expect(task.finished).toBe(false);
    task.key("KeyE");
    for (let i = 0; i < 8; i++) task.update(0.1, 0, false, 3);
    expect(task.finished).toBe(true);
  });
  it("blocks sideways salvage until the component clears the retaining rail", () => {
    const task = new Extraction("salvage");
    for (let i = 0; i < 30; i++) task.update(0.1, 1, true, 1);
    expect(task.componentX).toBe(0);
    for (let i = 0; i < 15; i++) task.update(0.1, 0, false, 1, 1);
    expect(task.stage).toBe(1);
    for (let i = 0; i < 14; i++) task.update(0.1, 1, false, 1);
    expect(task.stage).toBe(2);
    for (let i = 0; i < 15; i++) task.update(0.1, 0, false, 1, -1);
    expect(task.finished).toBe(true);
  });
  it("keeps the same fixed collision geometry after rendering batches replace scenery", () => {
    const scene = new T.Scene(),
      root = new T.Group();
    scene.add(root);
    for (let i = 0; i < 5; i++) {
      const m = new T.Mesh(
        new T.BoxGeometry(1, 2, 1),
        new T.MeshStandardMaterial({ color: 0x345678 }),
      );
      m.position.x = i * 3;
      root.add(m);
    }
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    const count = physics.count;
    batchStatic(root);
    expect(root.children.filter((o) => o.visible)).toHaveLength(1);
    expect(physics.count).toBe(count);
    expect(physics.clearFoot(new T.Vector3(0, 0, 0))).toBe(false);
    expect(physics.clearFoot(new T.Vector3(1.5, 0, 0))).toBe(true);
  });
  it("charges shielding once and refuses an unaffordable reinforcement", () => {
    const s = initialSim(),
      result = reinforceShelter(s)!;
    expect(result.parts).toBe(s.parts - 1);
    expect(result.battery).toBe(s.battery - 6);
    expect(reinforceShelter(result)).toBeNull();
    expect(reinforceShelter({ ...s, parts: 0 })).toBeNull();
    expect(reinforceShelter({ ...s, battery: 5 })).toBeNull();
  });
  it("restores pending radio messages but rejects impossible request times", () => {
    const save = {
      version: 1,
      destination: "mars",
      sim: { ...initialSim(), time: 10 },
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
      radio: { sent: 8, used: false },
    };
    expect(parseSave(JSON.stringify(save))?.radio).toEqual(save.radio);
    expect(
      parseSave(JSON.stringify({ ...save, radio: { sent: 11, used: false } })),
    ).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, done: [0, 0] }))).toBeNull();
  });
  it("gives Mars a longer shortened round trip than the Moon", () => {
    expect(radioDelay("moon")).toBe(3);
    expect(radioDelay("mars")).toBe(24);
  });
});

