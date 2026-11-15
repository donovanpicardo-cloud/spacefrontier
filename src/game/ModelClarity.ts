import * as T from "three";

/** Preserve authored normals/UVs and keep oblique surfaces crisp without shimmer. */
export function modelClarity(root: T.Object3D) {
  const seen = new Set<T.Texture>();
  root.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) {
        if (!(value instanceof T.Texture) || seen.has(value)) continue;
        seen.add(value);
        value.anisotropy = 8;
        value.minFilter = T.LinearMipmapLinearFilter;
        value.magFilter = T.LinearFilter;
        value.generateMipmaps = true;
        value.needsUpdate = true;
      }
    }
  });
}

