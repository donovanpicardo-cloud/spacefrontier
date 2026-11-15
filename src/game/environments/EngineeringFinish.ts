import * as T from "three";

const textures = new Map<string, T.Texture>();
/** Shared locally hosted PBR maps. These retain real scratches and edge wear. */
function finishMap(kind: "color" | "normal" | "roughness") {
  let texture = textures.get(kind);
  if (!texture) {
    texture = new T.TextureLoader().load(`/materials/blue_metal_plate_${kind}.jpg`);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 8;
    if (kind === "color") texture.colorSpace = T.SRGBColorSpace;
    texture.userData.engineeringCoating = true;
    textures.set(kind, texture);
  }
  return texture;
}
export function engineeringMap() { return finishMap("color"); }
export function isEngineeringMap(texture: T.Texture) { return [...textures.values()].includes(texture); }

/** Neutralize the source blue paint, retaining photographic abrasion and grime.
 * Normal and roughness maps stay in data space and match each material's UV scale. */
export function applyEngineeringFinish(material: T.MeshStandardMaterial) {
  if (!material.map?.userData.engineeringCoating || material.userData.engineeringInstalled) return;
  material.userData.engineeringInstalled = true;
  for (const kind of ["normal", "roughness"] as const) {
    const map = finishMap(kind).clone();
    map.repeat.copy(material.map.repeat);
    map.needsUpdate = true;
    if (kind === "normal") material.normalMap = map;
    else material.roughnessMap = map;
  }
  material.normalScale.set(.65, .65);
  material.roughness = .82;
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
      #ifdef USE_MAP
        vec4 coating = texture2D(map, vMapUv);
        float wear = dot(coating.rgb, vec3(.2126,.7152,.0722));
        diffuseColor.rgb *= vec3(clamp(sqrt(max(wear, .001)) * 1.7, .12, .95));
        diffuseColor.a *= coating.a;
      #endif
    `);
  };
  material.customProgramCacheKey = () => key + "-photographic-coating-v2";
  material.needsUpdate = true;
}
