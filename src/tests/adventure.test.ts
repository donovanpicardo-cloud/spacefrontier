import { describe, it, expect, vi } from "vitest";
import * as T from "three";
import {
  initialAdventure,
  collectSample,
  repairRobot,
  deliverRobot,
  buildProject,
  remainingCooldown,
  badges,
  validAdventure,
} from "../game/Adventure";
import { initialSim, power, tick } from "../simulation/engine";
import { CollisionWorld } from "../game/CollisionWorld";
import { ExplorerVehicle } from "../game/Vehicle";
import { WorldAdventure } from "../game/WorldAdventure";
import { airlockDoorOpen } from "../game/Airlock";
import { buildHabitat } from "../game/habitats/Habitat";
import { WorldRepairs } from "../game/WorldRepairs";
import { parseSave, type Save } from "../game/Save";
const canvas = () => {
  const ctx = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      measureText: () => ({ width: 30 }),
    },
    { get: (o, k) => (k in o ? o[k as keyof typeof o] : () => {}) },
  );
  return { width: 512, height: 128, getContext: () => ctx };
};
describe("exploration economy and progression", () => {
  it("records samples once and spends research on the workshop while retaining the journal", () => {
    let a = collectSample(initialAdventure(), "sample-dark");
    expect(a.research).toBe(1);
    expect(collectSample(a, "sample-dark")).toBe(a);
    expect(collectSample(a, "fake")).toBe(a);
    expect(buildProject(a, initialSim(), "workshop")).toBeNull();
    a = collectSample(a, "sample-light");
    const built = buildProject(a, initialSim(), "workshop")!;
    expect(built.adventure.research).toBe(0);
    expect(built.adventure.samples).toHaveLength(2);
    expect(built.sim.parts).toBe(3);
    expect(buildProject(built.adventure, built.sim, "workshop")).toBeNull();
  });
  it("charges robot repair resources once and rewards only a legitimately delivered tow", () => {
    const a = initialAdventure(),
      s = initialSim();
    expect(repairRobot(a, { ...s, parts: 0 }, "scout")).toBeNull();
    expect(repairRobot(a, { ...s, battery: 7 }, "scout")).toBeNull();
    const ready = repairRobot(a, s, "scout")!;
    expect(ready.sim.parts).toBe(5);
    expect(ready.sim.battery).toBe(66);
    expect(repairRobot(ready.adventure, ready.sim, "scout")).toBeNull();
    expect(deliverRobot(ready.adventure, ready.sim, "scout")).toBeNull();
    const delivered = deliverRobot(
      { ...ready.adventure, towing: "scout" },
      ready.sim,
      "scout",
    )!;
    expect(delivered.adventure.rescued).toEqual(["scout"]);
    expect(delivered.adventure.towing).toBeNull();
    expect(delivered.sim.parts).toBe(8);
    expect(
      deliverRobot(delivered.adventure, delivered.sim, "scout"),
    ).toBeNull();
  });
  it("makes construction consume real reserves and improves generation and water recovery", () => {
    const a = initialAdventure(),
      s = initialSim(),
      allocation = {
        oxygen: true,
        greenhouse: true,
        recycler: true,
        backup: false,
      };
    const solar = buildProject(a, s, "solar")!;
    expect(solar.sim.parts).toBe(4);
    expect(solar.sim.battery).toBe(62);
    expect(power(s, allocation, "moon", ["solar"]).generated).toBeCloseTo(
      power(s, allocation, "moon").generated * 1.35,
    );
    const water = buildProject(a, s, "recycler")!;
    expect(water.sim.water).toBe(74);
    expect(
      tick(s, allocation, "mars", true, ["recycler"]).water,
    ).toBeGreaterThan(tick(s, allocation, "mars", true).water);
    expect(buildProject(a, { ...s, battery: 0 }, "solar")).toBeNull();
  });
  it("persists cooldowns, towing, projects and badges while reading old saves", () => {
    const a = {
      ...initialAdventure(),
      samples: ["sample-dark"],
      research: 1,
      readyRobots: ["scout"],
      towing: "scout",
      cooldowns: { solar: 150 },
    };
    expect(validAdventure(a)).toBe(true);
    expect(remainingCooldown(a, "solar", 120)).toBe(30);
    expect(remainingCooldown(a, "solar", 151)).toBe(0);
    expect(badges(a).find((b) => b.id === "explorer")?.earned).toBe(true);
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
      parseSave(JSON.stringify({ ...save, adventure: a }))?.adventure,
    ).toEqual(a);
    for (const bad of [
      { ...a, towing: "pip" },
      { ...a, research: -1 },
      { ...a, samples: ["fake"] },
      { ...a, rescued: ["scout"] },
      { ...a, cooldowns: { fake: 3 } },
      { ...a, upgrades: ["solar", "solar"] },
    ])
      expect(parseSave(JSON.stringify({ ...save, adventure: bad }))).toBeNull();
  });
});
describe("physical precision and task release regressions", () => {
  it("detects a vehicle fully contained in a boulder and finds clear parking outside it", () => {
    const scene = new T.Scene(),
      boulder = new T.Mesh(
        new T.SphereGeometry(5, 20, 12),
        new T.MeshBasicMaterial(),
      );
    boulder.position.y = 1;
    scene.add(boulder);
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    const car = new ExplorerVehicle(
      new T.Scene(),
      "moon",
      () => 0,
      physics,
      () => {},
    );
    expect(car.clearAt(0, 0)).toBe(false);
    const safe = car.clearParking(0, 0);
    expect(car.clearAt(safe.x, safe.y)).toBe(true);
  });
  it("has clear stances and collision-free step-away paths at all workstations on both worlds", () => {
    vi.stubGlobal("document", { createElement: canvas });
    for (const destination of ["moon", "mars"] as const) {
      const scene = new T.Scene(),
        h = buildHabitat(scene),
        repairs = new WorldRepairs(
          scene,
          destination,
          () => {},
          () => {},
        ),
        physics = new CollisionWorld();
      physics.collect(scene, h.doors);
      for (const kind of ["solar", "greenhouse", "life"] as const) {
        repairs.start(kind);
        const standing = repairs.anchor();
        standing.y = 0.12;
        expect(
          physics.clearFoot(standing),
          destination + " " + kind + " stance",
        ).toBe(true);
        const exit = physics.workExit(standing, () => 0);
        for (let i = 0; i <= 12; i++)
          expect(
            physics.clearFoot(standing.clone().lerp(exit, i / 12)),
            destination + " " + kind + " exit",
          ).toBe(true);
      }
    }
    vi.unstubAllGlobals();
  });
  it("keeps the solar servicing stance clear of the cabinet and tilted panel", () => {
    vi.stubGlobal("document", { createElement: canvas });
    const scene = new T.Scene(),
      repairs = new WorldRepairs(
        scene,
        "moon",
        () => {},
        () => {},
      );
    const cabinet = new T.Mesh(
      new T.BoxGeometry(1.1, 1.3, 0.7),
      new T.MeshBasicMaterial(),
    );
    cabinet.position.set(8.8, 0.65, -5);
    scene.add(cabinet);
    const panel = new T.Mesh(
      new T.BoxGeometry(3.1, 0.12, 2.7),
      new T.MeshBasicMaterial(),
    );
    panel.position.set(12, 1.65, -3);
    panel.rotation.x = -0.35;
    scene.add(panel);
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    repairs.start("solar");
    const standing = repairs.anchor();
    standing.y = 0.12;
    expect(physics.clearFoot(standing)).toBe(true);
    const exit = physics.safeFoot(
      standing.clone().add(new T.Vector3(0, 0, 0.9)),
      () => 0,
    );
    expect(physics.clearFoot(exit)).toBe(true);
    expect(exit.z).toBeGreaterThan(standing.z);
    vi.unstubAllGlobals();
  });
  it("allows driving in the empty corner of a diagonal beam bounding box, but stops at the actual beam", () => {
    const scene = new T.Scene(),
      beam = new T.Mesh(
        new T.CylinderGeometry(0.1, 0.1, 8.5, 10),
        new T.MeshBasicMaterial(),
      );
    beam.position.y = 1;
    beam.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      new T.Vector3(1, 0, 1).normalize(),
    );
    scene.add(beam);
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    const car = new ExplorerVehicle(
      new T.Scene(),
      "mars",
      () => 0,
      physics,
      () => {},
    );
    expect(car.clearAt(-2.3, 2.3)).toBe(true);
    expect(car.clearAt(0, 0)).toBe(false);
    const moduleCar = new ExplorerVehicle(
      new T.Scene(),
      "mars",
      () => 0,
      new CollisionWorld(),
      () => {},
    );
    const movingBox = new T.Box3().setFromObject(beam) as T.Box3 & {
      sourceMesh?: T.Mesh;
    };
    movingBox.sourceMesh = beam;
    moduleCar.dynamicObstacles = () => [movingBox];
    expect(moduleCar.clearAt(-2.3, 2.3)).toBe(true);
    expect(moduleCar.clearAt(0, 0)).toBe(false);
  });
  it("does not fill the empty middle of an arched or hollow mesh with a collision wall", () => {
    const scene = new T.Scene(),
      ring = new T.Mesh(
        new T.TorusGeometry(3, 0.1, 8, 40),
        new T.MeshBasicMaterial(),
      );
    ring.position.y = 1.5;
    scene.add(ring);
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    const car = new ExplorerVehicle(
      new T.Scene(),
      "moon",
      () => 0,
      physics,
      () => {},
    );
    expect(car.clearAt(0, 0)).toBe(true);
    expect(car.clearAt(2.8, 0)).toBe(false);
  });
  it("finds a clear standing position after an equipment task and permits walking away", () => {
    const physics = new CollisionWorld();
    physics.add(new T.Box3(new T.Vector3(-1, 0, -1), new T.Vector3(1, 3, 1)));
    const position = physics.safeFoot(new T.Vector3(0.2, 0.12, 0.2), () => 0);
    expect(physics.clearFoot(position)).toBe(true);
    const before = position.clone();
    physics.move(position, 1, 0);
    expect(position.distanceTo(before)).toBeGreaterThan(0.5);
  });
});
describe("airlock and rescue scene", () => {
  it("never opens both pressure doors and waits for the first door to actually shut", () => {
    for (const entering of [true, false])
      for (let t = 0; t <= 1; t += 0.01)
        expect(
          airlockDoorOpen(t, entering, 0, 0) &&
            airlockDoorOpen(t, entering, 1, 0),
        ).toBe(false);
    expect(airlockDoorOpen(0.8, true, 1, 0.2)).toBe(false);
    expect(airlockDoorOpen(0.8, true, 1, 0)).toBe(true);
  });
  it("encloses the airlock with solid side walls while keeping the middle walkable", () => {
    vi.stubGlobal("document", { createElement: canvas });
    const scene = new T.Scene(),
      habitat = buildHabitat(scene),
      physics = new CollisionWorld();
    physics.collect(scene, habitat.doors);
    const p = new T.Vector3(0, 0.22, -11);
    expect(physics.clearFoot(p)).toBe(true);
    physics.move(p, 3, 0);
    expect(p.x).toBeLessThan(1.1);
    vi.unstubAllGlobals();
  });
  it("requires dragging the tread and tightening it and timed captures on both scan passes", () => {
    vi.stubGlobal("document", { createElement: canvas });
    const done = vi.fn();
    const field = new WorldAdventure(new T.Scene(), "moon", () => 0, () => {}, done);
    field.start("robot", "scout");
    const pose = field.cameraPose(new T.Vector3())!;
    const camera = new T.PerspectiveCamera(49, 1, 0.08, 300);
    camera.position.copy(pose.position);
    camera.lookAt(pose.look);
    camera.updateMatrixWorld();
    field.scene.updateMatrixWorld(true);
    const track = field.tracks.get("scout")!;
    track.draw(true, false);
    const dragTo = (target: T.Object3D, start = false) => {
      const point = target.getWorldPosition(new T.Vector3()).project(camera);
      expect(Math.max(Math.abs(point.x), Math.abs(point.y))).toBeLessThan(1);
      field.dragTrack(new T.Vector2(point.x, point.y), camera, 1, start);
    };
    dragTo(track.guide);
    expect(track.fitted).toBe(0);
    dragTo(track.grip, true);
    for (let i = 0; i < 80 && !track.wrapped; i++) dragTo(track.guide);
    expect(track.wrapped).toBe(true);
    dragTo(track.guide);
    expect(done).not.toHaveBeenCalled();
    dragTo(track.grip, true);
    dragTo(track.guide);
    expect(done).toHaveBeenCalledWith({ type: "robot", id: "scout" });
    const id = field.samples[0].id;
    field.start("sample", id);
    field.capturePulse();
    expect(field.hold?.step).toBe(0);
    field.hold!.elapsed = 0.61;
    field.capturePulse();
    expect(field.hold?.step).toBe(1);
    field.capturePulse();
    expect(done).toHaveBeenCalledTimes(1);
    field.hold!.elapsed = 0.30;
    field.capturePulse();
    field.capturePulse();
    expect(done).toHaveBeenCalledTimes(2);
    expect(done).toHaveBeenCalledWith({ type: "sample", id });
    vi.unstubAllGlobals();
  });
  it("tows the real robot, returns it away from the buggy, and sends one completion event", () => {
    vi.stubGlobal("document", { createElement: canvas });
    const done = vi.fn(),
      scene = new T.Scene(),
      field = new WorldAdventure(
        scene,
        "moon",
        () => 0,
        () => {},
        done,
      ),
      car = new ExplorerVehicle(
        scene,
        "moon",
        () => 0,
        new CollisionWorld(),
        () => {},
      ),
      a = { ...initialAdventure(), readyRobots: ["scout"], towing: "scout" };
    field.sync(a, car, 0);
    expect(field.tow.visible).toBe(true);
    expect(field.robotModels.get("scout")!.position.z).toBeCloseTo(
      car.state.z + Math.cos(car.state.yaw) * 3.2,
    );
    car.state.x = -5;
    car.state.z = 1;
    car.state.speed = 0;
    field.sync(a, car, 0);
    field.update(0.1, new T.Group(), car);
    field.update(0.1, new T.Group(), car);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith({ type: "delivered", id: "scout" });
    field.sync({ ...a, towing: null, rescued: ["scout"] }, car, 0);
    expect(
      field.robotModels
        .get("scout")!
        .position.distanceTo(new T.Vector3(-5, 0, 1)),
    ).toBeGreaterThan(5);
    expect(field.tow.visible).toBe(false);
    vi.unstubAllGlobals();
  });
});
