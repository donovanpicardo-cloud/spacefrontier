import { rocketPad } from "../Rocket";
import * as T from "three";
import type { Destination } from "../../simulation/engine";
import { resourceSites } from "../Resources";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { photographedSurface } from "./SurfaceMaterials";
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
  const path = Math.max(Math.abs(x) - 5, Math.abs(z + 2) - 13);
  const mask = T.MathUtils.smoothstep(
    Math.min(
      habitat,
      array,
      path,
      Math.max(Math.abs(x - 12) - 6, Math.abs(z + 23) - 6),
      launchLaneDistance(x, z, d) - 3,
    ),
    0,
    9,
  );
  let h = fbm(x * 0.028, z * 0.028) * 6 + fbm(x * 0.16, z * 0.16) * 0.55;
  if (d === "moon") {
    for (const [cx, cz, r] of craters) {
      const q = Math.hypot(x - cx, z - cz) / r;
      h +=
        Math.exp(-Math.pow((q - 1) / 0.15, 2)) * r * 0.14 -
        Math.exp(-Math.pow(q / 0.76, 4)) * r * 0.19;
    }
  } else {
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
function regolith(d: Destination) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const image = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const v = 155 + hash(y * 512 + x) * 65 + noise(x * 0.04, y * 0.04) * 25;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 3500; i++) {
    const x = hash(i) * 512,
      y = hash(i + 7000) * 512,
      r = 0.3 + hash(i + 10) * 2;
    ctx.fillStyle = i % 3 ? "#32333060" : "#f1e4c844";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, i, 0, 6.28);
    ctx.fill();
  }
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(160, 160);
  texture.anisotropy = 8;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = normalCanvas.height = 512;
  const nc = normalCanvas.getContext("2d")!,
    ni = nc.createImageData(512, 512);
  const heights = ctx.getImageData(0, 0, 512, 512).data;
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const at = (a: number, b: number) =>
        heights[(((b + 512) % 512) * 512 + ((a + 512) % 512)) * 4] / 255;
      const nx = (at(x - 1, y) - at(x + 1, y)) * 0.6,
        ny = (at(x, y - 1) - at(x, y + 1)) * 0.6;
      const length = Math.hypot(nx, ny, 1),
        i = (y * 512 + x) * 4;
      ni.data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      ni.data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      ni.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      ni.data[i + 3] = 255;
    }
  nc.putImageData(ni, 0, 0);
  const normal = new T.CanvasTexture(normalCanvas);
  normal.wrapS = normal.wrapT = T.RepeatWrapping;
  normal.repeat.copy(texture.repeat);
  normal.anisotropy = 8;
  const m = new T.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: d === "moon" ? 0.035 : 0.025,
    normalMap: normal,
    normalScale: new T.Vector2(0.75, 0.75),
    roughness: 0.96,
    vertexColors: true,
  });
  photographedSurface(m, d, 260);
  return m;
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
export function buildTerrain(scene: T.Scene, d: Destination, quality = "High") {
  const segments = terrainSegments(quality),
    g = terrainGeometry(d, segments);
  const ground = new T.Mesh(g, regolith(d));
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
  const material = new T.MeshStandardMaterial({
    color: d === "moon" ? 0x666d71 : 0x865c47,
    roughness: 0.97,
  });
  photographedSurface(material, d, 1.8, true);
  const rocks = new T.InstancedMesh(lowRock, material, 2200);
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
  for (let i = 0; i < 2800 && count < 2200; i++) {
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
      [
        ...resourceSites(d),
        ...sampleSites(d),
        ...robotSites(d),
        recoveryBay,
      ].some((s) => Math.hypot(x - s.x, z - s.z) < 3)
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
  if (d === "mars") return;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const x = c.getContext("2d")!,
    im = x.createImageData(1024, 512);
  for (let y = 0; y < 512; y++)
    for (let u = 0; u < 1024; u++) {
      const i = (y * 1024 + u) * 4,
        land =
          fbm(u * 0.014, y * 0.018) + Math.sin(u * 0.008 + y * 0.01) * 0.25 >
          0.14,
        polar = Math.abs(y - 256) > 220,
        cloud = Math.max(0, fbm(u * 0.037 + 20, y * 0.045));
      const rgb = polar
        ? [193, 212, 212]
        : land
          ? [61, 101, 78]
          : [32, 85, 125];
      for (let k = 0; k < 3; k++)
        im.data[i + k] = T.MathUtils.lerp(
          rgb[k],
          230,
          Math.max(0, cloud - 0.1) * 1.5,
        );
      im.data[i + 3] = 255;
    }
  x.putImageData(im, 0, 0);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  const earth = new T.Mesh(
    new T.SphereGeometry(6.5, 48, 32),
    new T.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      emissive: 0x163452,
      emissiveIntensity: 0.25,
    }),
  );
  earth.position.set(70, 57, -160);
  earth.rotation.z = 0.25;
  scene.add(earth);
  const glow = new T.Mesh(
    new T.SphereGeometry(6.65, 40, 24),
    new T.MeshBasicMaterial({
      color: 0x5d9bc9,
      transparent: true,
      opacity: 0.13,
      side: T.BackSide,
    }),
  );
  earth.add(glow);
  const stars = new T.BufferGeometry(),
    positions = [];
  for (let i = 0; i < 900; i++) {
    const a = hash(i) * 6.28,
      b = hash(i + 1000) * 1.5;
    positions.push(
      Math.sin(a) * Math.cos(b) * 290,
      Math.sin(b) * 290,
      Math.cos(a) * Math.cos(b) * 290,
    );
  }
  stars.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  scene.add(
    new T.Points(
      stars,
      new T.PointsMaterial({
        color: 0xb8c9da,
        size: 0.13,
        transparent: true,
        opacity: 0.65,
      }),
    ),
  );
}
