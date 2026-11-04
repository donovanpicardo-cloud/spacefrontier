import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function fabric() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#c9c8bd";
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    x.fillStyle = i % 4 ? "#ecebdd" : "#b8b9ae";
    x.fillRect(i, 0, 1, 128);
    x.fillStyle = "#dfded455";
    x.fillRect(0, i, 128, 1);
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}
function patch(text: string, background = "#263b43", color = "#e7e4d5") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = background;
  x.fillRect(0, 0, 256, 128);
  x.strokeStyle = color;
  x.lineWidth = 5;
  x.strokeRect(8, 8, 240, 112);
  x.fillStyle = color;
  x.font = "bold 29px monospace";
  x.textAlign = "center";
  x.fillText(text, 128, 58);
  x.font = "16px monospace";
  x.fillText("EXPLORATION DIVISION", 128, 88);
  return new T.MeshStandardMaterial({
    map: new T.CanvasTexture(c),
    roughness: 0.9,
  });
}
export function createAstronaut() {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const weave = fabric();
  const cloth = new T.MeshStandardMaterial({
    color: 0xe5e0cc,
    roughness: 0.88,
    bumpMap: weave,
    bumpScale: 0.007,
  });
  const armor = new T.MeshStandardMaterial({
    color: 0xd9ddd6,
    roughness: 0.37,
    metalness: 0.28,
  });
  const graphite = new T.MeshStandardMaterial({
    color: 0x202b30,
    roughness: 0.76,
    metalness: 0.2,
  });
  const rubber = new T.MeshStandardMaterial({
    color: 0x30383a,
    roughness: 0.95,
  });
  const trim = new T.MeshStandardMaterial({
    color: 0xb85a36,
    roughness: 0.65,
    metalness: 0.3,
  });
  const alloy = new T.MeshStandardMaterial({
    color: 0x7c9299,
    metalness: 0.83,
    roughness: 0.27,
  });
  const led = new T.MeshStandardMaterial({
    color: 0xb5f1e2,
    emissive: 0x65cdbd,
    emissiveIntensity: 1.8,
  });
  const add = (
    parent: T.Object3D,
    g: T.BufferGeometry,
    m: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const plate = (
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material = armor,
  ) => add(p, new RoundedBoxGeometry(w, h, d, 3, 0.025), m, x, y, z);
  const ring = (
    p: T.Object3D,
    y: number,
    r: number,
    m: T.Material = graphite,
  ) => {
    const o = add(p, new T.TorusGeometry(r, 0.018, 6, 24), m, 0, y);
    o.rotation.x = Math.PI / 2;
    return o;
  };
  const tube = (
    p: T.Object3D,
    points: number[][],
    radius: number,
    m: T.Material,
  ) =>
    add(
      p,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((v) => new T.Vector3(...(v as [number, number, number]))),
        ),
        24,
        radius,
        8,
        false,
      ),
      m,
    );
  const torso = add(body, new T.SphereGeometry(1, 28, 20), cloth, 0, 1.28, 0);
  torso.scale.set(0.31, 0.38, 0.21);
  const pelvis = add(
    body,
    new T.SphereGeometry(1, 24, 16),
    graphite,
    0,
    0.99,
    0,
  );
  pelvis.scale.set(0.3, 0.17, 0.2);
  plate(body, 0, 1.37, -0.185, 0.45, 0.34, 0.105);
  plate(body, 0, 1.38, -0.249, 0.3, 0.2, 0.025, graphite);
  for (let i = 0; i < 3; i++)
    plate(body, -0.09 + i * 0.09, 1.44, -0.266, 0.05, 0.015, 0.012, led);
  for (const side of [-1, 1]) {
    plate(body, side * 0.22, 1.2, -0.21, 0.08, 0.23, 0.04, trim).rotation.z =
      side * -0.14;
    const connector = add(
      body,
      new T.CylinderGeometry(0.046, 0.046, 0.035, 16),
      alloy,
      side * 0.18,
      1.11,
      -0.23,
    );
    connector.rotation.x = Math.PI / 2;
    tube(
      body,
      [
        [side * 0.18, 1.11, -0.25],
        [side * 0.33, 1.03, -0.23],
        [side * 0.39, 1.08, 0.09],
        [side * 0.23, 1.25, 0.29],
      ],
      0.024,
      graphite,
    );
    plate(
      body,
      side * 0.22,
      1.48,
      0.05,
      0.07,
      0.42,
      0.045,
      graphite,
    ).rotation.z = side * 0.08;
  }
  // Portable life support: contoured shell, cylinder guards, vents and service rails.
  plate(body, 0, 1.34, 0.29, 0.49, 0.62, 0.24, graphite);
  plate(body, 0, 1.36, 0.39, 0.4, 0.51, 0.09);
  plate(body, 0, 1.34, 0.444, 0.26, 0.18, 0.012, patch("FRONTIER"));
  for (const side of [-1, 1]) {
    add(
      body,
      new T.CapsuleGeometry(0.064, 0.36, 6, 12),
      alloy,
      side * 0.22,
      1.31,
      0.35,
    );
    for (const y of [1.15, 1.47])
      plate(body, side * 0.22, y, 0.4, 0.15, 0.035, 0.04, trim);
  }
  for (let i = 0; i < 7; i++)
    plate(body, -0.12 + i * 0.04, 1.59, 0.443, 0.018, 0.065, 0.015, graphite);
  plate(body, 0, 1.1, 0.442, 0.13, 0.035, 0.016, led);
  ring(body, 1.64, 0.218, alloy);
  ring(body, 1.675, 0.213, graphite);
  const head = new T.Group();
  head.position.y = 1.82;
  body.add(head);
  const shell = add(head, new T.SphereGeometry(0.265, 40, 28), armor);
  shell.scale.set(1, 1.06, 0.98);
  // An actual curved front visor, with gasket and metallic gold lens.
  const lens = (r: number, m: T.Material) => {
    const o = add(
      head,
      new T.SphereGeometry(
        r,
        40,
        24,
        Math.PI + 0.2,
        Math.PI - 0.4,
        0.35,
        Math.PI * 0.66,
      ),
      m,
      0,
      0,
      -0.018,
    );
    o.scale.y = 0.88;
    return o;
  };
  lens(0.274, graphite);
  lens(
    0.279,
    new T.MeshPhysicalMaterial({
      color: 0xc7a66d,
      metalness: 1,
      roughness: 0.13,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  for (const side of [-1, 1]) {
    const cap = add(
      head,
      new T.CylinderGeometry(0.073, 0.073, 0.05, 24),
      graphite,
      side * 0.26,
      0,
      0,
    );
    cap.rotation.z = Math.PI / 2;
    const hub = add(
      head,
      new T.CylinderGeometry(0.043, 0.043, 0.056, 20),
      alloy,
      side * 0.268,
      0,
      0,
    );
    hub.rotation.z = Math.PI / 2;
    plate(head, side * 0.18, 0.15, -0.16, 0.065, 0.04, 0.075, graphite);
    plate(head, side * 0.18, 0.15, -0.202, 0.046, 0.022, 0.012, led);
  }
  tube(
    head,
    [
      [0.15, -0.14, 0.13],
      [0.2, -0.16, 0],
      [0.17, -0.13, -0.18],
    ],
    0.012,
    graphite,
  );
  const arms: T.Group[] = [],
    elbows: T.Group[] = [],
    legs: T.Group[] = [],
    knees: T.Group[] = [],
    feet: T.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.355, 1.51, 0);
    body.add(arm);
    arms.push(arm);
    const shoulder = add(
      arm,
      new T.SphereGeometry(0.146, 20, 16),
      cloth,
      0,
      -0.035,
      0,
    );
    shoulder.scale.set(1, 0.95, 0.93);
    add(arm, new T.CapsuleGeometry(0.105, 0.13, 6, 16), cloth, 0, -0.18, 0);
    const shoulderPatch = plate(
      arm,
      side * 0.108,
      -0.07,
      0,
      0.012,
      0.12,
      0.13,
      trim,
    );
    shoulderPatch.rotation.z = side * -0.1;
    plate(
      arm,
      0,
      -0.1,
      -0.119,
      0.115,
      0.075,
      0.01,
      patch(side < 0 ? "01 / EVA" : "FTR"),
    );
    for (let i = 0; i < 5; i++) ring(arm, -0.25 - i * 0.015, 0.095, rubber);
    const elbow = new T.Group();
    elbow.position.y = -0.29;
    arm.add(elbow);
    elbows.push(elbow);
    add(elbow, new T.CapsuleGeometry(0.097, 0.115, 6, 16), cloth, 0, -0.12, 0);
    plate(elbow, 0, -0.09, -0.082, 0.14, 0.17, 0.045);
    ring(elbow, -0.23, 0.087, alloy);
    ring(elbow, -0.25, 0.085, trim);
    const glove = add(
      elbow,
      new T.SphereGeometry(1, 16, 12),
      cloth,
      0,
      -0.32,
      -0.012,
    );
    glove.scale.set(0.082, 0.105, 0.069);
    for (let finger = 0; finger < 4; finger++)
      add(
        elbow,
        new T.CapsuleGeometry(0.016, 0.055, 4, 8),
        graphite,
        -0.048 + finger * 0.031,
        -0.405,
        -0.025,
      );
    const thumb = add(
      elbow,
      new T.CapsuleGeometry(0.023, 0.045, 4, 8),
      cloth,
      side * 0.077,
      -0.32,
      -0.035,
    );
    thumb.rotation.z = side * 0.5;
    const hip = new T.Group();
    hip.position.set(side * 0.17, 0.98, 0);
    body.add(hip);
    legs.push(hip);
    add(hip, new T.CapsuleGeometry(0.132, 0.17, 6, 20), cloth, 0, -0.18, 0);
    plate(hip, side * 0.035, -0.2, -0.112, 0.16, 0.18, 0.045);
    plate(hip, side * 0.12, -0.12, 0.015, 0.055, 0.17, 0.12, graphite);
    for (let i = 0; i < 5; i++) ring(hip, -0.34 - i * 0.014, 0.115, rubber);
    const knee = new T.Group();
    knee.position.y = -0.43;
    hip.add(knee);
    knees.push(knee);
    add(knee, new T.CapsuleGeometry(0.105, 0.17, 6, 16), cloth, 0, -0.17, 0);
    plate(knee, 0, -0.015, -0.095, 0.17, 0.17, 0.065, graphite);
    plate(knee, 0, -0.025, -0.132, 0.12, 0.105, 0.012, alloy);
    for (let i = 0; i < 3; i++) ring(knee, -0.31 - i * 0.018, 0.105, graphite);
    const foot = new T.Group();
    foot.position.y = -0.4;
    knee.add(foot);
    feet.push(foot);
    plate(foot, 0, -0.05, -0.055, 0.23, 0.2, 0.38, graphite);
    plate(foot, 0, -0.04, -0.16, 0.22, 0.12, 0.15, armor);
    plate(foot, 0, -0.155, -0.055, 0.245, 0.04, 0.4, rubber);
    ring(knee, -0.34, 0.112, trim);
    for (let i = 0; i < 5; i++)
      plate(foot, 0, -0.179, -0.21 + i * 0.075, 0.25, 0.015, 0.025, alloy);
  }
  const light = new T.SpotLight(0xe6faff, 0, 30, 0.48, 0.7);
  light.position.set(0.18, 1.98, -0.2);
  light.target.position.set(0.1, 1.5, -9);
  body.add(light, light.target);
  return { root, body, head, arms, elbows, legs, knees, feet, light };
}
export type Astronaut = ReturnType<typeof createAstronaut>;
export function animateAstronaut(
  a: Astronaut,
  s: {
    dt: number;
    time: number;
    phase: number;
    speed: number;
    grounded: boolean;
    verticalSpeed: number;
    landing: number;
    repair: boolean;
    reducedMotion: boolean;
  },
) {
  const { dt, phase, speed, grounded } = s;
  const weight = Math.min(speed / 2.1, 1),
    run = T.MathUtils.clamp((speed - 2.1) / 2.4, 0, 1);
  const damp = (o: T.Object3D, axis: "x" | "y" | "z", v: number) => {
    o.rotation[axis] = T.MathUtils.damp(o.rotation[axis], v, 12, dt);
  };
  a.legs.forEach((leg, i) => {
    const wave = Math.sin(phase + i * Math.PI);
    const swing = wave * (0.38 + run * 0.3) * weight;
    const bend = Math.max(0, -wave) * (0.7 + run * 0.6) * weight;
    damp(leg, "x", grounded ? swing : -0.2 + (i === 0 ? 0.08 : -0.08));
    damp(
      a.knees[i],
      "x",
      grounded
        ? -bend - s.landing * 2
        : -0.5 - Math.max(0, s.verticalSpeed) * 0.08,
    );
    damp(a.feet[i], "x", grounded ? -swing + bend : 0.18);
    damp(
      a.arms[i],
      "x",
      s.repair
        ? 0.9 + Math.sin(s.time * 7 + i) * 0.07
        : -swing * 0.6 + 0.05 + run * 0.13,
    );
    damp(
      a.arms[i],
      "z",
      s.repair ? (i === 0 ? -0.22 : 0.22) : i === 0 ? -0.09 : 0.09,
    );
    damp(
      a.elbows[i],
      "x",
      s.repair ? 0.65 + Math.sin(s.time * 9 + i) * 0.12 : 0.18 + run * 0.6,
    );
  });
  const bob = s.reducedMotion ? 0 : Math.abs(Math.sin(phase)) * 0.027 * weight;
  a.body.position.y = bob - s.landing + Math.sin(s.time * 1.8) * 0.003;
  damp(a.body, "x", s.repair ? 0.1 : run * 0.08);
  damp(a.body, "z", Math.sin(phase) * 0.025 * weight);
  damp(a.body, "y", Math.sin(phase) * 0.035 * weight);
  damp(
    a.head,
    "y",
    s.repair ? 0.12 : Math.sin(s.time * 0.5) * 0.025 * (1 - weight),
  );
}
