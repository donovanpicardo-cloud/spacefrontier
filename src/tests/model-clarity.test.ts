import { describe, it, expect } from "vitest";
import * as T from "three";
import { modelClarity } from "../game/ModelClarity";
import { renderRatio } from "../game/RenderBudget";
describe("model clarity", () => {
  it("improves shared texture sampling without changing geometry, UVs or normals", () => {
    const map = new T.Texture(), normal = new T.Texture();
    map.colorSpace = T.SRGBColorSpace;
    const geometry = new T.SphereGeometry(1, 16, 12);
    const positions = geometry.attributes.position.array.slice();
    const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({map,normalMap:normal}));
    modelClarity(mesh);
    expect(map.anisotropy).toBe(8);
    expect(map.minFilter).toBe(T.LinearMipmapLinearFilter);
    expect(normal.generateMipmaps).toBe(true);
    expect(map.colorSpace).toBe(T.SRGBColorSpace);
    expect(mesh.geometry.attributes.position.array).toEqual(positions);
  });
  it("renders native 1080p in Medium and supersamples all models in High/Ultra", () => {
    expect(renderRatio("Medium",1920,1080,1)).toBe(1);
    expect(renderRatio("High",1920,1080,1)).toBe(1.25);
    expect(renderRatio("Ultra",1920,1080,1)).toBe(1.5);
    expect(renderRatio("Low",3840,2160,2)**2*3840*2160).toBeCloseTo(550000);
    expect(renderRatio("School computer",3840,2160,2)**2*3840*2160).toBeCloseTo(1000000);
  });
});

