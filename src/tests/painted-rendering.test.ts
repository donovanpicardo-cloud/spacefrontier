import { afterEach, describe, expect, it, vi } from "vitest";
import * as T from "three";
import { paintScene } from "../game/environments/PainterlyMaterials";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("campaign-wide authored material rendering", () => {
  it("prepares later construction and imported meshes without replacing gameplay materials or geometry", () => {
    vi.stubGlobal("window", {});
    vi.spyOn(T.TextureLoader.prototype, "load").mockReturnValue(new T.Texture());
    const scene = new T.Scene();
    const stop = paintScene(scene);
    const room = new T.Group(); scene.add(room);
    const material = new T.MeshStandardMaterial({color: 0x91be76, roughness: .42, metalness: .78});
    const geometry = new T.BoxGeometry(1, 2, 3);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(7, 2, -22); room.add(mesh);
    const originalHook = material.onBeforeCompile;
    expect(material.roughness).toBe(.42);
    expect(material.metalness).toBe(.78);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
    expect(mesh.position.toArray()).toEqual([7, 2, -22]);
    expect(material.color.getHex()).toBe(0x91be76);
    // Repair code can still change the original material reference.
    material.color.setHex(0x44aa66);
    expect(mesh.material.color.getHex()).toBe(0x44aa66);
    room.remove(mesh); room.add(mesh);
    expect(material.onBeforeCompile).toBe(originalHook);
    stop();
    const future = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial({roughness:.2}));
    room.add(future);
    expect(future.material.roughness).toBe(.2);
  });
  it("preserves emissive display maps and transparent surfaces", () => {
    vi.stubGlobal("window", {});
    vi.spyOn(T.TextureLoader.prototype, "load").mockReturnValue(new T.Texture());
    const scene = new T.Scene(), display = new T.Texture();
    const screen = new T.MeshStandardMaterial({map:display,emissiveMap:display,emissive:0xffffff});
    const glass = new T.MeshStandardMaterial({transparent:true,opacity:.3});
    scene.add(new T.Mesh(new T.PlaneGeometry(),screen),new T.Mesh(new T.PlaneGeometry(),glass));
    const stop = paintScene(scene);
    expect(screen.map).toBe(display); expect(screen.emissiveMap).toBe(display);
    expect(glass.opacity).toBe(.3); expect(glass.transparent).toBe(true);
    stop();
  });
});

