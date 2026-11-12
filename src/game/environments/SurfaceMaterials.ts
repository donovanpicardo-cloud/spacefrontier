import * as T from "three";
import type { Destination } from "../../simulation/engine";

let grain: T.Texture | undefined;
function terrainGrain() {
  if (!grain) {
    grain = new T.TextureLoader().load("/materials/terrain_red_01_color.jpg");
    grain.wrapS = grain.wrapT = T.RepeatWrapping;
    grain.anisotropy = 8;
    // Read as data: derive mineral luminance rather than source hue.
  }
  return grain;
}

/** World-space three-axis rock detail avoids stretched cliff UVs.
 * Two frequencies share one existing CC0 photograph, without extra draw calls. */
export function landscapeMaterial(destination: Destination, cliff = false) {
  const mars = destination === "mars";
  const material = new T.MeshStandardMaterial({
    color: cliff ? (mars ? 0x9d6e56 : 0x777e87) : mars ? 0xb48567 : 0x999fa8,
    roughness: .96,
    side: cliff ? T.DoubleSide : T.FrontSide,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.surfaceGrain = { value: terrainGrain() };
    shader.vertexShader = "varying vec3 surfacePoint; varying vec3 surfaceNormal;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nsurfacePoint = (modelMatrix * vec4(position, 1.)).xyz; surfaceNormal = mat3(modelMatrix) * normal;",
    );
    shader.fragmentShader = `
      uniform sampler2D surfaceGrain;
      varying vec3 surfacePoint;
      varying vec3 surfaceNormal;
      float strataNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        vec4 h = vec4(dot(i, vec3(127.1,311.7,74.7))) + vec4(0.,127.1,311.7,438.8);
        vec4 a = fract(sin(h) * 43758.5453), b = fract(sin(h + 74.7) * 43758.5453);
        vec4 c = mix(a,b,f.z);
        return mix(mix(c.x,c.y,f.x),mix(c.z,c.w,f.x),f.y);
      }
      float mineral(vec2 uv) { return dot(texture2D(surfaceGrain, uv).rgb, vec3(.3,.5,.2)); }
      float rockDetail(vec3 p, vec3 weights) {
        return mineral(p.yz) * weights.x + mineral(p.xz) * weights.y + mineral(p.xy) * weights.z;
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
      vec3 weights = pow(abs(normalize(surfaceNormal)), vec3(5.));
      weights /= max(dot(weights, vec3(1.)), .0001);
      float fineGrain = rockDetail(surfacePoint * .72, weights);
      float broadGrain = rockDetail(surfacePoint * .067 + vec3(.37,.19,.71), weights);
      float fractured = strataNoise(surfacePoint * .16) * .65 + strataNoise(surfacePoint * .61) * .35;
      float geology = .64 + fractured * .62;
      float surfaceHeight = fineGrain * .45 + broadGrain * .25 + fractured * .3;
      diffuseColor.rgb *= clamp(.53 + fineGrain * .8 + broadGrain * .32, .48, 1.24) * geology;
      ${cliff ? "diffuseColor.rgb *= .9 + .1 * strataNoise(vec3(surfacePoint.x * .08, surfacePoint.y * .7, surfacePoint.z * .08));" : ""}
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", `
      #include <normal_fragment_begin>
      vec3 sigmaX = dFdx(-vViewPosition), sigmaY = dFdy(-vViewPosition);
      vec3 r1 = cross(sigmaY, normal), r2 = cross(normal, sigmaX);
      float determinant = dot(sigmaX, r1);
      float footprint = max(length(dFdx(surfacePoint)), length(dFdy(surfacePoint)));
      float relief = ${cliff ? ".1" : ".045"} * (1. - smoothstep(.08, .65, footprint));
      vec3 gradient = sign(determinant) * (dFdx(surfaceHeight) * r1 + dFdy(surfaceHeight) * r2);
      normal = normalize(abs(determinant) * normal - relief * gradient);
    `);
  };
  material.customProgramCacheKey = () => "geology-pbr-v1-" + destination + cliff;
  return material;
}
