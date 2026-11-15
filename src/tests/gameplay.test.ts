import { describe, it, expect } from "vitest";
import * as T from "three";
import { CollisionWorld, BODY_HEIGHT } from "../game/CollisionWorld";

import { jumpPhase } from "../game/Jump";
const box = (a: number[], b: number[]) =>
  new T.Box3(new T.Vector3(...a), new T.Vector3(...b));
describe("solid scenery", () => {
  it("moves old overlapping save positions out of newly solid scenery while preserving clear positions", () => {
    const world = new CollisionWorld();
    const door = box([-1.2, 0, -0.08], [1.2, 3, 0.08]);
    const p = new T.Vector3(0, 0.12, -0.02);
    world.recover(p, [door]);
    expect(world.overlaps(p.x, p.z, door)).toBe(false);
    expect(p.z).toBeLessThan(-0.4);
    const clear = new T.Vector3(3, 0.12, 4);
    world.recover(clear, [door]);
    expect(clear.toArray()).toEqual([3, 0.12, 4]);
  });
  it("stops sprinting through thin walls and allows sliding along them", () => {
    const world = new CollisionWorld();
    world.add(box([1, 0, -5], [1.1, 4, 5]));
    const p = new T.Vector3(0, 0.12, 0);
    world.move(p, 8, 2);
    expect(p.x).toBeLessThanOrEqual(0.71);
    expect(p.z).toBeCloseTo(2);
  });
  it("blocks panels at head height but allows movement below genuinely high equipment", () => {
    const world = new CollisionWorld();
    world.add(box([1, 1.5, -2], [4, 1.7, 2]));
    const p = new T.Vector3(0, 0.12, 0);
    world.move(p, 3, 0);
    expect(p.x).toBeLessThan(0.8);
    const high = new CollisionWorld();
    high.add(box([1, 3, -2], [4, 3.2, 2]));
    const q = new T.Vector3(0, 0.12, 0);
    high.move(q, 3, 0);
    expect(q.x).toBeCloseTo(3);
  });
  it("lands on furniture and stops jumps at ceilings", () => {
    const world = new CollisionWorld();
    world.add(box([-1, 0, -1], [1, 1, 1]));
    const p = new T.Vector3(0, 1.1, 0);
    expect(world.vertical(p, 0.9, 0.12).y).toBeCloseTo(1.005);
    world.add(box([-1, 3, -1], [1, 3.2, 1]));
    const v = world.vertical(p, 1.5, 0.12);
    expect(v.hitCeiling).toBe(true);
    expect(v.y + BODY_HEIGHT).toBeLessThan(3.01);
  });
  it("steps onto small rubble without walking through tall objects", () => {
    const world = new CollisionWorld();
    world.add(box([0.5, 0, -1], [1, 0.2, 1]));
    const p = new T.Vector3(0, 0.12, 0);
    world.move(p, 0.8, 0);
    expect(p.x).toBeCloseTo(0.8);
    expect(world.vertical(p, 0.1, 0.12).floor).toBeCloseTo(0.205);
  });
  it("handles current door positions and lets old overlapping saves escape", () => {
    const world = new CollisionWorld();
    const door = box([1, 0, -1], [1.2, 3, 1]);
    const p = new T.Vector3(0, 0.12, 0);
    world.move(p, 2, 0, [door]);
    expect(p.x).toBeLessThan(0.8);
    world.move(p, 2, 0, []);
    expect(p.x).toBeGreaterThan(2);
    world.add(box([-1, 0, -1], [1, 2, 1]));
    const q = new T.Vector3(0.8, 0.12, 0);
    world.move(q, 1, 0);
    expect(q.x).toBeGreaterThan(1.3);
  });
  it("includes every visible instance and leaves a hollow hull walkable", () => {
    const scene = new T.Scene(),
      instances = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        new T.MeshBasicMaterial(),
        2,
      );
    instances.setMatrixAt(0, new T.Matrix4().makeTranslation(4, 0.5, 0));
    instances.setMatrixAt(1, new T.Matrix4().makeTranslation(-4, 0.5, 0));
    scene.add(instances);
    const shape = new T.Shape();
    shape.moveTo(-2, 0);
    shape.lineTo(-2, 4);
    shape.lineTo(2, 4);
    shape.lineTo(2, 0);
    shape.closePath();
    const hole = new T.Path();
    hole.moveTo(-1.8, 0.1);
    hole.lineTo(1.8, 0.1);
    hole.lineTo(1.8, 3.8);
    hole.lineTo(-1.8, 3.8);
    hole.closePath();
    shape.holes.push(hole);
    const hull = new T.Mesh(
      new T.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false }),
      new T.MeshBasicMaterial(),
    );
    scene.add(hull);
    const world = new CollisionWorld();
    world.collect(scene, []);
    expect(world.count).toBeGreaterThan(2);
    const p = new T.Vector3(0, 0.12, 2);
    world.move(p, 0, 1);
    expect(p.z).toBeCloseTo(3);
    const q = new T.Vector3(2, 0.12, 0);
    world.move(q, 3, 0);
    expect(q.x).toBeLessThan(3.3);
  });
});
it("selects distinct takeoff, rising, falling and landing animation phases", () => {
  expect(jumpPhase(true, 2, 0, 0.1)).toBe("Jump_Takeoff");
  expect(jumpPhase(false, 1, 0, 0)).toBe("Jump_Rise");
  expect(jumpPhase(false, -1, 0, 0)).toBe("Jump_Fall");
  expect(jumpPhase(true, 0, 0.2, 0)).toBe("Jump_Land");
  expect(jumpPhase(true, 0, 0, 0)).toBeNull();
});

