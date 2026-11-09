import * as T from "three";
import { industrialSurface } from "../environments/HardwareMaterials";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function buildHabitat(scene: T.Scene, moon = false) {
  const root = new T.Group();
  scene.add(root);
  const colliders: T.Mesh[] = [],
    solids: T.Box3[] = [],
    doors: T.Mesh[] = [],
    lights: T.PointLight[] = [],
    plants: T.Mesh[] = [],
    fans: T.Group[] = [],
    screens: T.Mesh[] = [];
  const hull = new T.MeshStandardMaterial({
    color: moon ? 0xd7cab3 : 0xbac2bc,
    metalness: 0.35,
    roughness: 0.48,
  });
  industrialSurface(hull, "paint", 0.25, 0.25);
  const panel = new T.MeshStandardMaterial({
    color: moon ? 0x918477 : 0x798d8e,
    metalness: 0.5,
    roughness: 0.57,
  });
  const dark = new T.MeshStandardMaterial({
    color: moon ? 0x3e3c36 : 0x24363e,
    metalness: 0.5,
    roughness: 0.68,
  });
  const surface = document.createElement("canvas");
  surface.width = surface.height = 256;
  const ctx = surface.getContext("2d")!;
  ctx.fillStyle = moon ? "#b2a593" : "#a3b0ad";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2300; i++) {
    const n = Math.sin(i * 157.31) * 43758.3,
      x = (n - Math.floor(n)) * 256,
      y = (i * 73) % 256;
    ctx.fillStyle = i % 3 ? "#ffffff09" : "#142c3020";
    ctx.fillRect(x, y, 1 + (i % 5) * 2, 1);
  }
  ctx.strokeStyle = "#253e4244";
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, 250, 250);
  for (const x of [10, 246])
    for (const y of [10, 246]) {
      ctx.fillStyle = "#294047";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 6.28);
      ctx.fill();
    }
  const floorTexture = new T.CanvasTexture(surface);
  floorTexture.colorSpace = T.SRGBColorSpace;
  const floorMat = new T.MeshStandardMaterial({
    map: floorTexture,
    bumpMap: floorTexture,
    bumpScale: 0.012,
    color: moon ? 0x736759 : 0x526268,
    metalness: 0.45,
    roughness: 0.65,
  });
  const yellow = new T.MeshStandardMaterial({
    color: 0xd69d52,
    metalness: 0.3,
    roughness: 0.6,
  });
  const trim = new T.MeshStandardMaterial({
    color: moon ? 0xffdbac : 0xbbeee2,
    emissive: moon ? 0xd9a664 : 0x81c9bc,
    emissiveIntensity: 1.7,
  });
  const warm = new T.MeshStandardMaterial({
    color: 0xffdfad,
    emissive: 0xeabb7d,
    emissiveIntensity: 2,
  });
  const add = (
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    p: T.Object3D = root,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
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
    m: T.Material = panel,
    round = false,
  ) =>
    add(
      round
        ? new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.13)
        : new T.BoxGeometry(w, h, d),
      m,
      x,
      y,
      z,
    );
  const solid = (o: T.Mesh) => {
    o.updateMatrixWorld();
    colliders.push(o);
    solids.push(new T.Box3().setFromObject(o));
    return o;
  };
  const text = (
    content: string,
    x: number,
    y: number,
    z: number,
    w = 2.1,
    h = 0.38,
    color = "#b9e1db",
  ) => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = moon ? "#322a22" : "#142a33";
    ctx.fillRect(0, 0, 768, 160);
    ctx.fillStyle = color;
    ctx.font = "600 43px monospace";
    ctx.fillText(content, 25, 66);
    ctx.font = "20px monospace";
    ctx.fillStyle = "#7daba8";
    ctx.fillText("FRONTIER  /  OUTPOST SYSTEMS", 25, 116);
    const m = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) });
    return box(x, y, z, w, h, 0.025, m);
  };
  const screen = (
    x: number,
    y: number,
    z: number,
    title: string,
    w = 1.3,
    h = 0.65,
  ) => {
    box(x, y, z, w + 0.12, h + 0.12, 0.12, dark, true);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0c252d";
    ctx.fillRect(0, 0, 512, 256);
    const t = new T.CanvasTexture(c);
    const m = new T.MeshStandardMaterial({
      map: t,
      emissive: 0xffffff,
      emissiveMap: t,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    });
    const face = box(x, y, z + 0.072, w, h, 0.012, m);
    face.userData.canvas = c;
    face.userData.title = title;
    screens.push(face);
    return face;
  };
  const pipe = (points: number[][], radius = 0.055, m: T.Material = dark) =>
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((v) => new T.Vector3(v[0], v[1], v[2])),
        ),
        32,
        radius,
        8,
        false,
      ),
      m,
      0,
      0,
      0,
    );
  // Trace the outer and inner faces together so the pressure shell has a
  // correctly wound ceiling from both the EVA and cabin cameras.
  const arch = (annexOpening: number, thickness = .18) => {
    const shape = new T.Shape();
    const innerWidth = 7 - thickness;
    const innerCeiling = 4.4 - thickness;
    shape.moveTo(-7, 0);
    shape.lineTo(-7, 2.5);
    shape.quadraticCurveTo(-7, 4.4, -4, 4.4);
    shape.lineTo(4, 4.4);
    shape.quadraticCurveTo(7, 4.4, 7, 2.5);
    shape.lineTo(7, annexOpening);
    shape.lineTo(innerWidth, annexOpening);
    shape.lineTo(innerWidth, 2.5);
    shape.quadraticCurveTo(innerWidth, innerCeiling, 4, innerCeiling);
    shape.lineTo(-4, innerCeiling);
    shape.quadraticCurveTo(-innerWidth, innerCeiling, -innerWidth, 2.5);
    shape.lineTo(-innerWidth, 0);
    shape.closePath();
    return shape;
  };
  const closed = arch(0), open = arch(2.45);
  for (const [start, depth, shape] of [
    [-34, 9.8, closed],
    [-24.2, 2.4, open],
    [-21.8, 11.8, closed],
  ] as const) {
    const shell = add(
      new T.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: false,
        curveSegments: 12,
      }),
      hull,
      0,
      0,
      start,
    );
    colliders.push(shell);
  }
  for (let z = -12; z > -34; z -= 2) {
    box(0, 4.17, z, 7.7, 0.12, 1.93, hull, true);
    for (const x of [-3.8, 3.8]) box(x, 4.08, z, .075, .07, 1.91, panel);
  }
  solid(box(-7, 2, -22, 0.2, 4, 24, hull));
  solid(box(7, 2, -29.1, 0.2, 4, 9.8, hull));
  solid(box(7, 2, -15.9, 0.2, 4, 11.8, hull));
  solid(box(0, 2.2, -34, 14, 4.4, 0.2, hull));
  for (const x of [-4.1, 4.1]) solid(box(x, 2.05, -10, 5.7, 4.1, 0.2, hull));
  box(0, 4.05, -10, 2.6, 0.7, 0.24, hull);
  box(0, 0.025, -22, 14, 0.15, 24, floorMat);
  // Modular floor tiles, recessed walking lights, cable trays and hull ribs.
  for (let z = -11; z > -34; z -= 1.5) {
    for (let x = -6; x < 7; x += 2) {
      box(x, 0.108, z, 1.96, 0.025, 1.46, floorMat);
      for (const dx of [-0.85, 0.85])
        box(x + dx, 0.126, z, 0.025, 0.015, 1.2, dark);
    }
  }
  for (const x of [-1.25, 1.25]) {
    box(x, 0.14, -22, 0.025, 0.02, 23, yellow);
    for (let z = -13; z > -34; z -= 2) box(x, 0.16, z, 0.07, 0.025, 0.6, trim);
  }
  const ribShape = arch(0, .27);
  for (let z = -10.2; z > -34; z -= 3.9) {
    add(
      new T.ExtrudeGeometry(ribShape, {
        depth: 0.1,
        bevelEnabled: false,
        curveSegments: 12,
      }),
      dark,
      0,
      0,
      z,
    );
    for (const x of [-5.7, 5.7]) box(x, 3.74, z, 0.5, 0.075, 0.8, warm);
  }
  for (const x of [-6.55, 6.55]) {
    pipe(
      [
        [x, 0.3, -12],
        [x, 3, -12],
        [x, 3.4, -15],
        [x, 3.4, -32],
      ],
      0.09,
      panel,
    );
    pipe(
      [
        [x, 2.8, -11],
        [x, 2.8, -33],
      ],
      0.045,
      yellow,
    );
    for (let z = -14; z > -34; z -= 4) {
      box(x, 3.4, z, 0.3, 0.3, 0.1, dark);
      box(x, 3.4, z, 0.08, 0.12, 0.13, yellow);
    }
  }
  for (const z of [-15, -21.5, -28, -32]) {
    const l = new T.PointLight(z === -15 || moon ? 0xffdfba : 0xc9eee6, 30, 15, 1.6);
    l.position.set(0, 3.6, z);
    root.add(l);
    lights.push(l);
    box(0, 4.13, z, 2.8, 0.06, 0.35, warm);
  }
  // Airlock hardware, double doors and exterior deck.
  for (const x of [-1.42, 1.42]) {
    solid(box(x, 1.55, -11, 0.18, 3.1, 2.2, hull));
    for (const z of [-10.6, -11.4])
      box(x + (x < 0 ? 0.1 : -0.1), 1.5, z, 0.025, 2.4, 0.025, dark);
    box(x + (x < 0 ? 0.11 : -0.11), 2.65, -11, 0.025, 0.05, 1.5, trim);
    box(x + (x < 0 ? 0.11 : -0.11), 0.35, -11, 0.025, 0.08, 1.6, yellow);
  }
  solid(box(0, 3.13, -11, 3, 0.16, 2.2, hull));
  box(0, 0.14, -11, 2.65, 0.1, 2, floorMat);
  box(0, 3.02, -11, 1.2, 0.025, 0.35, warm);
  text("PRESSURE CHAMBER", 0, 2.65, -11.87, 1.8, 0.22);
  for (const z of [-10, -12]) {
    const door = box(0, 1.45, z, 2.45, 2.8, 0.16, dark, true);
    doors.push(door);
    colliders.push(door);
    for (const x of [-1.35, 1.35]) box(x, 1.5, z, 0.16, 3, 0.3, yellow);
    box(0, 2.97, z, 2.8, 0.12, 0.3, yellow);
  }
  box(0, 0.04, -8.6, 3, 0.12, 4.2, dark);
  for (let i = 0; i < 12; i++)
    box(0, 0.11, -6.7 - i * 0.32, 2.6, 0.025, 0.035, panel);
  text("01 / FRONTIER", 0, 3.55, -9.83, 2.5, 0.5);
  text("AIRLOCK / EVA", 0, 2.7, -9.88, 1.8, 0.25);
  // Exterior portholes and pressure-panel detailing are built by OutpostDetail.
  // Command bay: multi-monitor workstation, chair, shelves and storage.
  text("COMMAND / 01", -4.5, 2.8, -17.65);
  solid(box(-4.5, 0.75, -17.3, 3.8, 1.35, 0.6, dark, true));
  box(-4.5, 1.44, -17, 4, 0.1, 1, panel, true);
  for (const x of [-5.7, -4.4, -3.1]) {
    screen(
      x,
      1.95,
      -17.45,
      x === -4.4 ? "OUTPOST STATUS" : "TELEMETRY",
      1.12,
      0.65,
    );
    box(x, 1.5, -16.7, 0.8, 0.03, 0.25, dark);
  }
  box(-4.4, 0.7, -15.8, 0.9, 0.15, 0.85, dark, true);
  box(-4.4, 1.17, -15.45, 0.9, 0.9, 0.14, dark, true);
  add(new T.CylinderGeometry(0.05, 0.09, 0.5, 12), panel, -4.4, 0.37, -15.8);
  for (let i = 0; i < 3; i++) {
    box(-6.4, 0.5 + i * 0.52, -14, 1, 0.45, 1, dark, true);
    text("CARGO 0" + (i + 1), -6.4, 0.5 + i * 0.52, -13.48, 0.75, 0.18);
  }
  // Hydroponics: real leaf clusters, plumbing and hanging grow lights.
  text("BOTANICAL LAB / 02", -4.3, 2.85, -23.55, 3, 0.4);
  screen(-3, 1.65, -22.3, "IRRIGATION", 1.15, 0.55);
  const leafMat = new T.MeshStandardMaterial({
    color: 0x50805a,
    roughness: 0.85,
    side: T.DoubleSide,
  });
  for (const z of [-21, -23.5]) {
    solid(box(-4.7, 0.95, z, 3.2, 0.14, 1.15, panel, true));
    for (const x of [-6, -3.4]) {
      box(x, 0.48, z, 0.08, 0.9, 0.08, dark);
      pipe(
        [
          [x, 0.9, z],
          [x, 0.5, z],
          [x, 0.5, -24.3],
        ],
        0.035,
      );
    }
    box(-4.7, 2.3, z, 3.2, 0.075, 1, dark, true);
    box(
      -4.7,
      2.24,
      z,
      2.9,
      0.025,
      0.8,
      new T.MeshStandardMaterial({
        color: 0xd8cbf9,
        emissive: 0xc6a8f3,
        emissiveIntensity: 1.3,
      }),
    );
    for (let i = 0; i < 8; i++) {
      const x = -5.95 + (i % 4) * 0.82,
        pz = z - 0.28 + Math.floor(i / 4) * 0.55;
      add(new T.CylinderGeometry(0.15, 0.11, 0.16, 12), dark, x, 1.08, pz);
      const stem = add(
        new T.CylinderGeometry(0.012, 0.018, 0.32, 6),
        leafMat,
        x,
        1.31,
        pz,
      );
      plants.push(stem);
      for (let j = 0; j < 5; j++) {
        const leaf = add(
          new T.SphereGeometry(1, 12, 8),
          leafMat,
          x + Math.cos(j * 2.4) * 0.1,
          1.3 + j * 0.027,
          pz + Math.sin(j * 2.4) * 0.1,
        );
        leaf.scale.set(0.15, 0.025, 0.065);
        leaf.rotation.set(j * 0.15, j * 2.4, 0.35);
        plants.push(leaf);
      }
    }
  }
  add(new T.CylinderGeometry(0.3, 0.3, 0.8, 20), panel, -6, 0.5, -24.7);
  pipe(
    [
      [-6, 0.9, -24.7],
      [-6, 1.3, -24.7],
      [-4.7, 1.3, -24.7],
      [-4.7, 0.8, -23.5],
    ],
    0.04,
    yellow,
  );
  // Life support: tank manifolds, service racks, filters and rotating fans.
  text("LIFE SUPPORT / 03", 4.5, 3, -26.5, 3, 0.42);
  screen(3, 1.65, -26.3, "ATMOSPHERIC LOOP", 1.5, 0.7);
  solid(box(3, 0.75, -26.3, 1.7, 1.4, 0.7, dark, true));
  for (let i = 0; i < 3; i++) {
    const z = -25 - i * 0.85;
    add(new T.CapsuleGeometry(0.26, 1.15, 8, 24), hull, 5.7, 1.1, z);
    for (const y of [0.7, 1.5]) box(5.7, y, z, 0.64, 0.07, 0.61, dark);
    pipe(
      [
        [5.7, 1.9, z],
        [5.7, 2.4, z],
        [4.8, 2.4, z],
        [4.8, 2.4, -28],
      ],
      0.045,
      yellow,
    );
  }
  for (const z of [-28.7, -30.7]) {
    solid(box(5.7, 1.2, z, 1.3, 2.3, 1, dark, true));
    screen(5.7, 1.9, z + 0.52, "BATTERY BANK", 0.9, 0.35);
    for (let i = 0; i < 6; i++) {
      box(5.7, 0.3 + i * 0.22, z + 0.52, 1.07, 0.18, 0.035, panel);
      box(6.13, 0.3 + i * 0.22, z + 0.55, 0.04, 0.08, 0.02, trim);
    }
  }
  for (const x of [-5.9, 5.9]) {
    box(x, 2.6, -33.8, 1, 0.8, 0.2, dark);
    const fan = new T.Group();
    fan.position.set(x, 2.6, -33.64);
    for (let i = 0; i < 5; i++) {
      const blade = new T.Mesh(
        new RoundedBoxGeometry(0.5, 0.11, 0.03, 1, 0.02),
        panel,
      );
      blade.position.x = 0.2;
      const pivot = new T.Group();
      pivot.rotation.z = (i * Math.PI * 2) / 5;
      pivot.add(blade);
      fan.add(pivot);
    }
    root.add(fan);
    fans.push(fan);
  }
  // Crew quarters and medical station on the east side.
  text("CREW / 04", 4.6, 2.9, -16.8, 2.4, 0.4, "#e8caa1");
  for (const y of [0.55, 1.75]) {
    solid(box(5.5, y, -15.4, 2.5, 0.12, 1.15, dark, true));
    box(
      5.5,
      y + 0.12,
      -15.4,
      2.3,
      0.18,
      1.05,
      new T.MeshStandardMaterial({ color: 0x899e9e, roughness: 0.95 }),
      true,
    );
    box(6.2, y + 0.24, -15.4, 0.6, 0.17, 0.85, hull, true);
    box(5.1, y + 0.25, -15.4, 1.2, 0.07, 1.08, dark);
  }
  for (let i = 0; i < 3; i++) {
    solid(box(3 + i * 0.85, 1, -19.4, 0.75, 1.8, 0.7, panel, true));
    box(3 + i * 0.85, 1.2, -19.02, 0.035, 0.3, 0.025, yellow);
  }
  solid(box(5.7, 0.85, -21.7, 1.5, 1.5, 0.7, hull, true));
  text("+ MEDICAL", 5.7, 1.3, -21.32, 1.1, 0.28, "#e7a98e");
  // Reinforced shelter, layered water shielding and recognizable entrance.
  text("RADIATION SHELTER", 0, 2.8, -33.65, 3.3, 0.5, "#e8c99b");
  screen(0, 1.8, -33.6, "SHIELDING / READY", 1.7, 0.6);
  for (const x of [-3, 3]) {
    for (let i = 0; i < 3; i++)
      box(x, 1.1, -32.6 + i * 0.7, 0.85, 2, 0.55, panel, true);
    box(x, 2.2, -31.8, 1, 0.12, 2.3, yellow);
  }
  for (const x of [-1.8, 1.8]) {
    box(x, 1.35, -30, 0.16, 2.7, 0.3, dark);
    box(x, 1.4, -29.82, 0.07, 2.3, 0.04, yellow);
  }
  box(0, 2.7, -30, 3.8, 0.18, 0.3, dark);
  // Work-zone boundaries remain open so third-person traversal stays legible.
  for (const z of [-18.8, -24.8, -29])
    for (const x of [-4.8, 4.8]) {
      solid(box(x, 0.6, z, 3.7, 1.1, 0.13, panel, true));
      box(x, 1.19, z, 3.8, 0.08, 0.17, dark);
    }
  return { root, colliders, solids, doors, lights, plants, fans, screens };
}
export function updateHabitatScreens(
  screens: T.Mesh[],
  data: {
    battery: number;
    oxygen: number;
    water: number;
    time: number;
    storm: boolean;
    history: number[][];
  },
) {
  for (const screen of screens) {
    const c = screen.userData.canvas as HTMLCanvasElement,
      ctx = c.getContext("2d")!;
    const title = screen.userData.title as string;
    const oxygen = title.includes("ATMOSPHERIC"),
      water = title.includes("IRRIGATION");
    const index = oxygen ? 0 : water ? 2 : 1;
    const value = oxygen ? data.oxygen : water ? data.water : data.battery;
    ctx.fillStyle = "#0b2028";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#b8e7d8";
    ctx.font = "22px monospace";
    ctx.fillText(title, 20, 32);
    ctx.font = "bold 43px monospace";
    ctx.fillText(value.toFixed(1) + "%", 20, 91);
    ctx.font = "15px monospace";
    ctx.fillStyle = "#7daaa7";
    ctx.fillText(
      oxygen ? "OXYGEN RESERVE" : water ? "WATER RESERVE" : "BATTERY RESERVE",
      215,
      84,
    );
    ctx.strokeStyle = "#25444c";
    for (let y = 115; y < 215; y += 25) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(492, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#90d9bc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.history.forEach((row, i) => {
      const x = 20 + (i * 470) / Math.max(1, data.history.length - 1),
        y = 210 - row[index] * 0.9;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = data.storm ? "#e8b67e" : "#87b9a8";
    ctx.font = "15px monospace";
    ctx.fillText(
      data.storm
        ? "ENVIRONMENTAL ALERT"
        : data.history.length
          ? "LIVE OUTPOST TELEMETRY"
          : "COLLECTING TELEMETRY",
      20,
      241,
    );
    ctx.fillText(String(data.time) + "s", 430, 241);
    (screen.material as T.MeshStandardMaterial).map!.needsUpdate = true;
  }
}
