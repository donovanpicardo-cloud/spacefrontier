import * as T from "three";
import type { Destination } from "../../simulation/engine";
import { paintedMap } from "./PainterlyMaterials";

export function landscapeMaterial(destination: Destination, cliff = false) {
  const mars = destination === "mars";
  const pigment = paintedMap(cliff ? "cliff" : "regolith");
  const stone = paintedMap("cliff");
  const material = new T.MeshStandardMaterial({
    color: cliff ? (mars ? 0xcf9475 : 0xc7bba6) : mars ? 0xcc9779 : 0xc6b9a5,
    roughness: 1,
    side: cliff ? T.DoubleSide : T.FrontSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.landscapePigment = { value: pigment };
    shader.uniforms.landscapeStone = { value: stone };
    shader.vertexShader = "varying vec3 landscapePoint;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nlandscapePoint = (modelMatrix * vec4(position, 1.)).xyz;",
    );
    shader.fragmentShader = `
      uniform sampler2D landscapePigment;
      uniform sampler2D landscapeStone;
      varying vec3 landscapePoint;
      vec2 brushSeed(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
      }
      float brush(vec2 p, vec2 tile) {
        vec2 seed = brushSeed(tile);
        float angle = ${cliff
          ? (mars ? "1.57 + (seed.x - .5) * .32" : "(seed.x - .5) * .27")
          : "seed.x * 6.283185"};
        float c = cos(angle), s = sin(angle);
        mat2 orientation = mat2(c, -s, s, c) * 1.26;
        vec2 uv = orientation * (p - tile) + seed;
        return textureGrad(landscapePigment, uv, orientation * dFdx(p), orientation * dFdy(p)).r;
      }
      float brushField(vec2 p) {
        vec2 cell = floor(p), f = smoothstep(vec2(0.), vec2(1.), fract(p));
        float a = mix(brush(p, cell), brush(p, cell + vec2(1., 0.)), f.x);
        float b = mix(brush(p, cell + vec2(0., 1.)), brush(p, cell + vec2(1.)), f.x);
        return mix(a, b, f.y);
      }
    ` + shader.fragmentShader.replace("#include <map_fragment>", `
      vec2 xz = landscapePoint.xz;
      float broad = sin(xz.x * .071 + cos(xz.y * .093)) * cos(xz.y * .058 - xz.x * .019);
      vec2 strata = vec2((xz.x + xz.y * .68) * .066, landscapePoint.y * .061 + xz.y * .027);
      vec2 landscapeStrokes = ${cliff
        ? "strata"
        : "xz * .29 + vec2(sin(xz.y * .28), cos(xz.x * .21)) * .29"};
      float wash = brushField(landscapeStrokes);
      float grit = texture2D(landscapePigment, xz * 1.41 + wash * .074).g;
      float value = ${cliff ? ".44" : mars ? ".61" : ".53"} + broad * .09 +
        (wash - .30) * ${cliff ? "1.72" : "1.06"} + (grit - .26) * .31;
      ${!cliff ? `
        vec3 facing = cross(dFdx(landscapePoint), dFdy(landscapePoint));
        float up = abs(facing.y) / max(length(facing), .00001);
        float rock = 1. - smoothstep(.44, .88, up);
        float mineral = texture2D(landscapeStone, strata + wash * .06).r;
        value *= mix(1., .78 + (mineral - .23) * 1.28, rock);
      ` : ""}
      ${cliff && mars
        ? "value *= .96 + .10 * smoothstep(-.65, .8, sin(landscapePoint.y * 1.4 + broad * .6));"
        : ""}
      diffuseColor.rgb *= max(.19, value);
    `);
  };
  material.customProgramCacheKey = () => (cliff ? "landscape-cliff-" : "landscape-floor-") + destination;
  return material;
}
