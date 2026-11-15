import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
// Call only on immutable scenery, after collision collection. Source geometry
// remains available to the collision world; only its rendering is replaced.
export function batchStatic(root: T.Group) {
  root.updateMatrixWorld(true);
  const sets = new Map<string, { material: T.Material; meshes: T.Mesh[] }>();
  root.traverse((o) => {
    if (
      !(o instanceof T.Mesh) ||
      o instanceof T.InstancedMesh ||
      !o.visible ||
      Array.isArray(o.material)
    )
      return;
    let ancestor: T.Object3D | null = o;
    while (ancestor) {
      if (ancestor.userData.noBatch) return;
      ancestor = ancestor.parent;
    }
    const m = o.material;
    if (!(m instanceof T.MeshStandardMaterial) || m.transparent) return;
    const key = [
      m.color.getHex(),
      m.emissive.getHex(),
      m.emissiveIntensity,
      m.metalness,
      m.roughness,
      m.side,
      m.map?.uuid,
      m.aoMap?.uuid,
      m.alphaMap?.uuid,
      m.lightMap?.uuid,
      m.vertexColors,
      m.normalMap?.uuid,
      m.roughnessMap?.uuid,
      m.metalnessMap?.uuid,
      m.emissiveMap?.uuid,
      m.normalScale.x,
      m.normalScale.y,
      m.bumpMap?.uuid,
      m.bumpScale,
      m.alphaTest,
      m.flatShading,
      m.customProgramCacheKey(),
      o.castShadow,
      o.receiveShadow,
      !!o.geometry.attributes.uv,
    ].join(":");
    if (!sets.has(key)) sets.set(key, { material: m, meshes: [] });
    sets.get(key)!.meshes.push(o);
  });
  const inverse = root.matrixWorld.clone().invert();
  for (const { material, meshes } of sets.values()) {
    if (meshes.length < 3) continue;
    const geometry = meshes.map((o) => {
      const g = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      for (const attribute of Object.keys(g.attributes))
        if (!["position", "normal", "uv"].includes(attribute))
          g.deleteAttribute(attribute);
      return g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    });
    const combined = mergeGeometries(geometry);
    geometry.forEach((g) => g.dispose());
    if (!combined) continue;
    // Index identical complete vertices; retain every triangle, normal and UV seam.
    const indexed = mergeVertices(combined, 1e-6);
    combined.dispose();
    const batch = new T.Mesh(indexed, material);
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    batch.userData.noCollision = true;
    const sources: T.Mesh[] = (root.userData.batchedSources ||= []);
    meshes.forEach((o) => {
      // Invisible Object3Ds still update every frame in Three. Detach sources,
      // preserving their world matrices for the already-collected camera colliders.
      for (const child of [...o.children]) root.attach(child);
      o.removeFromParent();
      o.visible = false;
      o.matrixAutoUpdate = o.matrixWorldAutoUpdate = false;
      sources.push(o);
    });
    root.add(batch);
  }
}

export function disposeBatchSources(scene: T.Object3D) {
  scene.traverse((o) => {
    const sources = o.userData.batchedSources as T.Mesh[] | undefined;
    if (!sources) return;
    for (const source of sources) {
      source.geometry.dispose();
      for (const m of Array.isArray(source.material)
        ? source.material
        : [source.material]) {
        for (const v of Object.values(m))
          if (v instanceof T.Texture) v.dispose();
        m.dispose();
      }
    }
    sources.length = 0;
  });
}

