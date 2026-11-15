import { isEngineeringMap, applyEngineeringFinish } from "./EngineeringFinish";
import * as T from "three";

export type PaintedSurface = "regolith" | "cliff" | "panel" | "basalt";
/** Four shared 1K maps; no normal/roughness stacks or screen-space effects. */
const maps = new Map<PaintedSurface, T.Texture>();
const sharedPaintMaps = new WeakSet<T.Texture>();
export function isSharedPaintMap(texture: T.Texture) {
  return sharedPaintMaps.has(texture) || isEngineeringMap(texture);
}
export function paintedMap(kind: PaintedSurface) {
  let texture = maps.get(kind);
  if (!texture) {
    texture = new T.TextureLoader().load(`/materials/painted/${kind}.jpg`);
    texture.name = `Frontier gouache / ${kind}`;
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 4;
    maps.set(kind, texture);
    sharedPaintMaps.add(texture);
  }
  return texture;
}

/** Preserve authored PBR response on imported and late-built objects. */
export function paintMaterial(material: T.Material) {
  if (!(material instanceof T.MeshStandardMaterial)) return;
  if (material.userData.surfacePrepared) return;
  material.userData.surfacePrepared = true;
  applyEngineeringFinish(material);
  for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
    if (texture) texture.anisotropy = 8;
  }
}

export function paintModel(root: T.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      paintMaterial(m);
  });
}

/** Track additions, not frames: covers later construction, robots and imported models. */
export function paintScene(scene: T.Scene) {
  const observed = new Set<T.Object3D>();
  const onAdded = (event: { child: T.Object3D }) => watch(event.child);
  const watch = (root: T.Object3D) => {
    root.traverse((o) => {
      if (o instanceof T.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          paintMaterial(m);
      if (observed.has(o)) return;
      observed.add(o);
      o.addEventListener("childadded", onAdded);
    });
  };
  watch(scene);
  return () => {
    observed.forEach((o) => o.removeEventListener("childadded", onAdded));
    observed.clear();
  };
}
