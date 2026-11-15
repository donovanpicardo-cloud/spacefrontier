import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { batchStatic } from "./StaticBatch";
export function vehicleDetail(root: T.Group, wheels: T.Group[], mars: boolean) {
  const detail = new T.Group();
  root.add(detail);
  const metal = new T.MeshStandardMaterial({
    color: 0x65777c,
    metalness: 0.78,
    roughness: 0.32,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x17262c,
    metalness: 0.45,
    roughness: 0.65,
  });
  const gold = new T.MeshStandardMaterial({
    color: 0xc6a36c,
    metalness: 0.7,
    roughness: 0.4,
  });
  const add = (
    g: T.BufferGeometry,
    m: T.Material,
    p: T.Group,
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
  const panel = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
  ) => add(new RoundedBoxGeometry(w, h, d, 2, 0.025), m, detail, x, y, z);
  // Protected radiators, service hatches, bumper and exposed suspension links.
  panel(0, 0.65, -1.36, 1.7, 0.12, 0.15, metal);
  panel(0, 1.2, 1.45, 1.38, 0.48, 0.08, dark);
  for (let i = 0; i < 10; i++)
    panel(-0.6 + i * 0.13, 1.2, 1.51, 0.04, 0.37, 0.04, metal);
  for (const x of [-1, 1]) {
    panel(x * 0.84, 0.76, 0, 0.07, 0.18, mars ? 2.4 : 1.8, metal);
    panel(x * 0.79, mars ? 1.72 : 0.88, 0.8, 0.09, 0.43, 0.58, gold);
    panel(x * 0.82, mars ? 1.72 : 0.88, 0.8, 0.1, 0.12, 0.33, dark);
    for (const z of mars ? [-1.15, 0, 1.15] : [-0.85, 0.85]) {
      const points: T.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        points.push(
          new T.Vector3(
            x * 0.76 + Math.cos(t * Math.PI * 10) * 0.07,
            0.7 + t * 0.36,
            z + Math.sin(t * Math.PI * 10) * 0.07,
          ),
        );
      }
      add(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 60, 0.018, 5, false),
        metal,
        detail,
      );
    }
  }
  for (const wheel of wheels) {
    const bolts = new T.InstancedMesh(
        new T.SphereGeometry(0.027, 6, 4),
        gold,
        12,
      ),
      dummy = new T.Object3D();
    for (let i = 0; i < 12; i++) {
      const angle = ((i % 6) * Math.PI) / 3;
      dummy.position.set(
        i < 6 ? -0.19 : 0.19,
        Math.sin(angle) * 0.15,
        Math.cos(angle) * 0.15,
      );
      dummy.updateMatrix();
      bolts.setMatrixAt(i, dummy.matrix);
    }
    bolts.castShadow = true;
    wheel.add(bolts);
    for (const x of [-0.19, 0.19])
      add(new T.TorusGeometry(0.35, 0.015, 6, 24), metal, wheel, x).rotation.y =
        Math.PI / 2;
  }
  batchStatic(detail);
}

