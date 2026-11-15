import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  hardwareMaterials,
  industrialSurface,
} from "../environments/HardwareMaterials";
export function habitatSkin(scene: T.Scene, doors: T.Mesh[]) {
  const root = new T.Group();
  scene.add(root);
  const m = hardwareMaterials();
  const mesh = (
    p: T.Object3D,
    g: T.BufferGeometry,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new T.Mesh(g, mat);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    p.add(o);
    return o;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material = m.paint,
    p: T.Object3D = root,
  ) =>
    mesh(
      p,
      new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.2),
      mat,
      x,
      y,
      z,
    );
  const tube = (points: number[][], r: number, mat = m.metal) =>
    mesh(
      root,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...(p as [number, number, number]))),
        ),
        64,
        r,
        8,
        false,
      ),
      mat,
    );
  for (const x of [-5.85, -4.28, -2.7, 2.7, 4.28, 5.85]) {
    box(x, 1.94, -9.88, 1.48, 3.65, 0.18);
    box(x, 0.55, -9.76, 1.25, 0.045, 0.045, m.metal);
    box(x, 3.42, -9.76, 1.25, 0.045, 0.045, m.metal);
    for (const dx of [-0.61, 0.61])
      box(x + dx, 1.96, -9.75, 0.025, 2.68, 0.025, m.navy);
  }
  const glass = new T.MeshPhysicalMaterial({
    color: 0x173747,
    metalness: 0.4,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.6,
  });
  const bolts: T.Vector3[] = [];
  for (const x of [-5.2, -3.25, 3.25, 5.2]) {
    mesh(
      root,
      new T.CylinderGeometry(0.65, 0.65, 0.11, 48),
      m.navy,
      x,
      2.45,
      -9.73,
    ).rotation.x = Math.PI / 2;
    mesh(
      root,
      new T.TorusGeometry(0.57, 0.045, 10, 48),
      m.metal,
      x,
      2.45,
      -9.64,
    );
    mesh(root, new T.CircleGeometry(0.51, 48), glass, x, 2.45, -9.63);
    mesh(
      root,
      new T.TorusGeometry(0.49, 0.018, 8, 40),
      m.orange,
      x,
      2.45,
      -9.6,
    );
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      bolts.push(
        new T.Vector3(x + Math.cos(a) * 0.61, 2.45 + Math.sin(a) * 0.61, -9.65),
      );
    }
  }
  for (const z of [-11, -14.8, -18.6, -22.4, -26.2, -30, -33.7]) {
    const points = [
      [-7.1, 0.15, z],
      [-7.1, 2.45, z],
      [-6.4, 3.9, z],
      [-4.1, 4.55, z],
      [4.1, 4.55, z],
      [6.4, 3.9, z],
      [7.1, 2.45, z],
      [7.1, 0.15, z],
    ];
    tube(points, 0.065, m.metal);
    for (const x of [-7.16, 7.16]) {
      box(x, 1.5, z, 0.12, 2.3, 0.22, m.navy);
      for (const y of [0.5, 2.5]) bolts.push(new T.Vector3(x, y, z + 0.14));
    }
  }
  tube(
    [
      [-1.55, 0.12, -9.62],
      [-1.55, 2.84, -9.62],
      [-1.25, 3.24, -9.62],
      [1.25, 3.24, -9.62],
      [1.55, 2.84, -9.62],
      [1.55, 0.12, -9.62],
    ],
    0.09,
    m.metal,
  );
  for (const x of [-1.65, 1.65]) {
    box(x, 1.5, -9.8, 0.22, 3.1, 0.42, m.navy);
    box(x, 1.5, -9.56, 0.035, 2.3, 0.025, m.orange);
  }
  box(0, 3.31, -9.68, 3.2, 0.18, 0.42, m.navy);
  for (const x of [-6.6, 6.6]) {
    box(x, 0.32, -9.55, 0.75, 0.5, 0.55, m.navy);
    for (let i = 0; i < 8; i++)
      box(x - 0.27 + i * 0.078, 0.35, -9.25, 0.025, 0.3, 0.04, m.metal);
  }
  for (const door of doors) {
    door.userData.noCollision = true;
    door.userData.noBatch = true;
    box(0, 0, 0.105, 2.15, 2.5, 0.055, m.paint, door);
    box(0, 0.1, 0.145, 0.018, 2.35, 0.018, m.navy, door);
    for (const x of [-0.92, 0.92])
      for (const y of [-0.95, 0.95])
        box(x, y, 0.15, 0.13, 0.17, 0.06, m.metal, door);
    box(0, 0.68, 0.155, 0.68, 0.2, 0.025, glass, door);
    for (const x of [-0.7, 0.7])
      box(x, -0.15, 0.175, 0.045, 0.45, 0.065, m.orange, door);
  }
  const fasteners = new T.InstancedMesh(
      new T.CylinderGeometry(0.025, 0.025, 0.028, 6),
      m.metal,
      bolts.length,
    ),
    dummy = new T.Object3D();
  for (const [i, p] of bolts.entries()) {
    dummy.position.copy(p);
    dummy.rotation.x = Math.PI / 2;
    dummy.updateMatrix();
    fasteners.setMatrixAt(i, dummy.matrix);
  }
  root.add(fasteners);
  return root;
}

