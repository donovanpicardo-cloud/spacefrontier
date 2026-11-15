import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { hardwareMaterials } from "../environments/HardwareMaterials";

export class InteriorKit {
  root = new T.Group();
  solids: T.Mesh[] = [];
  m = hardwareMaterials();
  fabric = new T.MeshStandardMaterial({ color: 0x607d84, roughness: 0.96 });
  light = new T.MeshStandardMaterial({
    color: 0xf5ddae,
    emissive: 0xffd392,
    emissiveIntensity: 1.4,
  });
  screen = new T.MeshStandardMaterial({
    color: 0x447f87,
    emissive: 0x296572,
    emissiveIntensity: 0.6,
    roughness: 0.35,
  });
  constructor() {
    if (typeof window !== "undefined") {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#879b9d";
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 128; i += 2) {
        ctx.fillStyle = i % 4 ? "#677c7e" : "#a5b7b7";
        ctx.fillRect(i, 0, 1, 128);
        ctx.fillRect(0, i, 128, 1);
      }
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(3, 3);
      this.fabric.map = t;
      this.fabric.bumpMap = t;
      this.fabric.bumpScale = 0.006;
    }
  }
  mesh(
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    solid = false,
  ) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    o.userData.noCollision = !solid;
    this.root.add(o);
    if (solid) this.solids.push(o);
    return o;
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material = this.m.paint,
    solid = false,
  ) {
    return this.mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.17),
      m,
      x,
      y,
      z,
      solid,
    );
  }
  tube(points: number[][], r = 0.025, m: T.Material = this.m.metal) {
    return this.mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...(p as [number, number, number]))),
        ),
        12,
        r,
        6,
      ),
      m,
      0,
      0,
      0,
    );
  }
  label(
    text: string,
    x: number,
    y: number,
    z: number,
    w = 1.5,
    h = 0.25,
    rotation = 0,
  ) {
    if (typeof window === "undefined") return;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#173039";
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = "#c6e6db";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 60);
    const o = this.mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(c),
        side: T.DoubleSide,
      }),
      x,
      y,
      z,
    );
    o.rotation.y = rotation;
    return o;
  }
  monitor(x: number, y: number, z: number, w = 1) {
    this.box(x, y, z, w, 0.6, 0.11, this.m.navy);
    this.box(x, y, z + 0.062, w - 0.09, 0.48, 0.01, this.screen);
    for (let row = 0; row < 4; row++) {
      this.box(
        x - 0.21,
        y + 0.15 - row * 0.085,
        z + 0.074,
        0.28 + row * 0.07,
        0.012,
        0.006,
        this.light,
      );
      this.box(
        x + 0.3,
        y + 0.15 - row * 0.085,
        z + 0.074,
        0.04,
        0.025,
        0.008,
        this.m.orange,
      );
    }
    this.box(x, y - 0.42, z, 0.07, 0.32, 0.065, this.m.metal);
  }
  chair(x: number, z: number) {
    this.box(x, 0.72, z, 0.8, 0.2, 0.76, this.fabric);
    this.box(x, 1.19, z + 0.31, 0.79, 0.86, 0.16, this.fabric);
    this.box(x, 1.65, z + 0.31, 0.5, 0.2, 0.16, this.fabric);
    for (const side of [-1, 1]) {
      this.tube(
        [
          [x + side * 0.43, 0.62, z + 0.2],
          [x + side * 0.43, 1, z + 0.15],
          [x + side * 0.43, 1, z - 0.27],
        ],
        0.025,
      );
      this.box(
        x + side * 0.43,
        1.03,
        z - 0.06,
        0.13,
        0.075,
        0.5,
        this.m.rubber,
      );
      this.box(
        x + side * 0.32,
        1.2,
        z + 0.405,
        0.015,
        0.62,
        0.015,
        this.m.metal,
      );
    }
    this.mesh(
      new T.CylinderGeometry(0.055, 0.07, 0.42, 12),
      this.m.metal,
      x,
      0.4,
      z,
    );
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5,
        px = x + Math.cos(a) * 0.43,
        pz = z + Math.sin(a) * 0.43;
      this.tube(
        [
          [x, 0.18, z],
          [px, 0.12, pz],
        ],
        0.028,
      );
      const wheel = this.mesh(
        new T.CylinderGeometry(0.055, 0.055, 0.06, 10),
        this.m.rubber,
        px,
        0.08,
        pz,
      );
      wheel.rotation.z = Math.PI / 2;
    }
  }
  cabinet(x: number, y: number, z: number, w: number, h: number, d: number) {
    this.box(x, y, z, w, h, d, this.m.paint, true);
    for (let i = 0; i < 3; i++) {
      const cy = y - h * 0.28 + i * h * 0.28;
      this.box(x, cy, z + d * 0.51, w * 0.9, h * 0.23, 0.03, this.m.navy);
      this.box(
        x,
        cy + 0.025,
        z + d * 0.56,
        w * 0.24,
        0.045,
        0.055,
        this.m.metal,
      );
      this.box(
        x - w * 0.36,
        cy,
        z + d * 0.54,
        0.045,
        0.06,
        0.02,
        this.m.orange,
      );
    }
  }
  lamp(x: number, y: number, z: number, w = 1.4) {
    this.box(x, y, z, w, 0.12, 0.32, this.m.navy);
    this.box(x, y - 0.07, z, w - 0.12, 0.025, 0.22, this.light);
    // Cheap static pool of light; no additional shadow or point-light pass.
    const glow = this.mesh(
      new T.PlaneGeometry(w * 1.3, 1.8),
      new T.MeshBasicMaterial({
        color: 0xd0b782,
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
        side: T.DoubleSide,
      }),
      x,
      0.143,
      z,
    );
    glow.rotation.x = -Math.PI / 2;
  }
}

export function interiorDetail(scene: T.Scene) {
  const k = new InteriorKit();
  scene.add(k.root);
  k.chair(-4.4, -15.8);
  for (const x of [-5.7, -4.4, -3.1]) {
    // A recognizable keyboard, individual recessed keys, trackpad and headset.
    k.box(x, 1.53, -16.75, 0.76, 0.045, 0.28, k.m.metal);
    for (let a = 0; a < 10; a++)
      for (let b = 0; b < 3; b++)
        k.box(
          x - 0.31 + a * 0.068,
          1.557,
          -16.84 + b * 0.075,
          0.05,
          0.012,
          0.05,
          k.m.rubber,
        );
    k.box(x + 0.52, 1.53, -16.78, 0.24, 0.025, 0.29, k.m.navy);
  }
  k.tube(
    [
      [-3, 1.5, -17.1],
      [-2.8, 1.3, -17.3],
      [-2.8, 0.25, -17.5],
    ],
    0.025,
    k.m.rubber,
  );
  // Compact galley: cabinet drawers, recessed sink, curved faucet and containers.
  k.cabinet(-5.45, 0.58, -12.65, 2.45, 0.95, 0.75);
  k.box(-5.45, 1.09, -12.65, 2.6, 0.1, 0.9, k.m.metal);
  k.box(-5.85, 1.15, -12.65, 0.74, 0.025, 0.56, k.m.navy);
  k.tube(
    [
      [-5.85, 1.13, -12.95],
      [-5.85, 1.54, -12.95],
      [-5.85, 1.6, -12.6],
      [-5.85, 1.45, -12.6],
    ],
    0.024,
  );
  for (let i = 0; i < 3; i++) {
    k.mesh(
      new T.CylinderGeometry(0.09, 0.075, 0.22, 12),
      k.m.paint,
      -4.9 + i * 0.24,
      1.25,
      -12.6,
    );
    k.mesh(
      new T.TorusGeometry(0.065, 0.015, 6, 12),
      k.m.orange,
      -4.8 + i * 0.24,
      1.28,
      -12.6,
    ).rotation.y = Math.PI / 2;
  }
  k.label("GALLEY / DRINKING WATER", -5.45, 1.9, -13.08, 2.2);
  k.lamp(-5.45, 2.25, -12.65, 2.1);
  // Bedding has quilt seams, retention straps and a real access ladder.
  for (const y of [0.55, 1.75]) {
    k.box(5.35, y + 0.25, -15.4, 1.45, 0.08, 1.06, k.fabric);
    for (let i = 0; i < 7; i++)
      k.box(4.72 + i * 0.2, y + 0.297, -15.4, 0.012, 0.008, 1.01, k.m.paint);
    for (const z of [-15.8, -15])
      k.box(5.25, y + 0.31, z, 1.58, 0.025, 0.045, k.m.orange);
    k.box(6.2, y + 0.26, -15.4, 0.53, 0.17, 0.79, k.m.paint);
    k.lamp(5.4, y + 0.94, -15.7, 0.8);
  }
  for (const z of [-15.8, -15])
    k.tube(
      [
        [4.05, 0.16, z],
        [4.05, 2.5, z],
      ],
      0.027,
    );
  for (let y = 0.36; y < 2.5; y += 0.32)
    k.tube(
      [
        [4.05, y, -15.8],
        [4.05, y, -15],
      ],
      0.027,
    );
  // Medical drawers, instruments, tank regulators and low-cost tubing details.
  k.monitor(5.7, 2.3, -21.9, 0.95);
  for (let i = 0; i < 4; i++) {
    k.box(5.7, 0.35 + i * 0.27, -21.31, 1.25, 0.21, 0.035, k.m.navy);
    k.box(5.7, 0.35 + i * 0.27, -21.27, 0.3, 0.035, 0.06, k.m.metal);
  }
  for (const z of [-25, -25.85, -26.7]) {
    k.mesh(
      new T.TorusGeometry(0.13, 0.022, 8, 20),
      k.m.orange,
      5.7,
      2.15,
      z + 0.2,
    );
    k.tube(
      [
        [5.7, 2.02, z],
        [5.15, 2.02, z],
        [5.15, 1.35, z + 0.25],
      ],
      0.022,
      k.m.rubber,
    );
    for (const y of [0.7, 1.5])
      for (const x of [5.43, 5.97])
        k.box(x, y, z + 0.3, 0.05, 0.06, 0.045, k.m.metal);
  }
  for (const z of [-18, -24, -29]) {
    k.lamp(0, 3.91, z, 2.6);
    for (const x of [-6.6, 6.6]) {
      k.box(x, 1.2, z, 0.12, 1.8, 0.75, k.m.paint);
      for (let a = 0; a < 7; a++)
        k.box(
          x + (x > 0 ? -0.08 : 0.08),
          1.6 - a * 0.13,
          z,
          0.025,
          0.035,
          0.5,
          k.m.navy,
        );
    }
  }
  return k;
}
