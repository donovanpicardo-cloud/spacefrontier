import { rocketPad } from "../Rocket";
import * as T from "three";
import type { Destination } from "../../simulation/engine";
import { resourceSites } from "../Resources";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "meshoptimizer/decoder";
import { landscapeMaterial } from "./SurfaceMaterials";
import { sampleSites, robotSites, recoveryBay } from "../Adventure";
export const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function noise(x: number, z: number) {
  const a = Math.floor(x),
    b = Math.floor(z);
  let u = x - a,
    v = z - b;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  return (
    T.MathUtils.lerp(
      T.MathUtils.lerp(hash(a + b * 157), hash(a + 1 + b * 157), u),
      T.MathUtils.lerp(hash(a + (b + 1) * 157), hash(a + 1 + (b + 1) * 157), u),
      v,
    ) *
      2 -
    1
  );
}
function fbm(x: number, z: number) {
  return (
    noise(x, z) * 0.58 +
    noise(x * 2.1, z * 2.1) * 0.27 +
    noise(x * 4.3, z * 4.3) * 0.1 +
    noise(x * 8.8, z * 8.8) * 0.05
  );
}
const craters = [
  [-24, 17, 10],
  [30, 28, 14],
  [-39, -16, 15],
  [39, -41, 11],
  [-58, 56, 21],
  [60, 67, 25],
  [-80, -70, 32],
  [96, -30, 26],
];
export function launchLaneDistance(x: number, z: number, d: Destination) {
  const start = d === "moon" ? -8 : -9;
  const t = T.MathUtils.clamp(((x - start) * 12 + (z - 5) * 21) / 585, 0, 1);
  return Math.hypot(x - (start + 12 * t), z - (5 + 21 * t));
}
function baseTerrainHeight(x: number, z: number, d: Destination) {
  const habitat = Math.max(Math.abs(x) - 9, Math.abs(z + 22) - 15);
  const array = Math.max(Math.abs(x - 16) - 12, Math.abs(z + 7) - 10);
  const path = Math.max(Math.abs(x) - 5, d === "mars" ? Math.abs(z - 2) - 17 : Math.abs(z + 2) - 13);
  const mask = T.MathUtils.smoothstep(
    Math.min(
      habitat,
      array,
      path,
      Math.max(Math.abs(x - 12) - 6, Math.abs(z + 23) - 6),
      Math.hypot(x - recoveryBay.x, z - recoveryBay.z) - 2.6,
      launchLaneDistance(x, z, d) - 3,
    ),
    0,
    9,
  );
  let h = fbm(x * 0.028, z * 0.028) * 6 + fbm(x * 0.16, z * 0.16) * 0.55;
  if (d === "moon") {
    // Nearby cells only: dense small impacts without scanning a planet-wide list.
    const cellX = Math.floor(x / 20), cellZ = Math.floor(z / 20);
    for (let ix = cellX - 1; ix <= cellX + 1; ix++) {
      for (let iz = cellZ - 1; iz <= cellZ + 1; iz++) {
        const seed = ix * 173 + iz * 7919;
        const cx = (ix + 0.2 + hash(seed) * 0.6) * 20;
        const cz = (iz + 0.2 + hash(seed + 23) * 0.6) * 20;
        const r = 2.2 + hash(seed + 53) * 3.4;
        const q = Math.hypot(x - cx, z - cz) / r;
        if (q < 1.5) h += r * (0.11 * Math.exp(-(((q - 1) / 0.19) ** 2))
          - 0.17 * Math.exp(-((q / 0.72) ** 4)));
      }
    }
    for (const [cx, cz, r] of craters) {
      const q = Math.hypot(x - cx, z - cz) / r;
      h +=
        Math.exp(-Math.pow((q - 1) / 0.15, 2)) * r * 0.14 -
        Math.exp(-Math.pow(q / 0.76, 4)) * r * 0.19;
    }
  } else {
    // Wind-shaped dune crests and elongated, eroded rocky ridges.
    const dunePhase = x * 0.24 + z * 0.09 + noise(x * 0.025, z * 0.025) * 2;
    const duneField = T.MathUtils.smoothstep(noise(x * 0.012 + 30, z * 0.014), -0.5, 0.5);
    // Keep the surveyed rover lesson's grades and reserve budget unchanged.
    const landformMask = T.MathUtils.smoothstep(Math.max(-85 - x, x + 5, -z, z - 58), 0, 16);
    h += Math.pow(0.5 + 0.5 * Math.sin(dunePhase), 2) * duneField * 2.4 * landformMask;
    const ridge = Math.exp(-((Math.sin(x * 0.037 + z * 0.014 + noise(x * 0.012, z * 0.021)) / 0.24) ** 2));
    h += ridge * (1 - duneField) * (3.5 + noise(x * 0.18, z * 0.16) * 0.7) * landformMask;
    h +=
      Math.sin(x * 0.1 + Math.sin(z * 0.035) * 3) * 0.75 +
      Math.pow(Math.abs(noise(x * 0.018, z * 0.04)), 2) * 7;
  }
  const distant = T.MathUtils.smoothstep(Math.hypot(x, z), 80, 180);
  h += distant * (12 + Math.pow(Math.abs(fbm(x * 0.019, z * 0.017)), 1.3) * 55);
  return mask === 0 ? 0 : h * mask;
}
const siteHeights = new Map<
  Destination,
  { x: number; z: number; y: number }[]
>();
export function terrainHeight(x: number, z: number, d: Destination) {
  if (!siteHeights.has(d))
    siteHeights.set(
      d,
      [...resourceSites(d), rocketPad, ...[...sampleSites(d), ...robotSites(d)].filter(s => Math.hypot(s.x, s.z) > 200)].map((s) => ({
        ...s,
        y: baseTerrainHeight(s.x, s.z, d),
      })),
    );
  let h = baseTerrainHeight(x, z, d);
  for (const site of siteHeights.get(d)!) {
    if (Math.abs(x - site.x) >= 11 || Math.abs(z - site.z) >= 11) continue;
    const r = Math.hypot(x - site.x, z - site.z);
    if (r < 11)
      h = T.MathUtils.lerp(site.y, h, T.MathUtils.smoothstep(r, 6, 11));
  }
  return h;
}
export function terrainGeometry(d: Destination, segments: number) {
  const g = new T.PlaneGeometry(650, 650, segments, segments);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position,
    colors = [];
  const low = new T.Color(d === "moon" ? 0x555b60 : 0x86523b),
    high = new T.Color(d === "moon" ? 0x969a96 : 0xc48b5e);
  for (let i = 0; i < p.count; i++) {
    const warp = (v: number) =>
      Math.sign(v) * 325 * Math.pow(Math.abs(v) / 325, 2);
    const x = warp(p.getX(i)),
      z = warp(p.getZ(i)),
      h = terrainHeight(x, z, d);
    p.setXYZ(i, x, h, z);
    g.attributes.uv.setXY(i, x / 650 + 0.5, 0.5 - z / 650);
    const v = T.MathUtils.clamp(
      0.55 + fbm(x * 0.045, z * 0.045) * 0.45 + h * 0.004,
      0,
      1,
    );
    const color = low.clone().lerp(high, v);
    colors.push(color.r, color.g, color.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
export const terrainSegments = (quality: string) =>
  quality === "Low"
    ? 140
    : quality === "School computer"
      ? 200
      : quality === "Medium"
        ? 320
        : 420;
export function setTerrainQuality(
  ground: T.Mesh,
  d: Destination,
  quality: string,
) {
  const segments = terrainSegments(quality);
  for (const item of ground.userData.scatter ?? []) {
    item.mesh.count =
      quality === "School computer" || quality === "Low"
        ? item.school
        : item.full;
    item.mesh.castShadow = false;
  }
  if (ground.userData.segments === segments) return;
  const old = ground.geometry;
  ground.geometry = terrainGeometry(d, segments);
  ground.userData.segments = segments;
  old.dispose();
}
export function buildTerrain(
  scene: T.Scene,
  d: Destination,
  quality = "High",
  disposed = () => false,
) {
  const segments = terrainSegments(quality),
    g = terrainGeometry(d, segments);
  const ground = new T.Mesh(g, landscapeMaterial(d));
  ground.receiveShadow = true;
  ground.userData.segments = segments;
  scene.add(ground);
  // Instancing keeps thousands of pebbles and weathered outcrops inexpensive.
  const rockGeometry = (detail: number) => {
    let rocky: T.BufferGeometry = new T.IcosahedronGeometry(1, detail);
    const vertices = rocky.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(vertices, i);
      const n = noise(v.x * 4 + v.y * 2, v.z * 4);
      v.multiplyScalar(1 + n * 0.17);
      vertices.setXYZ(i, v.x, v.y, v.z);
    }
    rocky.deleteAttribute("normal");
    rocky = mergeVertices(rocky, 0.0001);
    rocky.computeVertexNormals();
    return rocky;
  };
  const rocky = rockGeometry(2),
    lowRock = rockGeometry(1);
  const material = landscapeMaterial(d, true);
  const rockCount = d === "moon" ? 3800 : 2800;
  const rocks = new T.InstancedMesh(lowRock, material, rockCount);
  const largeRocks = new T.InstancedMesh(rocky, material, 60);
  largeRocks.userData.surfaceRock = true;
  largeRocks.castShadow = largeRocks.receiveShadow = true;
  rocks.userData.surfaceRock = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const dummy = new T.Object3D();
  let count = 0,
    largeCount = 0;
  const colliders: T.Mesh[] = [];
  const fieldSites = [...resourceSites(d), ...sampleSites(d), ...robotSites(d), recoveryBay];
  rocky.computeBoundingBox();
  const rockBounds = new T.Box3();
  for (let i = 0; i < rockCount + 900 && count < rockCount; i++) {
    const x = (hash(i + 1) - 0.5) * 250,
      z = (hash(i + 2040) - 0.5) * 250;
    if (
      (x > 6 && x < 19 && z > -30 && z < -16) ||
      launchLaneDistance(x, z, d) < 4 ||
      Math.hypot(x - rocketPad.x, z - rocketPad.z) < 6 ||
      Math.hypot(x - (d === "moon" ? -8 : -9), z - 5) < 6 ||
      Math.hypot(x + 20, z + 17) < 7 ||
      (Math.abs(x) < 8 && z < -7 && z > -38) ||
      (x > 7 && x < 27 && z > -21 && z < 5) ||
      (Math.abs(x) < 4 && z > -8 && z < 10) ||
      fieldSites.some((s) => Math.hypot(x - s.x, z - s.z) < 3)
    )
      continue;
    const scale =
      i < 60
        ? 0.8 + hash(i + 50) * 2.2
        : 0.045 + Math.pow(hash(i + 90), 3) * 0.6;
    dummy.position.set(x, terrainHeight(x, z, d) + scale * 0.22, z);
    dummy.scale.set(
      scale,
      scale * (0.45 + hash(i) * 0.5),
      scale * (0.65 + hash(i + 7) * 0.8),
    );
    dummy.rotation.set(
      hash(i + 4) * 0.7,
      hash(i + 20) * 6.28,
      hash(i + 2) * 0.4,
    );
    dummy.updateMatrix();
    if (i < 60) {
      rockBounds.copy(rocky.boundingBox!).applyMatrix4(dummy.matrix);
      if (fieldSites.some((site) =>
        site.x > rockBounds.min.x - 3 && site.x < rockBounds.max.x + 3 &&
        site.z > rockBounds.min.z - 3 && site.z < rockBounds.max.z + 3
      )) continue;
    }
    if (i < 60) largeRocks.setMatrixAt(largeCount++, dummy.matrix);
    else rocks.setMatrixAt(count++, dummy.matrix);
    if (scale > 1.7) {
      const proxy = new T.Mesh(rocky, material);
      proxy.position.copy(dummy.position);
      proxy.scale.copy(dummy.scale);
      proxy.rotation.copy(dummy.rotation);
      proxy.visible = false;
      scene.add(proxy);
      proxy.updateMatrixWorld();
      colliders.push(proxy);
    }
  }
  rocks.count = count;
  rocks.instanceMatrix.needsUpdate = true;
  largeRocks.count = largeCount;
  largeRocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks, largeRocks);
  {
    const boulders = d === "moon"
      ? [[-11.4, -.5, 2.65, .8], [8.7, 13.3, 3.45, -.62]]
      : [[-13.2, -.8, 3.5, -.42], [8.9, 11.8, 2.85, 1.2]];
    const proxies = boulders.map(([x, z, width, yaw]) => {
      const rock = new T.Mesh(rocky, material);
      rock.name = "Surface boulder";
      rock.position.set(x, terrainHeight(x, z, d) + width * .19, z);
      rock.scale.set(width * .47, width * .38, width * .4);
      rock.rotation.y = yaw;
      rock.castShadow = rock.receiveShadow = true;
      scene.add(rock);
      rock.updateMatrixWorld();
      colliders.push(rock);
      return rock;
    });
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load("/models/moon-boulder.glb", ({ scene: model }) => {
      if (disposed()) {
        model.traverse(object => {
          if (!(object instanceof T.Mesh)) return;
          object.geometry.dispose();
          object.material.map?.dispose();
          object.material.dispose();
        });
        return;
      }
      const bounds = new T.Box3().setFromObject(model);
      const center = bounds.getCenter(new T.Vector3());
      const size = bounds.getSize(new T.Vector3());
      model.position.set(-center.x, -bounds.min.y, -center.z);
      model.traverse(object => {
        if (!(object instanceof T.Mesh)) return;
        object.castShadow = object.receiveShadow = true;
        if (d === "mars") object.material.color.setHex(0xcf9b79);
      });
      boulders.forEach(([x, z, width, yaw], index) => {
        const rock = new T.Group();
        rock.userData.noCollision = true;
        rock.position.set(x, terrainHeight(x, z, d) - .12, z);
        rock.scale.setScalar(width / Math.max(size.x, size.z));
        rock.rotation.y = yaw;
        rock.add(model.clone());
        scene.add(rock);
        proxies[index].visible = false;
      });
    }, undefined, () => { /* Keep the procedural boulders on load failure. */ });
  }
  {
    // Distant crater escarpment: a single low-poly ribbon outside the opening routes.
    // It is scenery only; the original terrain and physics remain authoritative.
    const positions: number[] = [], indices: number[] = [];
    const mars = d === "mars";
    for (let i = 0; i <= 160; i++) {
      const angle = mars ? -3.8 + i / 160 * 2.35 : -3.67 + i / 160 * 2.85;
      const radius = mars ? 123 + noise(i * .08, 4) * 17 : 103 + noise(i * .12, 4) * 11;
      const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius - 12;
      const base = terrainHeight(x, z, d) - 1;
      const edge = Math.sin(Math.PI * i / 160);
      const rise = mars
        ? 12 + 11 * T.MathUtils.smoothstep(noise(i * .11, 13), -.41, .18)
        : 18 + noise(i * .14, 8) * 7 + noise(i * .52, 7) * 1.6;
      const top = base + rise * Math.min(1, edge * 5);
      const section: number[][] = [];
      for (let layer = 0; layer <= 8; layer++) {
        const t = layer / 8;
        const fracture = noise(i * .21, layer * 1.7);
        section.push([1 + t * .045 + fracture * .018 * Math.sin(t * Math.PI),
          T.MathUtils.lerp(base, top, t) + fracture * .65 * Math.sin(t * Math.PI)]);
      }
      section.push([1.2, top + 1], [1.65, terrainHeight(x * 1.65, (z + 12) * 1.65 - 12, d) - 1]);
      for (const [r,y] of section) positions.push(x * r, y, (z + 12) * r - 12);
      if (i < 160) for (let row = 0; row < 10; row++) {
        const a = i * 11 + row;
        indices.push(a, a + 11, a + 1, a + 1, a + 11, a + 12);
      }
    }
    const cliffGeometry = new T.BufferGeometry();
    cliffGeometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    cliffGeometry.setIndex(indices); cliffGeometry.computeVertexNormals();
    const cliff = new T.Mesh(cliffGeometry, landscapeMaterial(d, true));
    cliff.name = mars ? "Stratified Martian escarpment" : "Lunar crater escarpment";
    cliff.userData.noCollision = true;
    cliff.receiveShadow = true;
    scene.add(cliff);
  }
  // Fine foreground gravel helps the suit and equipment read at a human scale.
  const pebbles = new T.InstancedMesh(rockGeometry(0), material, 1200);
  pebbles.userData.surfaceRock = true;
  let used = 0;
  for (let i = 0; i < 1200; i++) {
    const x = (hash(i + 4000) - 0.5) * 90,
      z = (hash(i + 6000) - 0.5) * 90;
    if (Math.abs(x) < 6.5 && z < -9 && z > -35) continue;
    const s = 0.018 + hash(i + 400) * 0.055;
    dummy.position.set(x, terrainHeight(x, z, d) + s * 0.2, z);
    dummy.rotation.set(i, i * 0.7, i * 0.3);
    dummy.scale.set(s, s * 0.5, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(used++, dummy.matrix);
  }
  pebbles.count = used;
  pebbles.receiveShadow = true;
  scene.add(pebbles);
  ground.userData.scatter = [
    { mesh: rocks, full: count, school: Math.min(count, 1100) },
    { mesh: pebbles, full: used, school: Math.min(used, 450) },
  ];
  setTerrainQuality(ground, d, quality);
  return { colliders, ground };
}
export function buildSky(scene: T.Scene, d: Destination) {
  if (d === "mars") {
    const sky = new T.Mesh(new T.SphereGeometry(32, 32, 20), new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        dustHorizon: { value: new T.Color(0xb58d72) },
        upperSky: { value: new T.Color(0x795647) },
        sunWash: { value: new T.Color(0xd5a98a) },
      },
      vertexShader: `
        varying vec3 skyRay;
        void main() {
          skyRay = position;
          gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
          gl_Position.z = gl_Position.w;
        }
      `,
      fragmentShader: `
        uniform vec3 dustHorizon, upperSky, sunWash;
        varying vec3 skyRay;
        void main() {
          vec3 ray = normalize(skyRay);
          float zenith = smoothstep(-.03, .64, ray.y);
          float glow = pow(max(0., dot(ray, normalize(vec3(-.77, .41, .49)))), 5.);
          vec3 colour = mix(dustHorizon, upperSky, zenith);
          gl_FragColor = vec4(mix(colour, sunWash, glow * .42), 1.);
          #include <colorspace_fragment>
        }
      `,
    }));
    sky.frustumCulled = false;
    sky.renderOrder = -100;
    sky.userData.noCollision = true;
    scene.add(sky);
    return;
  }
  const texture = new T.TextureLoader().load("/materials/earth-nasa.jpg");
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new T.MeshBasicMaterial({ map: texture, toneMapped: false });
  material.onBeforeCompile = shader => {
    shader.vertexShader = "varying vec3 globeNormal;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nglobeNormal = mat3(modelMatrix) * normal;",
    );
    shader.fragmentShader = "varying vec3 globeNormal;\n" + shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float phase = dot(normalize(globeNormal), normalize(vec3(-.73, .47, .57)));
      vec3 pigment = pow(diffuseColor.rgb, vec3(.68)) * vec3(.78, .84, .90);
      diffuseColor.rgb = pigment * mix(.26, 1., smoothstep(-.07, .28, phase));`,
    );
  };
  const earth = new T.Mesh(new T.SphereGeometry(5.6, 48, 32), material);
  earth.name = "Earth / NASA Blue Marble";
  earth.position.set(44, 49, -176);
  earth.rotation.set(.17, -.55, .34);
  scene.add(earth);
}
