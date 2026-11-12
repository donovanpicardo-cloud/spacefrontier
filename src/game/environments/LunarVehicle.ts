import { fenderGeometry, roverWheel } from "./RoverWheel";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { hardwareMaterials } from "./HardwareMaterials";
import { batchStatic } from "./StaticBatch";
export function buildLunarVehicle(root: T.Group) {
  const fixed = new T.Group();
  root.add(fixed);
  const m = hardwareMaterials(),
    wheels: T.Group[] = [],
    steering: T.Group[] = [];
  m.paint.color.setHex(0xd6c7af);
  m.navy.color.setHex(0x4c453c);
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
  ) =>
    mesh(
      fixed,
      new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.22),
      mat,
      x,
      y,
      z,
    );
  const tube = (
    a: T.Vector3,
    b: T.Vector3,
    r = 0.025,
    mat: T.Material = m.metal,
    p: T.Object3D = fixed,
  ) => {
    const o = mesh(p, new T.CylinderGeometry(r, r, a.distanceTo(b), 10), mat);
    o.position.copy(a).lerp(b, 0.5);
    o.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return o;
  };
  for (const x of [-0.75, 0.75])
    tube(new T.Vector3(x, 0.65, -1.25), new T.Vector3(x, 0.65, 1.25), 0.06);
  for (const z of [-1.15, -0.2, 0.65, 1.2])
    tube(new T.Vector3(-0.85, 0.65, z), new T.Vector3(0.85, 0.65, z), 0.045);
  box(0, 0.8, 0, 1.55, 0.11, 2.4, m.tread);
  box(0, 1.13, -0.93, 1.6, 0.4, 0.58).rotation.x = -0.25;
  box(0, 1.3, -0.71, 1.35, 0.07, 0.35, m.navy).rotation.x = -0.25;
  for (const x of [-0.39, 0.39]) {
    box(x, 1.03, 0.12, 0.65, 0.16, 0.63, m.navy);
    box(x, 1.36, 0.43, 0.65, 0.58, 0.14, m.navy).rotation.x = 0.12;
    for (const dx of [-0.25, 0.25])
      tube(
        new T.Vector3(x + dx, 1.1, 0.48),
        new T.Vector3(x + dx, 1.63, 0.48),
        0.025,
      );
    // Seat seams and webbing are real geometry, readable in the close camera.
    for (const dx of [-0.2, -0.1, 0, 0.1, 0.2])
      box(x + dx, 1.105, 0.12, 0.008, 0.008, 0.48, m.metal);
    box(x, 1.39, 0.335, 0.065, 0.48, 0.025, m.rubber).rotation.z = 0.35;
  }
  box(0, 1.1, 1.03, 1.4, 0.42, 0.48, m.orange);
  for (const x of [-0.5, 0.5]) {
    box(x, 1.1, 1.287, 0.07, 0.31, 0.025, m.rubber);
    box(x, 1.1, 1.31, 0.11, 0.08, 0.025, m.metal);
  }
  for (const x of [-0.98, 0.98])
    for (const z of [-0.96, 0.96]) {
      const pivot = new T.Group();
      pivot.position.set(x, 0.55, z);
      root.add(pivot);
      if (z < 0) steering.push(pivot);
      const wheel = roverWheel(.485, .34);
      pivot.add(wheel);
      wheels.push(wheel);
      tube(
        new T.Vector3(Math.sign(x) * 0.5, 0.68, z - 0.17),
        new T.Vector3(x, 0.55, z),
        0.045,
      );
      tube(
        new T.Vector3(Math.sign(x) * 0.5, 0.83, z + 0.2),
        new T.Vector3(x, 0.55, z),
        0.035,
        m.navy,
      );
      mesh(fixed, fenderGeometry(.58, .48), m.paint, x, .55, z);
    }
  for (const x of [-0.83, 0.83]) {
    tube(
      new T.Vector3(x, 0.86, -0.4),
      new T.Vector3(x, 1.5, -0.15),
      0.028,
      m.orange,
    );
    tube(
      new T.Vector3(x, 1.5, -0.15),
      new T.Vector3(x, 1.5, 0.65),
      0.028,
      m.orange,
    );
    tube(
      new T.Vector3(x, 1.5, 0.65),
      new T.Vector3(x, 0.86, 0.85),
      0.028,
      m.orange,
    );
  }
  // Broad fenders and a four-post cage establish the concept buggy silhouette.
  for (const x of [-.85, .85]) {
    const cage = new T.CatmullRomCurve3([
      new T.Vector3(x, .87, -.96), new T.Vector3(x, 1.91, -.73),
      new T.Vector3(x * .91, 2.13, -.49), new T.Vector3(x * .91, 2.13, .59),
      new T.Vector3(x, 1.94, .78), new T.Vector3(x, .87, 1.01),
    ], false, "catmullrom", .18);
    mesh(fixed, new T.TubeGeometry(cage, 44, .054, 12, false), m.metal);
  }
  for (const z of [-.49, .59]) tube(new T.Vector3(-.78, 2.13, z), new T.Vector3(.78, 2.13, z), .048, m.metal);
  for (const x of [-.42, .42]) {
    box(x, 1.45, 1, .65, .32, .45, m.paint);
    box(x, 1.45, 1.24, .075, .33, .025, m.orange);
  }
  const control = new T.Group();
  control.position.set(-0.39, 1.52, -0.72);
  control.rotation.x = -0.35;
  root.add(control);
  mesh(control, new T.TorusGeometry(0.2, 0.02, 8, 32), m.rubber);
  mesh(control, new T.BoxGeometry(0.37, 0.02, 0.025), m.metal);
  for (const x of [-0.61, 0.61]) {
    mesh(
      fixed,
      new T.CylinderGeometry(0.11, 0.11, 0.08, 24),
      m.metal,
      x,
      1.16,
      -1.36,
    ).rotation.x = Math.PI / 2;
    const lens = new T.MeshPhysicalMaterial({
      color: 0xdce5cf,
      metalness: 0.15,
      roughness: 0.08,
      clearcoat: 1,
    });
    mesh(
      fixed,
      new T.SphereGeometry(0.095, 16, 10),
      lens,
      x,
      1.16,
      -1.41,
    ).scale.z = 0.28;
  }
  tube(new T.Vector3(0.62, 1.3, 1.1), new T.Vector3(0.62, 2.35, 1.1), 0.012);
  mesh(fixed, new T.SphereGeometry(0.035, 12, 8), m.orange, 0.62, 2.35, 1.1);
  const bolts = new T.InstancedMesh(
      new T.CylinderGeometry(0.018, 0.018, 0.025, 6),
      m.metal,
      32,
    ),
    dummy = new T.Object3D();
  for (let i = 0; i < 32; i++) {
    dummy.position.set(
      (i % 2 ? 1 : -1) * 0.71,
      0.87,
      -1.1 + Math.floor(i / 2) * 0.145,
    );
    dummy.updateMatrix();
    bolts.setMatrixAt(i, dummy.matrix);
  }
  fixed.add(bolts);
  batchStatic(fixed);
  return { wheels, steering, control };
}
