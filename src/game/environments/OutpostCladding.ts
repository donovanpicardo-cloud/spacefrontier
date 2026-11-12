import { pressureShellDetail } from "./PressureShellDetail";
import { engineeringMap } from "./EngineeringFinish";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { paintModel } from "./PainterlyMaterials";
import { batchStatic } from "./StaticBatch";

/** Exterior cladding fitted around the existing pressure doors and collision shell. */
export function dressOutpost(
  scene: T.Scene,
  outerDoor: T.Mesh,
  disposed: () => boolean,
  mars: boolean,
) {
  const root = new T.Group();
  root.name = "Ceramic pressure shell / expedition habitat";
  root.userData.noCollision = true;
  const panelMap = engineeringMap();
  const cream = new T.MeshStandardMaterial({
    color: mars ? 0xd0c9bc : 0xd9e1e5,
    map: panelMap,
    roughness: .52,
    metalness: .18,
  });
  const charcoal = new T.MeshStandardMaterial({
    color: 0x202c37,
    roughness: .52,
    metalness: .38,
  });
  const ochre = new T.MeshStandardMaterial({ color: mars ? 0xab5e41 : 0xc38d42, roughness: 1 });
  const inner = new T.MeshStandardMaterial({
    color: 0x67717a,
    map: panelMap,
    roughness: .52,
    metalness: .38,
  });
  const amber = new T.MeshBasicMaterial({ color: 0xffcb7e, toneMapped: false });
  const titanium = new T.MeshStandardMaterial({ color: 0x8a99a6, metalness: .85, roughness: .27 });
  const glass = new T.MeshPhysicalMaterial({ color: 0x102735, metalness: .55, roughness: .12, clearcoat: 1 });
  const mesh = (
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = root,
  ) => {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material = cream,
    parent: T.Object3D = root,
  ) =>
    mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.16),
      mat,
      x,
      y,
      z,
      parent,
    );
  const ring = (
    width: number,
    height: number,
    holeW: number,
    holeH: number,
    z: number,
    depth: number,
    mat: T.Material,
  ) => {
    const shape = new T.Shape();
    // One open arch contour. Its underside never crosses the walking surface.
    shape.moveTo(-width * 0.85, 0);
    shape.lineTo(-width, height * 0.14);
    shape.lineTo(-width, height * 0.72);
    shape.lineTo(-width * 0.63, height);
    shape.lineTo(width * 0.63, height);
    shape.lineTo(width, height * 0.72);
    shape.lineTo(width, height * 0.14);
    shape.lineTo(width * 0.85, 0);
    shape.lineTo(holeW, 0);
    shape.lineTo(holeW, holeH * 0.81);
    shape.lineTo(holeW * 0.71, holeH);
    shape.lineTo(-holeW * 0.71, holeH);
    shape.lineTo(-holeW, holeH * 0.81);
    shape.lineTo(-holeW, 0);
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 3,
    });
    // ExtrudeGeometry's metre UVs become one authored panel per face-sized region.
    const uv = geo.getAttribute("uv");
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) / 4.5, uv.getY(i) / 4.5);
    return mesh(geo, mat, 0, 0, z);
  };
  ring(2.86, 5.04, 2.2, 4.27, -10.08, 0.82, cream);
  ring(2.32, 4.31, 1.73, 3.58, -9.73, 0.43, charcoal);
  ring(1.88, 3.76, 1.41, 3.01, -9.89, 0.41, inner);
  for (const x of [-2.04, 2.04]) {
    box(x, 1.83, -9.13, 0.24, 1.58, 0.14, charcoal);
    box(x, 1.83, -9.04, 0.11, 1.35, 0.04, amber);
    box(x * 1.21, 0.64, -9.15, 0.28, 0.22, 0.1, ochre);
  }
  box(0, 4.43, -9.17, 1.24, 0.22, 0.13, charcoal);
  box(0, 4.43, -9.08, 1, 0.11, 0.04, amber);
  box(0, 3.26, -9.37, 1.12, 0.13, 0.09, amber);
  const face = new T.MeshStandardMaterial({
    color: mars ? 0xaaa393 : 0xa5b2ba,
    map: panelMap,
    roughness: .52,
    metalness: .38,
    emissive: 0x94602b,
    emissiveIntensity: 0.025,
  });
  box(0, 0, 0.215, 2.28, 2.61, 0.13, face, outerDoor);
  box(0, 0.03, 0.292, 0.035, 2.42, 0.025, charcoal, outerDoor);
  for (const x of [-0.55, 0.55]) {
    box(x, 0.54, 0.292, 0.36, 0.51, 0.075, charcoal, outerDoor);
    box(x, 0.54, 0.338, 0.25, 0.38, 0.021, inner, outerDoor);
    box(x, -0.65, 0.29, 0.81, 0.61, 0.09, face, outerDoor);
    box(x * 1.35, 0.02, 0.33, 0.22, 0.065, 0.075, charcoal, outerDoor);
  }
  box(0, 0.102, -8.36, 2.93, 0.045, 3.52, cream);
  // Pressure modules, bands, skid feet and cargo cases.
  for (const side of [-1, 1]) {
    const module = mesh(
      new T.CylinderGeometry(2.07, 2.07, 4.7, 40),
      cream,
      side * 4.64,
      2.16,
      -11.04,
    );
    module.rotation.z = Math.PI / 2;
    module.rotation.x = Math.PI / 10;
    // Pressure-shell inspection windows and separate machined retaining rings.
    for (const offset of [-.9, .5]) {
      const x = side * 4.64 + offset;
      mesh(new T.TorusGeometry(.39, .055, 8, 32), titanium, x, 2.16, -8.94);
      mesh(new T.CircleGeometry(.35, 32), glass, x, 2.16, -8.945);
      box(x, 1.63, -8.99, .52, .045, .04, charcoal);
      for (const dx of [-.18, .18]) box(x + dx, 2.71, -9.04, .055, .055, .03, titanium);
    }
    for (const x of [3.08, 5.66, 6.82]) {
      const band = mesh(
        new T.CylinderGeometry(2.12, 2.12, 0.12, 40),
        inner,
        side * x,
        2.16,
        -11.04,
      );
      band.rotation.copy(module.rotation);
      box(side * x, 0.29, -9.54, 0.47, 0.54, 0.78, charcoal);
    }
    const stripes = [];
    for (const degrees of Array.from({ length: 13 }, (_, i) => -54 + i * 9)) {
      const angle = T.MathUtils.degToRad(degrees);
      const rise = Math.sin(angle) * 2.08;
      const depth = Math.cos(angle) * 2.08;
      const x = side * 4.4 + rise * 0.52;
      stripes.push(
        x - 0.19,
        2.16 + rise,
        -11.04 + depth,
        x + 0.19,
        2.16 + rise,
        -11.04 + depth,
      );
    }
    const stripe = new T.BufferGeometry();
    stripe.setAttribute("position", new T.Float32BufferAttribute(stripes, 3));
    stripe.setIndex(Array.from({ length: 12 }, (_, i) => { const a = i * 2; return [a, a + 1, a + 2, a + 1, a + 3, a + 2]; }).flat());
    stripe.computeVertexNormals();
    mesh(stripe, ochre, 0, 0, 0).castShadow = false;
    box(side * 6.24, 1.37, -8.99, 0.78, 0.76, 0.17, cream);
    box(side * 6.24, 1.37, -8.89, 0.32, 0.1, 0.07, charcoal);
    box(side * 4.88, 4.32, -10.82, 0.99, 0.3, 0.65, inner);
    for (let i = 0; i < 5; i++)
      box(side * 0.95, 0.128, -7 - i * 0.54, 0.58, 0.013, 0.27, ochre);
    box(side * 5.91, 0.42, -8.15, 1.34, 0.75, 0.61, cream);
    box(side * 5.91, 0.64, -7.837, 1.33, 0.09, 0.024, ochre);
    for (const dx of [-0.4, 0.4])
      box(side * 5.91 + dx, 0.59, -7.81, 0.125, 0.24, 0.05, charcoal);
  }
  // Repeated fasteners in one draw call.
  const bolts = new T.InstancedMesh(
    new T.CylinderGeometry(0.055, 0.055, 0.035, 6),
    charcoal,
    16,
  );
  const dummy = new T.Object3D();
  let n = 0;
  for (const side of [-1, 1])
    for (const y of [0.65, 1.55, 2.55, 3.43])
      for (const x of [2.43, 2.73]) {
        dummy.position.set(side * x, y, -9.19);
        dummy.rotation.x = Math.PI / 2;
        dummy.updateMatrix();
        bolts.setMatrixAt(n++, dummy.matrix);
      }
  bolts.count = n;
  root.add(bolts);
  pressureShellDetail(root, cream, titanium, charcoal);
  paintModel(root);
  batchStatic(root);
  scene.add(root);

  // The NASA assembly is mounted on a roof service cabinet at outpost scale.
  const tower = box(5.62, 4.92, -15.5, 2.52, 1.8, 2.3);
  box(5.62, 5.2, -14.32, 2.18, 1.05, 0.13, inner);
  for (const angle of [-0.49, 0.49])
    box(5.62, 5.2, -14.22, 1.98, 0.1, 0.1, cream).rotation.z = angle;
  const mast = mesh(
    new T.CylinderGeometry(0.036, 0.055, 4.1, 8),
    charcoal,
    7.2,
    6.6,
    -14.9,
  );
  mesh(new T.CylinderGeometry(0.06, 0.06, 0.24, 8), cream, 7.2, 8.65, -14.9);
  const fallback = mesh(
    new T.SphereGeometry(1.64, 32, 14, 0, Math.PI * 2, 0, 1.06),
    cream,
    5.62,
    6.85,
    -15.5,
  );
  fallback.rotation.z = 0.83;
  new GLTFLoader().load(
    "/models/nasa-dsn.glb",
    ({ scene: antenna }) => {
      if (disposed()) {
        antenna.traverse((object) => {
          if (!(object instanceof T.Mesh)) return;
          object.geometry.dispose();
          object.material.map?.dispose();
          object.material.dispose();
        });
        return;
      }
      const bounds = new T.Box3().setFromObject(antenna);
      const center = bounds.getCenter(new T.Vector3());
      const scale = 3.9 / bounds.getSize(new T.Vector3()).x;
      antenna.scale.setScalar(scale);
      antenna.position.set(
        tower.position.x - center.x * scale,
        5.81 - bounds.min.y * scale,
        tower.position.z - center.z * scale,
      );
      antenna.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        object.castShadow = object.receiveShadow = true;
        object.material.color.setHex(0xc5d0db);
        object.material.emissiveIntensity = 0;
        object.material.metalness = .45;
        object.material.roughness = .52;
      });
      fallback.visible = false;
      root.add(antenna);
    },
    undefined,
    () => {
      /* Keep the local fallback dish. */
    },
  );
}
