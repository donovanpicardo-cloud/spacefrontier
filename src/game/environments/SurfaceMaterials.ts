import * as T from "three";
import type { Destination } from "../../simulation/engine";

const maps = new Map<string, T.Texture>();
function surfaceMap(asset: string, kind: string) {
  const key = `${asset}-${kind}`;
  let map = maps.get(key);
  if (!map) {
    map = new T.TextureLoader().load(`/materials/${key}.jpg`);
    const mirrored = asset.startsWith("nasa-") || asset.endsWith("-surface-detail");
    map.wrapS = map.wrapT = mirrored ? T.MirroredRepeatWrapping : T.RepeatWrapping;
    map.anisotropy = 8;
    if (kind === "Diffuse") map.colorSpace = T.SRGBColorSpace;
    maps.set(key, map);
  }
  return map;
}

/** Photogrammetry soil and exposed rock, in metres rather than stretched mesh UVs.
 * Planet-specific detail fades into photographic soil as the terrain recedes. */
export function landscapeMaterial(destination: Destination, cliff = false) {
  const moon = destination === "moon";
  const material = new T.MeshStandardMaterial({
    color: 0xffffff, roughness: 1,
    side: cliff ? T.DoubleSide : T.FrontSide,
  });
  material.onBeforeCompile = shader => {
    for (const [name, asset] of [["soil", "sandy_gravel_02"], ["rock", "rock_face_03"]]) {
      const colorAsset = name === "soil" && !cliff ? `nasa-${destination}-regolith` : asset;
      shader.uniforms[name + "Color"] = { value: surfaceMap(colorAsset, "Diffuse") };
      shader.uniforms[name + "Normal"] = { value: surfaceMap(asset, "nor_gl") };
      shader.uniforms[name + "Rough"] = { value: surfaceMap(asset, "Rough") };
    }
    if (!cliff) {
      shader.uniforms.regolithDetail = {
        value: surfaceMap(`${destination}-surface-detail`, "Diffuse"),
      };
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
      ${cliff ? "" : "uniform sampler2D regolithDetail;"}
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
      float broad = texture2D(soilRough, terrainPoint.xz * .018).g;
      ${cliff ? "vec3 soil = texture2D(soilColor, soilUV).rgb;" : `
      vec2 flow = mat2(.86, -.5, .5, .86) * terrainPoint.xz;
      float soilBlend = texture2D(soilRough, flow * ${moon ? "vec2(.067)" : "vec2(.033, .088)"}).g;
      vec2 photographUV = terrainPoint.xz * ${moon ? "1.22" : ".88"};
      vec2 rotatedUV = mat2(.6, -.8, .8, .6) * photographUV * .73 + vec2(.37, .61);
      vec3 soil = mix(texture2D(soilColor, photographUV).rgb,
        texture2D(soilColor, rotatedUV).rgb, smoothstep(.24, .76, soilBlend));
      // Warp the fine pattern gently across the broader patches to break up tiling.
      vec2 detailUV = flow * ${moon ? ".66" : ".53"} + vec2(broad, soilBlend) * .32;
      vec2 alternateDetailUV = mat2(.28, -.96, .96, .28) * detailUV * .79 + vec2(.24, .67);
      vec3 detail = mix(texture2D(regolithDetail, detailUV).rgb,
        texture2D(regolithDetail, alternateDetailUV).rgb, smoothstep(.28,.72,soilBlend));
      float distanceBlend = 1. - smoothstep(13., 70., distance(cameraPosition, terrainPoint));
      soil = mix(soil, detail, distanceBlend * mix(.54, .83, soilBlend));
      soil *= ${moon
        ? "mix(vec3(.77,.79,.82),vec3(1.14,1.12,1.08),smoothstep(.22,.78,broad))"
        : "mix(vec3(.77,.72,.70),vec3(1.13,1.07,.97),smoothstep(.20,.80,broad))"};
      `}
      vec3 stone = stoneColor(rockUV, weights);
      float exposure = ${cliff ? "1." : `
        max(1. - smoothstep(.55, .92, abs(baseNormal.y)),
          smoothstep(.57, .85, soilBlend) * smoothstep(.025,.27,1. - abs(baseNormal.y)) * .48)
      `};
      float value = dot(stone, vec3(.2126,.7152,.0722));
      ${moon
        ? "stone = mix(vec3(value) * vec3(1.02,1.,.97), stone, .06) * 1.28;"
        : "stone = mix(vec3(value) * vec3(1.42,.82,.52), stone * vec3(1.12,.86,.7), .3) * 1.45;"}
      vec3 albedo = mix(soil, stone, exposure);
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
      vec3 soilN = normalize(baseNormal + vec3(grain.x,0.,grain.y) * .28);
      vec3 rockN = stoneNormal(rockUV, baseNormal, weights);
      vec3 surfaceN = normalize(mix(soilN, rockN, exposure));
      normal = normalize((viewMatrix * vec4(surfaceN,0.)).xyz) * faceDirection;
    `);
  };
  material.customProgramCacheKey = () => `photographic-geology-v5-${destination}-${cliff}`;
  return material;
}
