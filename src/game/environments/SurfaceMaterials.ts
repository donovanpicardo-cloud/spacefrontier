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
        t.minFilter = T.LinearMipmapLinearFilter;
        t.magFilter = T.LinearFilter;
        t.generateMipmaps = true;
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
      material.normalScale.setScalar(rock ? 0.24 : 0.36);
      material.onBeforeCompile = (shader) => {
        // Blend two texture scales to soften obvious repetition without more geometry.
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          #ifdef USE_MAP
            vec3 broadColor = texture2D(map, vMapUv * 0.173 + vec2(0.31, 0.67)).rgb;
            diffuseColor.rgb = mix(diffuseColor.rgb, broadColor * diffuse, ${rock ? "0.12" : "0.32"});
          #endif
          ${destination === "moon"
            ? "float lunarLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));diffuseColor.rgb=vec3(lunarLuma)*vec3(0.96,0.985,1.02);"
            : "diffuseColor.rgb *= vec3(1.04,0.97,0.90);"}`,
        ).replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          float surfaceDetail = mix(0.9, 0.18, smoothstep(10.0, 85.0, length(vViewPosition)));
          normal = normalize(mix(nonPerturbedNormal, normal, surfaceDetail));`,
        );
      };
      material.customProgramCacheKey = () => `frontier-surface-polish-v2-${destination}-${rock}`;
      material.needsUpdate = true;
      previousMap?.dispose();
      previousNormal?.dispose();
    })
    .catch(() => {
      /* Generated regolith remains available if an optional art asset cannot load. */
    });
}
