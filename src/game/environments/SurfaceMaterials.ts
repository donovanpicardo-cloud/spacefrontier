import * as T from "three";
import type { Destination } from "../../simulation/engine";
// Local CC0 material by Rob Tuytel / Poly Haven. Earth-analog art, not planetary scan data.
let photographs: Promise<T.Texture[]> | null = null;
function maps() {
  if (!photographs) {
    const loader = new T.TextureLoader();
    photographs = Promise.all(
      ["color", "normal", "roughness"].map((kind) =>
        loader.loadAsync("/materials/terrain_red_01_" + kind + ".jpg"),
      ),
    );
  }
  return photographs;
}
export function photographedSurface(
  material: T.MeshStandardMaterial,
  destination: Destination,
  repeat: number,
  rock = false,
) {
  if (typeof window === "undefined") return;
  let alive = true;
  material.addEventListener("dispose", () => {
    alive = false;
  });
  void maps()
    .then((base) => {
      if (!alive) return;
      const textures = base.map((source, i) => {
        const t = source.clone();
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.anisotropy = 8;
        t.colorSpace = i === 0 ? T.SRGBColorSpace : T.NoColorSpace;
        t.needsUpdate = true;
        return t;
      });
      const previousMap = material.map,
        previousNormal = material.normalMap;
      material.map = textures[0];
      material.normalMap = textures[1];
      material.roughnessMap = textures[2];
      material.bumpMap = null;
      material.vertexColors = false;
      material.color.setHex(0xffffff);
      material.roughness = 0.96;
      material.normalScale.setScalar(rock ? 0.4 : 0.8);
      if (destination === "moon") {
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            "#include <map_fragment>\nfloat lunarLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));diffuseColor.rgb=vec3(lunarLuma)*vec3(1.0,1.01,1.02);",
          );
        };
        material.customProgramCacheKey = () => "frontier-lunar-photographic-v1";
      }
      material.needsUpdate = true;
      previousMap?.dispose();
      previousNormal?.dispose();
    })
    .catch(() => {
      /* Generated regolith remains available if an optional art asset cannot load. */
    });
}
