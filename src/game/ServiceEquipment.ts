import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { hardwareMaterials } from "./environments/HardwareMaterials";
import type { RepairKind } from "./RepairPlan";
export function serviceEquipment(parent: T.Group, kind: RepairKind) {
  const root = new T.Group();
  root.userData.noCollision = true;
  root.userData.serviceDetail = true;
  parent.add(root);
  const m = hardwareMaterials();
  const add = (
    g: T.BufferGeometry,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const o = new T.Mesh(g, mat);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    root.add(o);
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
  ) =>
    add(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2),
      mat,
      x,
      y,
      z,
    );
  for (const x of [-0.69, 0.69]) box(x, 0, -0.04, 0.08, 0.96, 0.16, m.metal);
  for (const y of [-0.48, 0.48]) box(0, y, -0.04, 1.45, 0.075, 0.16, m.metal);
  for (const x of [-0.66, 0.66])
    for (const y of [-0.43, 0.43])
      add(
        new T.CylinderGeometry(0.025, 0.025, 0.035, 6),
        m.metal,
        x,
        y,
        0.065,
      ).rotation.x = Math.PI / 2;
  box(0, -0.56, -0.1, 1.28, 0.1, 0.22, m.navy);
  if (kind === "greenhouse") {
    for (const x of [-0.3, 0.3]) {
      for (const y of [-0.34, 0.34]) {
        add(
          new T.CylinderGeometry(0.105, 0.105, 0.07, 24),
          m.metal,
          x,
          y,
          0.01,
        );
        add(
          new T.TorusGeometry(0.095, 0.012, 8, 24),
          m.orange,
          x,
          y,
          0.03,
        ).rotation.x = Math.PI / 2;
      }
      const bezel = add(
        new T.CylinderGeometry(0.095, 0.095, 0.035, 24),
        m.metal,
        x,
        0.35,
        0.12,
      );
      bezel.rotation.x = Math.PI / 2;
      add(
        new T.CircleGeometry(0.079, 24),
        new T.MeshStandardMaterial({ color: 0xe9e5d6, roughness: 0.4 }),
        x,
        0.35,
        0.145,
      );
      const needle = box(x, 0.37, 0.15, 0.008, 0.06, 0.008, m.orange);
      needle.rotation.z = 0.7;
    }
  } else if (kind === "life") {
    box(0, 0.12, 0.025, 0.58, 0.38, 0.07, m.rubber);
    for (let i = 0; i < 15; i++)
      box(-0.59 + i * 0.084, -0.49, 0.09, 0.035, 0.05, 0.045, m.metal);
    for (const x of [-0.5, 0.5]) box(x, -0.4, 0.04, 0.38, 0.025, 0.32, m.metal);
  } else {
    for (const x of [-0.72, 0.72])
      for (let i = 0; i < 8; i++)
        box(x, -0.3 + i * 0.085, -0.11, 0.035, 0.035, 0.22, m.navy);
    for (let i = 0; i < 3; i++) {
      const x = -0.45 + i * 0.45;
      box(x, -0.63, -0.08, 0.16, 0.12, 0.19, m.paint);
      add(
        new T.CylinderGeometry(0.035, 0.035, 0.1, 12),
        m.orange,
        x,
        -0.72,
        -0.08,
      );
    }
  }
  return root;
}
