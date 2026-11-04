import { describe, it, expect, vi } from "vitest";
import * as T from "three";
import { FramePacer } from "../game/FramePacer";
import {
  batchStatic,
  disposeBatchSources,
} from "../game/environments/StaticBatch";
import { CollisionWorld } from "../game/CollisionWorld";
import { resourceSites, Gathering } from "../game/Resources";
describe("frame pacing without losing refresh intervals", () => {
  it.each([60, 120, 144, 165, 240])(
    "retains 60 rendered frames per second at %i Hz",
    (hz) => {
      const pacer = new FramePacer();
      let count = 0;
      for (let i = 0; i < hz * 10; i++)
        if (pacer.ready((i * 1000) / hz, 1000 / 60)) count++;
      expect(count).toBeGreaterThanOrEqual(599);
      expect(count).toBeLessThanOrEqual(601);
    },
  );
  it("absorbs refresh jitter and recovers after a tab stall without a catch-up burst", () => {
    const p = new FramePacer();
    let count = 0;
    for (let i = 0; i < 600; i++)
      if (p.ready((i * 1000) / 60 + (i % 2) * 0.3, 1000 / 60)) count++;
    expect(count).toBe(600);
    expect(p.ready(25000, 1000 / 60)).toBe(true);
    expect(p.ready(25001, 1000 / 60)).toBe(false);
    expect(p.ready(25017, 1000 / 60)).toBe(true);
  });
});
describe("scenery batching preserves the world while avoiding hidden-object updates", () => {
  it("keeps every triangle, UV seam, collision and camera hit, and disposes detached sources", () => {
    const scene = new T.Scene(),
      root = new T.Group();
    scene.add(root);
    root.position.set(4, 0, 0);
    const material = new T.MeshStandardMaterial();
    const sources: T.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const m = new T.Mesh(new T.BoxGeometry(1, 2, 1), material);
      m.position.set(i * 2, 1, 0);
      root.add(m);
      sources.push(m);
    }
    const label = new T.Object3D();
    sources[0].add(label);
    label.position.set(0, 2, 0);
    const physics = new CollisionWorld();
    physics.collect(scene, []);
    const before = label.getWorldPosition(new T.Vector3());
    batchStatic(root);
    scene.updateMatrixWorld(true);
    expect(sources.every((m) => m.parent === null)).toBe(true);
    expect(
      label.getWorldPosition(new T.Vector3()).distanceTo(before),
    ).toBeLessThan(1e-6);
    const batch = root.children.find((c) => c instanceof T.Mesh) as T.Mesh;
    expect(batch.geometry.index!.count / 3).toBe(12 * 12);
    expect(batch.geometry.attributes.position.count).toBe(12 * 24);
    expect(batch.geometry.attributes.uv.count).toBe(12 * 24);
    const ray = new T.Raycaster(
      new T.Vector3(4, 1, 4),
      new T.Vector3(0, 0, -1),
    );
    expect(ray.intersectObjects(sources).length).toBeGreaterThan(0);
    expect(physics.clearFoot(new T.Vector3(4, 0.12, 0))).toBe(false);
    const dispose = vi.spyOn(sources[0].geometry, "dispose");
    disposeBatchSources(scene);
    expect(dispose).toHaveBeenCalled();
  });
  it("leaves animated branches attached and retains old depleted IDs at expanded sites", () => {
    const root = new T.Group(),
      dynamic = new T.Group();
    dynamic.userData.noBatch = true;
    root.add(dynamic);
    for (let i = 0; i < 4; i++)
      dynamic.add(
        new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial()),
      );
    batchStatic(root);
    expect(dynamic.children).toHaveLength(4);
    for (const d of ["moon", "mars"] as const) {
      const sites = resourceSites(d);
      for (const kind of ["ice", "salvage", "battery"])
        expect(sites.filter((s) => s.kind === kind)).toHaveLength(kind === "salvage" ? 8 : 16);
      const g = new Gathering();
      g.restore(["ice-near", "battery-far"]);
      expect(g.start("ice-near")).toBe(false);
      expect(g.start("ice-rim")).toBe(true);
    }
  });
});
