import { describe, expect, it } from "vitest";
import * as T from "three";
import { HabitatLighting } from "../game/HabitatLighting";

describe("base transition lighting", () => {
  it("keeps the same four visible lights through entry, exit and quality changes", () => {
    const scene = new T.Scene();
    const sources = Array.from({ length: 8 }, (_, i) => {
      const light = new T.PointLight(0xc3e9e5, 22, 8, 2);
      light.position.set(i, 2, -14);
      scene.add(light);
      return light;
    });
    const lighting = new HabitatLighting(scene, sources);
    const position = new T.Vector3(0, 0, -14);
    for (const [inside, limit] of [
      [false, 4],
      [true, 4],
      [true, 1],
      [false, 1],
      [true, 2],
    ] as const) {
      lighting.update(position, inside, 100, limit, 1 / 60);
      const lights: T.Object3D[] = [];
      scene.traverseVisible((o) => {
        if (o instanceof T.PointLight) lights.push(o);
      });
      expect(lights).toEqual(lighting.slots);
    }
    expect(lighting.slots[0].intensity).toBeGreaterThan(0);
    for (let frame = 0; frame < 180; frame++)
      lighting.update(position, false, 100, 4, 1 / 60);
    expect(lighting.slots[0].intensity).toBeLessThan(0.001);
  });
  it("ignores fixtures in an unbuilt room and respects world-space fixture positions", () => {
    const scene = new T.Scene(),
      room = new T.Group();
    const source = new T.PointLight(0xffffff, 20, 7);
    source.position.set(0, 2, -14);
    room.add(source);
    room.position.x = 3;
    scene.add(room);
    const lighting = new HabitatLighting(scene, [source]);
    const position = new T.Vector3(3, 0, -14);
    room.visible = false;
    lighting.update(position, true, 100, 4, 1);
    expect(lighting.slots[0].intensity).toBe(0);
    room.visible = true;
    lighting.update(position, true, 100, 4, 1);
    expect(lighting.slots[0].position.toArray()).toEqual([3, 2, -14]);
    expect(lighting.slots[0].intensity).toBeGreaterThan(30);
  });
});
