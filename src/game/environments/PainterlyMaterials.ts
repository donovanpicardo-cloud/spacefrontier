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
  material.metalness = Math.min(0.16, material.metalness);
  material.envMapIntensity = 0.26;
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
      "#include <lights_physical_pars_fragment>",
      T.ShaderChunk.lights_physical_pars_fragment.replace(
        "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
        `float facing = dot(geometryNormal, directLight.direction);
        float broadDiffuse = smoothstep(-.24, 1., facing);
        reflectedLight.directDiffuse += mix(dotNL, broadDiffuse, .63) *
          directLight.color * BRDF_Lambert(material.diffuseColor);`,
      ),
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 strokes = vec2(paintPosition.x + paintPosition.z * .61,
                          paintPosition.y + paintPosition.z * .79);
      float pigment = texture2D(paintWash, strokes * .73).r;
      float originalValue = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
      diffuseColor.rgb = mix(vec3(originalValue) * vec3(1.04, 1., .95), diffuseColor.rgb, .84);
      diffuseColor.rgb *= mix(.94, 1.08, smoothstep(.09, .55, pigment));
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      float paintValue = dot(outgoingLight, vec3(.2126,.7152,.0722));
      vec3 shadowPigment = vec3(.024, .019, .014) * (1. - smoothstep(.02, .32, paintValue));
      outgoingLight += diffuseColor.rgb * shadowPigment;
      #include <opaque_fragment>
    `,
    );
  };
  material.onBeforeCompile = hook;
  material.customProgramCacheKey = () => previousKey + "-gouache-4";
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
