import * as T from "three";
const photographs = new Map<string, Promise<T.Texture[]>>();
const surfaces = new Map<
  string,
  { refs: number; maps: Promise<T.Texture[]> }
>();
export function industrialSurface(
  material: T.MeshStandardMaterial,
  kind: "paint" | "tread" = "paint",
  u = 1,
  v = 1,
) {
  if (typeof window === "undefined") return;
  const asset = kind === "paint" ? "blue_metal_plate" : "metal_plate";
  if (!photographs.has(asset))
    photographs.set(
      asset,
      Promise.all(
        ["color", "normal", "roughness"].map((part) =>
          new T.TextureLoader().loadAsync(`/materials/${asset}_${part}.jpg`),
        ),
      ),
    );
  const key = asset + ":" + u + ":" + v;
  if (!surfaces.has(key))
    surfaces.set(key, {
      refs: 0,
      maps: photographs.get(asset)!.then((base) =>
        base.map((source, i) => {
          const t = source.clone();
          t.wrapS = t.wrapT = T.RepeatWrapping;
          t.repeat.set(u, v);
          t.colorSpace = i === 0 ? T.SRGBColorSpace : T.NoColorSpace;
          t.anisotropy = 8;
          t.minFilter = T.LinearMipmapLinearFilter;
          t.magFilter = T.LinearFilter;
          t.needsUpdate = true;
          return t;
        }),
      ),
    });
  const shared = surfaces.get(key)!;
  shared.refs++;
  let alive = true;
  material.addEventListener("dispose", () => {
    if (!alive) return;
    alive = false;
    shared.refs--;
    if (shared.refs === 0) {
      surfaces.delete(key);
      void shared.maps.then((m) => m.forEach((t) => t.dispose()));
    }
  });
  void shared.maps
    .then((maps) => {
      if (!alive) return;
      material.map = maps[0];
      material.normalMap = maps[1];
      material.roughnessMap = maps[2];
      material.normalScale.setScalar(kind === "tread" ? 0.36 : 0.16);
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `vec3 hardwarePaint=diffuseColor.rgb;\n#include <map_fragment>\nfloat hardwareWear=dot(texture2D(map,vMapUv).rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=hardwarePaint*mix(0.84,1.08,smoothstep(0.08,0.85,hardwareWear));`,
        );
      };
      material.customProgramCacheKey = () => `frontier-hardware-polish-v2-${kind}`;
      material.needsUpdate = true;
    })
    .catch(() => {
      /* Plain metal remains if an optional photographic map is unavailable. */
    });
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
