import * as T from "three";

export type PaintedSurface = "regolith" | "cliff" | "panel" | "basalt";
/** Four shared 1K maps; no normal/roughness stacks or screen-space effects. */
const maps = new Map<PaintedSurface, T.Texture>();
const sharedPaintMaps = new WeakSet<T.Texture>();
export function isSharedPaintMap(texture: T.Texture) {
  return sharedPaintMaps.has(texture);
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

/** Material-space brushwork works on animated, instanced and ordinary meshes.
 * Keep source UV maps and semantic colours (repair sockets, screens and plants).
 * Lighting is compressed into broad painted values without a full-screen pass.
 */
export function paintMaterial(material: T.Material) {
  if (
    typeof window === "undefined" ||
    !(material instanceof T.MeshStandardMaterial)
  )
    return;
  if (material.userData.paintInstalled === material.onBeforeCompile) return;
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  const wash = paintedMap("regolith");
  const hue = material.color.getHSL({ h: 0, s: 0, l: 0 });
  if (
    !material.map &&
    !material.emissiveMap &&
    !material.transparent &&
    hue.l > 0.25 &&
    hue.s < 0.38 &&
    material.metalness > 0.1
  )
    material.map = paintedMap("panel");
  if (material.transparent || material.emissiveMap) return;
  material.roughness = Math.max(0.87, material.roughness);
  material.metalness = Math.min(0.12, material.metalness);
  material.envMapIntensity = 0.18;
  if (material instanceof T.MeshPhysicalMaterial) {
    material.clearcoat = 0;
  }
  const hook: T.MeshStandardMaterial["onBeforeCompile"] = (
    shader,
    renderer,
  ) => {
    previous.call(material, shader, renderer);
    shader.uniforms.paintWash = { value: wash };
    shader.vertexShader = "varying vec3 paintPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\npaintPosition = position;",
    );
    shader.fragmentShader =
      "uniform sampler2D paintWash;\nvarying vec3 paintPosition;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float pigment = texture2D(paintWash, vec2(paintPosition.x + paintPosition.z * .61,
                                               paintPosition.y + paintPosition.z * .79) * .41).r;
      float originalValue = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
      diffuseColor.rgb = mix(vec3(originalValue) * vec3(1.055, 1.01, .94), diffuseColor.rgb, .73);
      diffuseColor.rgb *= mix(.92, 1.09, smoothstep(.12, .65, pigment));
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      float paintValue = dot(outgoingLight, vec3(.2126,.7152,.0722));
      float band = floor(paintValue * 7.0 + .5) / 7.0;
      float broadValue = mix(paintValue, band, .14);
      outgoingLight *= broadValue / max(paintValue, .0001);
      #include <opaque_fragment>
    `,
    );
  };
  material.onBeforeCompile = hook;
  material.customProgramCacheKey = () => previousKey + "-gouache-3";
  material.userData.paintInstalled = hook;
  material.needsUpdate = true;
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

export function paintedTerrain(
  material: T.MeshStandardMaterial,
  mars: boolean,
  repeat: number,
  rock: boolean,
) {
  if (typeof window === "undefined") return;
  const oldMap = material.map,
    oldNormal = material.normalMap;
  material.map = paintedMap(rock ? "basalt" : "regolith").clone();
  material.map.repeat.setScalar(rock ? 1 : repeat / (mars ? 8 : 4.5));
  material.map.needsUpdate = true;
  material.normalMap = null;
  material.bumpMap = null;
  material.roughnessMap = null;
  material.vertexColors = false;
  material.color.setHex(
    mars ? (rock ? 0xc39778 : 0xd2aa8b) : rock ? 0xe6dccc : 0xfff1dc,
  );
  material.roughness = 1;
  material.metalness = 0;
  material.flatShading = rock;
  oldMap?.dispose();
  oldNormal?.dispose();
  paintMaterial(material);
}
