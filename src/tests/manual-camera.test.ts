import { it, expect, vi, afterEach } from "vitest";
import { World } from "../game/World";
import { Scene, Vector3 } from "three";
afterEach(() => vi.unstubAllGlobals());
it("accumulates a full turn across drags when the browser denies pointer lock", () => {
  const canvas = {};
  vi.stubGlobal("document", { pointerLockElement: null });
  const w = Object.assign(Object.create(World.prototype) as World, {
    renderer: { domElement: canvas }, state: { playing: true, sensitivity: 1 },
    repairs: {}, resources: { gather: {} }, adventure: {}, clock: { elapsedTime: 1 },
    orbitYaw: 0, orbitPitch: 0,
  });
  const move = (movementX: number) => w.handleLook({
    target: canvas, movementX, movementY: 0,
  } as unknown as MouseEvent);
  for (let i = 0; i < 5; i++) {
    w.dragging = true;
    move(450);
    w.dragging = false;
    move(-450);
  }
  expect(w.orbitYaw).toBeCloseTo(-6.75);
});
it("keeps the camera steady during repairs while left-dragging still operates the equipment", () => {
  const canvas = {},
    pointerMove = vi.fn(),
    w = Object.create(World.prototype) as World;
  vi.stubGlobal("document", { pointerLockElement: null });
  Object.assign(w, {
    state: { playing: true, paused: false, sensitivity: 1 },
    repairs: { active: "solar", pointerMove },
    resources: { gather: { active: null } },
    adventure: { hold: null },
    renderer: { domElement: canvas },
    clock: { elapsedTime: 5 },
    repairApproach: null,
    mouseReady: true,
    puzzleOrbit: true,
    orbitYaw: 1,
    orbitPitch: 0.2,
  });
  w.handleLook({
    target: canvas,
    movementX: 2400,
    movementY: 0,
    clientX: 50,
    clientY: 50,
  } as unknown as MouseEvent);
  expect(w.orbitYaw).toBe(1);
  expect(pointerMove).not.toHaveBeenCalled();
  w.puzzleOrbit = false;
  w.handleLook({
    target: canvas,
    movementX: 100,
    movementY: 0,
  } as unknown as MouseEvent);
  expect(pointerMove).toHaveBeenCalledTimes(1);
  expect(w.orbitYaw).toBe(1);
});
it("finding a supply or requesting a hint does not steer toward the yellow trail", () => {
  const w = Object.create(World.prototype) as World;
  Object.assign(w, {
    orbitYaw: 1.7,
    orbitPitch: 0.6,
    lastGuide: "old",
    player: { root: { position: { x: 0, z: 0 } } },
    resources: {
      sites: [{ id: "ice-rim", kind: "ice", x: 150, z: 100 }],
      gather: { collected: new Set() },
    },
  });
  w.findSupply("ice", "ice-rim");
  w.focusGuide();
  expect(w.supplyTarget).toBe("ice-rim");
  expect(w.orbitYaw).toBe(1.7);
  expect(w.orbitPitch).toBe(0.6);
});

it("draws objective waypoints without rotating the camera", () => {
  const w = Object.assign(Object.create(World.prototype) as World, {
    scene: new Scene(), guideClock: 0, guidePoint: new Vector3(),
    guideRouteKey: "", guideOrigin: { x: 0, y: 0, set: () => {} },
    physics: { clearFoot: () => true }, groundHeight: () => 0,
    state: { playing: true, inside: false, guideTarget: "greenhouse" },
    player: { root: { position: new Vector3(4, 0, 6) } },
    navigationSites: () => [{ id: "greenhouse", x: 3, z: -22 }],
    yaw: 1.1, orbitYaw: 1.1, pitch: .3, orbitPitch: .3,
  });
  w.updateGuide(.2);
  expect(w.guidePoint.distanceTo(new Vector3(0, 0, -8.2))).toBeLessThan(1);
  expect(w.guideMarks?.count).toBeGreaterThan(0);
  expect([w.yaw, w.orbitYaw, w.pitch, w.orbitPitch]).toEqual([1.1, 1.1, .3, .3]);
});

