import * as T from "three";
import type { Destination } from "../../simulation/engine";

const maps = new Map<string, T.Texture>();
function surfaceMap(asset: string, kind: string) {
  const key = `${asset}-${kind}`;
  let map = maps.get(key);
  if (!map) {
    map = new T.TextureLoader().load(`/materials/${key}.jpg`);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 8;
    if (kind === "Diffuse") map.colorSpace = T.SRGBColorSpace;
    maps.set(key, map);
  }
  return map;
}

/** Photogrammetry soil and exposed rock, in metres rather than stretched mesh UVs.
 * Full albedo contrast, tangent normals and roughness survive the lighting pass. */
export function landscapeMaterial(destination: Destination, cliff = false) {
  const material = new T.MeshStandardMaterial({
    color: 0xffffff, roughness: 1,
    side: cliff ? T.DoubleSide : T.FrontSide,
  });
  material.onBeforeCompile = shader => {
    for (const [name, asset] of [["soil", "sandy_gravel_02"], ["rock", "rock_face_03"]]) {
      shader.uniforms[name + "Color"] = { value: surfaceMap(asset, "Diffuse") };
      shader.uniforms[name + "Normal"] = { value: surfaceMap(asset, "nor_gl") };
      shader.uniforms[name + "Rough"] = { value: surfaceMap(asset, "Rough") };
    }
    shader.vertexShader = "varying vec3 terrainPoint; varying vec3 terrainNormal;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>", `#include <begin_vertex>
        vec4 surfaceVertex = vec4(position, 1.);
        vec3 surfaceNormal = normal;
        #ifdef USE_INSTANCING
          surfaceVertex = instanceMatrix * surfaceVertex;
          surfaceNormal = mat3(instanceMatrix) * surfaceNormal;
        #endif
        terrainPoint = (modelMatrix * surfaceVertex).xyz;
        terrainNormal = normalize(mat3(modelMatrix) * surfaceNormal);
      `,
    );
    shader.fragmentShader = `
      uniform sampler2D soilColor, soilNormal, soilRough;
      uniform sampler2D rockColor, rockNormal, rockRough;
      varying vec3 terrainPoint, terrainNormal;
      vec3 terrainWeights(vec3 n) {
        vec3 w = pow(abs(n), vec3(6.)); return w / max(dot(w,vec3(1.)), .0001);
      }
      vec3 stoneColor(vec3 p, vec3 w) {
        return texture2D(rockColor,p.zy).rgb*w.x + texture2D(rockColor,p.xz).rgb*w.y + texture2D(rockColor,p.xy).rgb*w.z;
      }
      vec3 stoneNormal(vec3 p, vec3 n, vec3 w) {
        vec3 x = texture2D(rockNormal,p.zy).xyz*2.-1.;
        vec3 y = texture2D(rockNormal,p.xz).xyz*2.-1.;
        vec3 z = texture2D(rockNormal,p.xy).xyz*2.-1.;
        vec3 delta = vec3(0.,x.y,x.x)*w.x + vec3(y.x,0.,y.y)*w.y + vec3(z.x,z.y,0.)*w.z;
        return normalize(n + delta * 1.25);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
      vec3 baseNormal = normalize(terrainNormal);
      vec3 weights = terrainWeights(baseNormal);
      vec3 rockUV = terrainPoint * ${cliff ? ".12" : ".22"};
      vec2 soilUV = terrainPoint.xz * .20;
      vec3 soil = texture2D(soilColor, soilUV).rgb;
      vec3 stone = stoneColor(rockUV, weights);
      float exposure = ${cliff ? "1." : "1. - smoothstep(.55, .92, abs(baseNormal.y))"};
      vec3 albedo = mix(soil, stone, exposure);
      // Retain photographic values; only change the destination's mineral hue.
      float value = dot(albedo, vec3(.2126,.7152,.0722));
      ${destination === "moon"
        ? "albedo = mix(vec3(value) * vec3(1.02,1.,.97), albedo, .06) * 1.28;"
        : "albedo = mix(vec3(value) * vec3(1.42,.82,.52), albedo * vec3(1.12,.86,.7), .3) * 1.45;"}
      float broad = texture2D(soilRough, terrainPoint.xz * .018).g;
      diffuseColor.rgb *= albedo * mix(.8, 1.08, broad);
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `
      #include <roughnessmap_fragment>
      float soilR = texture2D(soilRough, soilUV).g;
      float stoneR = texture2D(rockRough, rockUV.xy + rockUV.z * .2).g;
      roughnessFactor = clamp(mix(soilR, stoneR, exposure), .72, 1.);
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", `
      #include <normal_fragment_begin>
      vec3 grain = texture2D(soilNormal, soilUV).xyz * 2. - 1.;
      vec3 soilN = normalize(baseNormal + vec3(grain.x,0.,grain.y) * .85);
      vec3 rockN = stoneNormal(rockUV, baseNormal, weights);
      vec3 surfaceN = normalize(mix(soilN, rockN, exposure));
      normal = normalize((viewMatrix * vec4(surfaceN,0.)).xyz) * faceDirection;
    `);
  };
  material.customProgramCacheKey = () => `photographic-geology-v3-${destination}-${cliff}`;
  return material;
}
