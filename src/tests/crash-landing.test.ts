import { afterEach, describe, expect, it, vi } from "vitest";
import * as T from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { CrashLanding } from "../game/CrashLanding";
import { ARRIVAL_DURATION } from "../game/ArrivalTimeline";
import { crashSite } from "../game/CrashSite";

afterEach(() => vi.restoreAllMocks());
describe("survivable cinematic crash", () => {
  it.each(["moon", "mars"] as const)(
    "lands a broken %s craft on terrain and completes exactly once",
    async (destination) => {
      const model = new T.Group();
      model.add(
        new T.Mesh(new T.BoxGeometry(2, 2, 2), new T.MeshStandardMaterial()),
      );
      const wing = new T.Group();
      wing.name = destination === "mars" ? "panel_l_root" : "group73";
      const part = new T.Mesh(
        new T.BoxGeometry(2, 0.1, 1),
        new T.MeshStandardMaterial(),
      );
      wing.position.x = 2;
      wing.add(part);
      model.add(wing);
      vi.spyOn(GLTFLoader.prototype, "loadAsync").mockResolvedValue({
        scene: model,
      } as unknown as GLTF);
      const scene = new T.Scene(),
        finish = vi.fn(),
        register = vi.fn();
      const crash = new CrashLanding(scene, destination, () => 0, register);
      await crash.ready;
      expect(register).toHaveBeenCalledOnce();
      const [bounds, geometry, matrix] = register.mock.calls[0];
      expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(geometry).toBeInstanceOf(T.BufferGeometry);
      expect(matrix).toBeInstanceOf(T.Matrix4);
      const camera = new T.PerspectiveCamera();
      crash.start(finish);
      crash.frame(1 / 60, camera);
      expect(crash.root.position.y).toBeGreaterThan(100);
      expect(finish).not.toHaveBeenCalled();
      for (let frame = 0; frame < (ARRIVAL_DURATION + 1) * 60; frame++)
        crash.frame(1 / 60, camera);
      expect(finish).toHaveBeenCalledOnce();
      expect(crash.root.position.x).toBe(crashSite(destination).x);
      expect(crash.root.position.z).toBe(crashSite(destination).z);
      scene.updateMatrixWorld(true);
      expect(
        new T.Box3().setFromObject(model, true).min.y,
      ).toBeGreaterThanOrEqual(0);
      expect(wing.parent?.parent).toBe(scene);
      expect(
        wing.getWorldPosition(new T.Vector3()).distanceTo(crash.root.position),
      ).toBeGreaterThan(3);
      expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
      // A replay reassembles and breaks the same pieces without duplicating them.
      const objects = scene.children.length;
      crash.start(finish);
      for (let frame = 0; frame < (ARRIVAL_DURATION + 1) * 60; frame++)
        crash.frame(1 / 60, camera);
      expect(finish).toHaveBeenCalledTimes(2);
      expect(scene.children.length).toBe(objects);

      // A skip uses the same settled wreck and cannot fire the handoff twice.
      const landedAt = crash.root.position.clone();
      crash.start(finish);
      crash.frame(0.1, camera);
      crash.skip(camera);
      crash.skip(camera);
      expect(crash.root.position.toArray()).toEqual(landedAt.toArray());
      expect(wing.parent?.parent).toBe(scene);
      expect(finish).toHaveBeenCalledTimes(3);
    },
  );
});

it("registers separate final-pose hull pieces instead of a solid box across empty space", async () => {
  const model = new T.Group();
  for (const x of [-3, 3]) {
    const mesh = new T.Mesh(new T.BoxGeometry(0.5, 1, 0.5), new T.MeshStandardMaterial());
    mesh.position.x = x;
    model.add(mesh);
  }
  vi.spyOn(GLTFLoader.prototype, "loadAsync").mockResolvedValue({ scene: model } as unknown as GLTF);
  const register = vi.fn();
  const crash = new CrashLanding(new T.Scene(), "moon", () => 0, register);
  await crash.ready;
  expect(register).toHaveBeenCalledTimes(2);
  const boxes = register.mock.calls.map(([box]) => box as T.Box3);
  const center = new T.Box3().union(boxes[0]).union(boxes[1]).getCenter(new T.Vector3());
  expect(boxes.every(box => !box.containsPoint(center))).toBe(true);
  expect(boxes.every(box => box.min.y >= -1e-6)).toBe(true);
});

