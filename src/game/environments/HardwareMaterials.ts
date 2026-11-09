import * as T from "three";
import { paintedMap, paintMaterial } from "./PainterlyMaterials";
export function industrialSurface(material: T.MeshStandardMaterial, kind: "paint" | "tread" = "paint", u = 1, v = 1) {
  if (typeof window === "undefined") return;
  material.map = paintedMap(kind === "paint" ? "panel" : "basalt").clone();
  material.map.repeat.set(u, v);
  material.map.needsUpdate = true;
  material.roughness = .94;
  material.metalness = .08;
  paintMaterial(material);
}
export function hardwareMaterials() {
  const paint = new T.MeshStandardMaterial({
    color: 0xcbd2cc,
    metalness: 0.35,
    roughness: 0.63,
  });
  const navy = new T.MeshStandardMaterial({
    color: 0x263d47,
    metalness: 0.45,
    roughness: 0.55,
  });
  const metal = new T.MeshStandardMaterial({
    color: 0x9aa8ab,
    metalness: 0.82,
    roughness: 0.34,
  });
  const tread = new T.MeshStandardMaterial({
    color: 0x687677,
    metalness: 0.65,
    roughness: 0.7,
  });
  const rubber = new T.MeshStandardMaterial({
    color: 0x202a2d,
    roughness: 0.87,
  });
  const orange = new T.MeshStandardMaterial({
    color: 0xc89959,
    metalness: 0.32,
    roughness: 0.64,
  });
  industrialSurface(paint);
  industrialSurface(navy);
  industrialSurface(tread, "tread", 2, 2);
  industrialSurface(orange);
  return { paint, navy, metal, tread, rubber, orange };
}
