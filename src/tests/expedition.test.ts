import { describe, expect, it, vi } from "vitest";
import { WorldRepairs } from "../game/WorldRepairs";
import * as T from "three";
import { reachArm } from "../game/ArmIK";
import {
  repairPlan,
  matchingSocket,
  angularDelta,
  socketY,
} from "../game/RepairPlan";
import { driveStep } from "../game/VehiclePhysics";
import { ExplorerVehicle } from "../game/Vehicle";
import { CollisionWorld } from "../game/CollisionWorld";
import { parseSave, type Save } from "../game/Save";
import { initialSim } from "../simulation/engine";

it.each(["moon", "mars"] as const)(
  "keeps keyboard cartridge pickup at the visible clean tray on %s",
  (destination) => {
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillText() {} }),
      }),
    });
    const done = vi.fn(),
      r = new WorldRepairs(new T.Scene(), destination, () => {}, done);
    r.start("life");
    r.key("Space");
    for (let i = 0; i < 8; i++) r.key("ArrowLeft");
    for (let i = 0; i < 7; i++) r.key("ArrowDown");
    r.key("Space");
    expect(r.cartridge).toBe(1);
    const clean = r.cartridgeMesh!;
    r.key("Space");
    expect(r.cursor.distanceTo(clean.position)).toBeLessThan(0.001);
    for (let i = 0; i < 8; i++) r.key("ArrowLeft");
    for (let i = 0; i < 7; i++) r.key("ArrowUp");
    r.key("Space");
    r.update(1);
    expect(done).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  },
);

it("completes real equipment through projected pointer drags and strokes", () => {
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillText() {} }),
    }),
  });
  const scene = new T.Scene(),
    complete = vi.fn(),
    repairs = new WorldRepairs(scene, "moon", () => {}, complete);
  const canvas = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
    }),
    setPointerCapture() {},
  } as unknown as HTMLCanvasElement;
  const camera = new T.PerspectiveCamera(52, 1280 / 720, 0.1, 300);
  const event = (p: T.Vector3) => {
    scene.updateMatrixWorld(true);
    const q = repairs.worldPoint(p).project(camera);
    return {
      clientX: (q.x + 1) * 640,
      clientY: (1 - q.y) * 360,
      pointerId: 1,
      preventDefault() {},
    } as PointerEvent;
  };
  for (const kind of ["solar", "greenhouse", "life"] as const) {
    repairs.start(kind);
    scene.updateMatrixWorld(true);
    const pose = repairs.cameraPose();
    camera.position.copy(pose.position);
    camera.lookAt(pose.look);
    camera.updateMatrixWorld(true);
    if (kind === "solar")
      for (let i = 0; i < 3; i++) {
        const p = repairs.plugs[i].position.clone();
        repairs.pointerDown(event(p), camera, canvas);
        expect(repairs.held).toBe(true);
        repairs.pointerMove(
          event(new T.Vector3(0.27, socketY(i, 3), 0.17)),
          camera,
          canvas,
        );
        repairs.pointerUp();
        expect(repairs.connected.has(i)).toBe(true);
      }
    if (kind === "greenhouse")
      for (let i = 0; i < 2; i++) {
        const x = repairs.wheels[i].position.x;
        repairs.pointerDown(
          event(new T.Vector3(x + 0.18, 0, 0.17)),
          camera,
          canvas,
        );
        for (let deg = 0; deg <= 220; deg += 10)
          repairs.pointerMove(
            event(
              new T.Vector3(
                x + Math.cos((-deg * Math.PI) / 180) * 0.18,
                Math.sin((-deg * Math.PI) / 180) * 0.18,
                0.17,
              ),
            ),
            camera,
            canvas,
          );
        repairs.pointerUp();
      }
    if (kind === "life") {
      repairs.pointerDown(event(new T.Vector3(0, 0.1, 0.17)), camera, canvas);
      repairs.pointerMove(
        event(new T.Vector3(-0.46, -0.34, 0.17)),
        camera,
        canvas,
      );
      repairs.pointerUp();
      repairs.pointerDown(
        event(new T.Vector3(0.46, -0.3, 0.17)),
        camera,
        canvas,
      );
      repairs.pointerMove(event(new T.Vector3(0, 0.1, 0.17)), camera, canvas);
      repairs.pointerUp();
    }
    repairs.update(1);
    expect(repairs.active).toBeNull();
  }
  expect(complete).toHaveBeenCalledTimes(3);
  vi.unstubAllGlobals();
});

it("runs the Mars dust prerequisite, both water valves and physical cartridge replacement", () => {
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillText() {} }),
    }),
  });
  const scene = new T.Scene(),
    done = vi.fn(),
    r = new WorldRepairs(scene, "mars", () => {}, done);
  r.start("solar");
  scene.updateMatrixWorld(true);
  r.held = true;
  for (let i = 0; i < 12; i++)
    r.applyPoint(
      new T.Vector3(
        -0.36 + (i % 4) * 0.24,
        0.18 - Math.floor(i / 4) * 0.18,
        0.2,
      ),
    );
  expect(r.stepIndex).toBe(0);
  r.update(1);
  expect(r.step.type).toBe("cables");
  expect(done).not.toHaveBeenCalled();
  for (let i = 0; i < 2; i++) {
    r.selected = i;
    r.held = true;
    r.applyPoint(new T.Vector3(0.27, socketY(i, 2), 0.2));
    r.pointerUp();
  }
  r.update(1);
  expect(done).toHaveBeenCalledTimes(1);
  r.start("greenhouse");
  scene.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) {
    r.selected = i;
    r.held = true;
    r.lastAngle = 0;
    for (let deg = 0; deg <= r.step.turns![i]; deg += 10)
      r.applyPoint(
        new T.Vector3(
          (i === 0 ? -0.3 : 0.3) + Math.cos((-deg * Math.PI) / 180) * 0.18,
          Math.sin((-deg * Math.PI) / 180) * 0.18,
          0.2,
        ),
      );
    if (i === 0) expect(r.finishIn).toBe(0);
  }
  r.update(1);
  expect(done).toHaveBeenCalledTimes(2);
  r.start("life");
  scene.updateMatrixWorld(true);
  r.held = true;
  r.applyPoint(new T.Vector3(-0.46, -0.34, 0.2));
  r.pointerUp();
  expect(r.cartridge).toBe(1);
  expect(r.finishIn).toBe(0);
  r.held = true;
  r.applyPoint(new T.Vector3(0, 0.1, 0.2));
  r.pointerUp();
  r.update(1);
  expect(done).toHaveBeenCalledTimes(3);
  r.start("solar");
  r.cancel();
  expect(r.active).toBeNull();
  r.sync({ solar: true, greenhouse: true, life: true });
  expect([...r.devices.values()].every((d) => d.fixed)).toBe(true);
  vi.unstubAllGlobals();
});

describe("repair differences between destinations", () => {
  it("gives Mars solar contacts a dust-clearing prerequisite before connecting fewer leads", () => {
    expect(repairPlan("moon", "solar").map((s) => s.type)).toEqual(["cables"]);
    expect(repairPlan("moon", "solar")[0].count).toBe(3);
    expect(repairPlan("mars", "solar").map((s) => s.type)).toEqual([
      "brush",
      "cables",
    ]);
    expect(repairPlan("mars", "solar")[1].count).toBe(2);
  });
  it("restores two handwheels and filter replacement indoors on both destinations", () => {
    expect(repairPlan("moon", "greenhouse")[0].turns).toEqual([210, 210]);
    expect(repairPlan("mars", "greenhouse")[0].turns).toEqual([180, 270]);
    expect(repairPlan("moon", "life")[0].type).toBe("cartridge");
    expect(repairPlan("mars", "life")[0].type).toBe("cartridge");
  });
  it("accepts plugs only at their own world-space socket row and handles valve angle wrap", () => {
    expect(matchingSocket(0, 3, 0.38, 0)).toBe(true);
    expect(matchingSocket(0, 3, 0.38, 0.23)).toBe(false);
    expect(matchingSocket(1, 2, -0.4, -0.115)).toBe(false);
    expect(angularDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(
      (0.2 * 180) / Math.PI,
    );
    expect(angularDelta(0, Math.PI)).toBe(0);
  });
});
describe("hands reach the actual 3D equipment", () => {
  it("reaches a target without stretching either arm segment, under a rotated parent", () => {
    const root = new T.Group();
    root.rotation.y = 0.6;
    root.position.set(3, 1, 4);
    const upper = new T.Bone(),
      lower = new T.Bone(),
      hand = new T.Bone();
    root.add(upper);
    upper.add(lower);
    lower.add(hand);
    lower.position.y = -1;
    hand.position.y = -1;
    root.updateMatrixWorld(true);
    const target = root.localToWorld(new T.Vector3(1, -1, 0.2));
    const pole = root.localToWorld(new T.Vector3(0, -1, 1));
    reachArm(upper, lower, hand, target, pole);
    expect(
      hand.getWorldPosition(new T.Vector3()).distanceTo(target),
    ).toBeLessThan(0.001);
    expect(lower.position.length()).toBe(1);
    expect(hand.position.length()).toBe(1);
  });
});
describe("drivable vehicles", () => {
  it("accelerates, steers, brakes and stops before an obstacle without tunnelling", () => {
    let s = { x: 0, z: 0, yaw: 0, speed: 0 };
    for (let i = 0; i < 60; i++)
      s = driveStep(
        s,
        { throttle: 1, steer: 0, brake: false },
        0.04,
        8,
        () => true,
      );
    expect(s.speed).toBeCloseTo(8);
    expect(s.z).toBeLessThan(-5);
    const turn = driveStep(
      s,
      { throttle: 1, steer: 1, brake: false },
      0.04,
      8,
      () => true,
    );
    expect(turn.yaw).toBeGreaterThan(s.yaw);
    expect(turn.x).toBeLessThan(s.x);
    for (let i = 0; i < 30; i++)
      s = driveStep(
        s,
        { throttle: 1, steer: 0, brake: true },
        0.04,
        8,
        () => true,
      );
    expect(s.speed).toBe(0);
    let wall = { x: 0, z: 0, yaw: 0, speed: 8 };
    for (let i = 0; i < 60; i++)
      wall = driveStep(
        wall,
        { throttle: 1, steer: 0, brake: false },
        0.04,
        8,
        (_x, z) => z >= -1,
      );
    expect(wall.z).toBeGreaterThanOrEqual(-1);
    expect(wall.speed).toBe(0);
  });
  it("crosses the former exploration boundary and can reverse", () => {
    let s = { x: 0, z: 96.9, yaw: 0, speed: 0 };
    for (let i = 0; i < 100; i++)
      s = driveStep(
        s,
        { throttle: -1, steer: 0, brake: false },
        0.04,
        6,
        () => true,
      );
    expect(s.z).toBeGreaterThan(110);
    expect(s.z).toBeGreaterThan(96.9);
  });
  it("builds distinct four- and six-wheel vehicles and supports safe boarding and exit", () => {
    const scene = new T.Scene(),
      physics = new CollisionWorld();
    const moon = new ExplorerVehicle(
        scene,
        "moon",
        () => 0,
        physics,
        () => {},
      ),
      mars = new ExplorerVehicle(
        scene,
        "mars",
        () => 0,
        physics,
        () => {},
      );
    expect(moon.wheels.length).toBe(4);
    expect(mars.wheels.length).toBe(6);
    expect(moon.name).not.toBe(mars.name);
    const player = new T.Group();
    player.position.set(-6, 0.12, 5);
    moon.enter(player.position);
    for (let i = 0; i < 35; i++)
      moon.update(0.04, { throttle: 0, steer: 0, brake: false }, player);
    expect(moon.driving).toBe(true);
    expect(player.position.distanceTo(moon.seat())).toBeLessThan(0.001);
    moon.state.speed = 2;
    expect(moon.exit(player.position)).toBeNull();
    expect(moon.driving).toBe(true);
    moon.state.speed = 0;
    expect(moon.exit(player.position)).not.toBeNull();
    for (let i = 0; i < 35; i++)
      moon.update(0.04, { throttle: 0, steer: 0, brake: false }, player);
    expect(moon.driving).toBe(false);
    expect(
      moon
        .bounds()
        .some((b) => physics.overlaps(player.position.x, player.position.z, b)),
    ).toBe(false);
  });
  it("checks vehicle footprint against buildings and refuses an obstructed exit", () => {
    const physics = new CollisionWorld();
    const rover = new ExplorerVehicle(
      new T.Scene(),
      "moon",
      () => 0,
      physics,
      () => {},
    );
    physics.add(
      new T.Box3(new T.Vector3(-20, 0, -20), new T.Vector3(20, 5, 20)),
    );
    expect(rover.canMove(-8, 4)).toBe(false);
    rover.driving = true;
    expect(rover.exit(rover.seat())).toBeNull();
    expect(rover.driving).toBe(true);
  });
});
describe("vehicle save compatibility", () => {
  it("parks clear of scenery at spawn and recovers an old blocked parking position", () => {
    const physics = new CollisionWorld();
    physics.add(new T.Box3(new T.Vector3(-10, 0, 4), new T.Vector3(-8, 3, 6)));
    const rover = new ExplorerVehicle(
      new T.Scene(),
      "mars",
      () => 0,
      physics,
      () => {},
    );
    expect(rover.canMove(rover.state.x, rover.state.z)).toBe(true);
    const player = new T.Group();
    rover.restore({ position: [-9, 0, 5], yaw: 0, riding: true }, player);
    expect(rover.canMove(rover.state.x, rover.state.z)).toBe(true);
    expect(player.position.distanceTo(rover.seat())).toBeLessThan(0.001);
  });
  const base: Save = {
    version: 1,
    destination: "mars",
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
  it("reads old on-foot saves and restores a parked or occupied vehicle", () => {
    expect(parseSave(JSON.stringify(base))).toEqual(base);
    for (const riding of [false, true]) {
      const saved = {
        ...base,
        vehicle: { position: [-12, 0.1, 16], yaw: 1.2, riding },
      };
      expect(parseSave(JSON.stringify(saved))).toEqual(saved);
    }
  });
  it("rejects corrupted vehicle positions and missing occupancy flags", () => {
    for (const vehicle of [
      null,
      { position: [1, 2], yaw: 0, riding: true },
      { position: [1_000_001, 0, 0], yaw: 0, riding: false },
      { position: [0, 0, 0], yaw: 0 },
    ])
      expect(parseSave(JSON.stringify({ ...base, vehicle }))).toBeNull();
  });
});
