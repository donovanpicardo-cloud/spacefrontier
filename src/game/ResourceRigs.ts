import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { hardwareMaterials } from "./environments/HardwareMaterials";
import type { ResourceKind } from "./Resources";
export type ResourceRig = {
  root: T.Group;
  moving: T.Group;
  dial: T.Group;
  indicator: T.Mesh;
  component: T.Group;
  ice: T.Group;
};
export function resourceRig(kind: ResourceKind): ResourceRig {
  const root = new T.Group(),
    structure = new T.Group(),
    moving = new T.Group(),
    dial = new T.Group(),
    component = new T.Group(),
    ice = new T.Group();
  root.add(structure, moving);
  moving.userData.noCollision = true;
  const mat = hardwareMaterials();
  const mesh = (
    p: T.Object3D,
    g: T.BufferGeometry,
    m: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    p.add(o);
    return o;
  };
  const box = (
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m = mat.paint,
  ) =>
    mesh(
      p,
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.16),
      m,
      x,
      y,
      z,
    );
  const pipe = (p: T.Object3D, points: number[][], r: number, m = mat.metal) =>
    mesh(
      p,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((v) => new T.Vector3(...(v as [number, number, number]))),
        ),
        24,
        r,
        8,
        false,
      ),
      m,
    );
  const indicator = mesh(
    moving,
    new T.CylinderGeometry(0.055, 0.055, 0.2, 16),
    new T.MeshStandardMaterial({
      color: 0x6de0b9,
      emissive: 0x23785c,
      emissiveIntensity: 0.8,
    }),
    0.57,
    1.2,
    0.05,
  );
  if (kind === "ice") {
    mesh(
      structure,
      new T.CylinderGeometry(0.8, 0.95, 0.16, 24),
      mat.tread,
      0,
      0.08,
    );
    for (const x of [-0.58, 0.58]) {
      box(structure, x, 0.6, -0.15, 0.075, 1.15, 0.075, mat.metal);
      mesh(
        structure,
        new T.CylinderGeometry(0.045, 0.045, 0.85, 12),
        mat.metal,
        x,
        0.58,
        -0.15,
      );
    }
    box(structure, 0, 1.18, -0.15, 1.3, 0.15, 0.26, mat.navy);
    mesh(
      structure,
      new T.CylinderGeometry(0.22, 0.22, 0.55, 24),
      mat.paint,
      0.95,
      0.4,
      0,
    );
    for (const y of [0.2, 0.58])
      mesh(
        structure,
        new T.TorusGeometry(0.23, 0.025, 8, 24),
        mat.orange,
        0.95,
        y,
      ).rotation.x = Math.PI / 2;
    pipe(
      structure,
      [
        [0, 0.9, 0.05],
        [0.35, 0.75, 0.35],
        [0.95, 0.7, 0.12],
        [0.95, 0.4, 0.1],
      ],
      0.035,
      mat.rubber,
    );
    root.add(ice);
    ice.userData.noCollision = true;
    const frozen = new T.MeshStandardMaterial({
      color: 0xafd3dc,
      metalness: 0.15,
      roughness: 0.24,
    });
    for (let i = 0; i < 7; i++) {
      const r = mesh(
        ice,
        new T.IcosahedronGeometry(0.13 + (i % 3) * 0.035, 1),
        frozen,
        Math.sin(i * 2) * 0.36,
        0.19,
        Math.cos(i * 2) * 0.35,
      );
      r.scale.set(1, 0.65, 1);
    }
    const cap = mesh(
      moving,
      new T.IcosahedronGeometry(0.67, 2),
      new T.MeshStandardMaterial({ color: 0x7e6e62, roughness: 0.98 }),
      0,
      0.32,
    );
    cap.scale.y = 0.48;
    cap.userData.cover = true;
    moving.add(dial);
    dial.position.set(0, 0.72, 0);
    mesh(
      dial,
      new T.CylinderGeometry(0.1, 0.13, 0.24, 24),
      mat.orange,
      0,
      0.32,
    );
    const auger = new T.Group();
    dial.add(auger);
    auger.userData.auger = true;
    mesh(
      auger,
      new T.CylinderGeometry(0.025, 0.025, 0.48, 12),
      mat.metal,
      0,
      0.1,
    );
    const helix: number[][] = [];
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      helix.push([
        Math.cos(t * Math.PI * 12) * 0.09,
        0.32 - t * 0.45,
        Math.sin(t * Math.PI * 12) * 0.09,
      ]);
    }
    pipe(auger, helix, 0.018);
  } else if (kind === "battery") {
    for (const x of [-0.45, 0.45])
      box(structure, x, 0.12, 0, 0.16, 0.2, 1.05, mat.rubber);
    box(structure, 0, 0.54, 0, 0.94, 0.78, 0.7, mat.navy);
    mesh(
      structure,
      new T.CylinderGeometry(0.26, 0.26, 0.85, 24),
      mat.paint,
      0,
      0.57,
    ).rotation.z = Math.PI / 2;
    for (const x of [-0.34, 0.34])
      mesh(
        structure,
        new T.TorusGeometry(0.27, 0.027, 8, 32),
        mat.metal,
        x,
        0.57,
      ).rotation.y = Math.PI / 2;
    for (let i = 0; i < 10; i++)
      box(
        structure,
        -0.3 + i * 0.066,
        0.95,
        -0.19,
        0.025,
        0.06,
        0.28,
        mat.metal,
      );
    moving.add(dial);
    dial.position.set(0, 0.95, 0.42);
    mesh(dial, new T.TorusGeometry(0.23, 0.025, 8, 32), mat.orange);
    box(dial, 0, 0, 0.02, 0.46, 0.045, 0.055, mat.metal);
    box(dial, 0.23, 0, 0.1, 0.09, 0.09, 0.2, mat.rubber);
    component.position.set(0.62, 0.37, 0);
    moving.add(component);
    box(component, 0, 0, 0, 0.3, 0.47, 0.4, mat.paint);
    box(component, 0, 0.28, 0, 0.19, 0.06, 0.1, mat.rubber);
    for (let i = 0; i < 4; i++)
      box(
        component,
        -0.09 + i * 0.06,
        0.08,
        0.21,
        0.035,
        0.24,
        0.018,
        mat.orange,
      );
    pipe(
      structure,
      [
        [0.42, 0.5, 0],
        [0.6, 0.65, -0.2],
        [0.67, 0.45, -0.22],
      ],
      0.025,
      mat.rubber,
    );
  } else {
    box(structure, 0, 0.25, 0, 1.0, 0.32, 0.72, mat.navy);
    for (const x of [-0.46, 0.46])
      box(structure, x, 0.62, -0.18, 0.055, 0.65, 0.08, mat.metal);
    box(structure, 0, 0.85, -0.2, 0.94, 0.055, 0.06, mat.orange);
    // The retaining lip is also the visible obstacle used by the extraction rule.
    box(structure, 0.12, 0.62, 0.28, 0.94, 0.15, 0.055, mat.metal);
    box(structure, 0.76, 0.28, 0, 0.58, 0.07, 0.72, mat.tread);
    const tray = mesh(
      structure,
      new T.PlaneGeometry(0.47, 0.55),
      new T.MeshStandardMaterial({
        color: 0x386f60,
        emissive: 0x1a4e38,
        emissiveIntensity: 0.4,
      }),
      0.76,
      0.325,
    );
    tray.rotation.x = -Math.PI / 2;
    moving.add(component);
    component.position.set(0, 0.48, 0);
    box(component, 0, 0, 0, 0.48, 0.15, 0.42, mat.metal);
    const board = new T.MeshStandardMaterial({
      color: 0x1e6a53,
      roughness: 0.55,
      metalness: 0.2,
    });
    box(component, 0, 0.085, 0, 0.43, 0.02, 0.38, board);
    for (let i = 0; i < 8; i++) {
      box(
        component,
        -0.15 + (i % 4) * 0.1,
        0.11,
        -0.1 + Math.floor(i / 4) * 0.17,
        0.055,
        0.045,
        0.08,
        mat.rubber,
      );
      box(
        component,
        -0.16 + (i % 4) * 0.1,
        0.108,
        0.1,
        0.013,
        0.02,
        0.14,
        mat.orange,
      );
    }
    for (const x of [-0.19, 0.19])
      mesh(
        component,
        new T.CylinderGeometry(0.022, 0.022, 0.035, 8),
        mat.orange,
        x,
        0.12,
      );
    const boom = pipe(
      structure,
      [
        [-0.4, 0.4, -0.3],
        [-0.9, 0.6, -0.35],
        [-1.2, 0.7, -0.2],
      ],
      0.03,
      mat.metal,
    );
    boom.rotation.y = 0.2;
  }
  root.userData.structure = structure;
  return { root, moving, dial, indicator, component, ice };
}
