import { drawFieldLabel, fieldLabel, type FieldLabel } from "./FieldLabel";
import { RobotTrack } from "./RobotTrack";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Destination } from "../simulation/engine";
import {
  initialAdventure,
  sampleSites,
  robotSites,
  recoveryBay,
  type Adventure,
  type Upgrade,
} from "./Adventure";
import type { ExplorerVehicle } from "./Vehicle";
const scanWindows = [[0.57, 0.71], [0.26, 0.38]] as const;

export type FieldAction = {
  type: "sample" | "robot" | "delivered";
  id: string;
};
export type FieldInfo = { name: string; text: string; progress: number; scanWindow?: readonly [number, number] };
export class WorldAdventure {
  data = initialAdventure();
  samples: ReturnType<typeof sampleSites>;
  robots: ReturnType<typeof robotSites>;
  robotModels = new Map<string, T.Group>();
  sampleModels = new Map<string, T.Group>();
  sampleRocks = new Map<string, T.Mesh>();
  expansions = new Map<Upgrade, T.Group>();
  solidMeshes: T.Mesh[] = [];
  robotBodies = new Map<string, T.Mesh>();
  labels: T.Mesh[] = [];
  boundCache = new WeakMap<T.Mesh, T.Box3>();
  hold: { id: string; type: "sample" | "robot"; elapsed: number; step: number;  feedback: string } | null = null;
  tracks = new Map<string, RobotTrack>();
  tool = new T.Group();
  tow: T.Mesh;
  deliveredLatch = false;
  constructor(
    public scene: T.Scene,
    public destination: Destination,
    public ground: (x: number, z: number) => number,
    public status: (i: FieldInfo | null) => void,
    public complete: (a: FieldAction) => void,
  ) {
    this.samples = sampleSites(destination);
    this.robots = robotSites(destination);
    const mesh = (
      parent: T.Object3D,
      g: T.BufferGeometry,
      c: number,
      x = 0,
      y = 0,
      z = 0,
      glow = false,
    ) => {
      const m = new T.Mesh(
        g,
        new T.MeshStandardMaterial({
          color: c,
          roughness: 0.5,
          metalness: 0.4,
          emissive: glow ? c : 0,
          emissiveIntensity: glow ? 0.7 : 0,
        }),
      );
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const box = (
      p: T.Object3D,
      w: number,
      h: number,
      d: number,
      c: number,
      x = 0,
      y = 0,
      z = 0,
    ) => mesh(p, new RoundedBoxGeometry(w, h, d, 2, 0.045), c, x, y, z);
    const group = (x: number, z: number) => {
      const g = new T.Group();
      g.position.set(x, ground(x, z), z);
      scene.add(g);
      return g;
    };
    const label = (g: T.Group, text: string, y = 1.8) => {
      const m = fieldLabel(2.16);
      drawFieldLabel(m, text, "Outpost services");
      m.position.y = y;
      g.add(m);
      this.labels.push(m);
      g.userData.label = m;
    };
    for (const site of this.samples) {
      const g = group(site.x, site.z);
      g.name = "Sample station";
      this.sampleModels.set(site.id, g);
      this.solidMeshes.push(
        mesh(g, new T.CylinderGeometry(0.45, 0.54, 0.3, 16), 0x344953, 0, 0.15),
      );
      mesh(
        g,
        new T.TorusGeometry(0.36, 0.025, 8, 32),
        0x81cfbf,
        0,
        0.32,
      ).rotation.x = Math.PI / 2;
      const rock = mesh(
        g,
        new T.IcosahedronGeometry(0.23, 1),
        site.colour,
        0,
        0.58,
      );
      this.sampleRocks.set(site.id, rock);
      label(g, "Research sample", 1.4);
    }
    for (const [i, site] of this.robots.entries()) {
      const g = group(site.x, site.z);
      g.name = "Rescue robot";
      this.robotModels.set(site.id, g);
      const body = box(g, 0.85, 0.46, 1.1, i ? 0xe5b77b : 0x8aafb4, 0, 0.62);
      this.robotBodies.set(site.id, body);
      this.tracks.set(site.id, new RobotTrack(g));
      for (const x of [-0.48, 0.48])
        for (const z of [-0.38, 0.38]) {
          const wheel = mesh(
            g,
            new T.CylinderGeometry(0.25, 0.25, 0.17, 16),
            0x24343c,
            x,
            0.27,
            z,
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.userData.wheel = true;
          mesh(g, new T.SphereGeometry(0.07, 10, 8), 0xd2d8c2, x, 0.27, z);
        }
      box(g, 0.54, 0.31, 0.35, 0x344b56, 0, 1, -0.28);
      for (const x of [-0.16, 0.16])
        mesh(
          g,
          new T.SphereGeometry(0.06, 12, 8),
          0xe8c777,
          x,
          1.03,
          -0.48,
          true,
        );
      box(g, 0.65, 0.025, 0.45, 0x21445a, 0, 0.88, 0.2);
      for (let n = 0; n < 5; n++)
        box(g, 0.015, 0.025, 0.42, 0x8aa6ae, -0.27 + n * 0.13, 0.9, 0.2);
      mesh(
        g,
        new T.CylinderGeometry(0.018, 0.018, 0.4, 8),
        0xc2cabc,
        0.25,
        1.25,
        0.2,
      );
      mesh(
        g,
        new T.SphereGeometry(0.04, 10, 8),
        0xf2c980,
        0.25,
        1.47,
        0.2,
        true,
      );
      label(g, site.name, 1.8);
    }
    const bay = group(recoveryBay.x, recoveryBay.z);
    mesh(bay, new T.CylinderGeometry(2.1, 2.2, 0.16, 64), 0x4d4c47, 0, 0.018);
    mesh(
      bay,
      new T.TorusGeometry(1.9, 0.023, 8, 64),
      0xd9bc83,
      0,
      0.102,
      0,
      true,
    ).rotation.x = Math.PI / 2;
    label(bay, "Robot recovery", 2.5);
    const terminal = group(3, -15);
    this.solidMeshes.push(box(terminal, 1, 0.9, 0.65, 0x304952, 0, 0.45));
    box(terminal, 0.9, 0.5, 0.08, 0x80c8b5, 0, 1.12, -0.1);
    label(terminal, "Fabrication station", 1.85);
    for (const kind of ["solar", "recycler", "workshop"] as Upgrade[]) {
      const g = group(
        kind === "solar" ? 18 : kind === "recycler" ? -9.4 : -10,
        kind === "solar" ? -18 : kind === "recycler" ? -26 : -7,
      );
      g.visible = false;
      this.expansions.set(kind, g);
      if (kind === "solar") {
        for (const x of [-2, 2])
          for (const z of [-1, 1])
            this.solidMeshes.push(
              box(g, 0.12, 2.5, 0.12, 0x8c9c9c, x, 1.25, z),
            );
        const panel = new T.Group();
        panel.position.y = 2.5;
        panel.rotation.x = -0.25;
        g.add(panel);
        this.solidMeshes.push(box(panel, 4.8, 0.12, 3.1, 0x9babb0));
        box(panel, 4.6, 0.035, 2.9, 0x183c58, 0, 0.09);
        for (let x = -2.1; x <= 2.2; x += 0.42)
          box(panel, 0.018, 0.02, 2.85, 0x789caf, x, 0.12);
        for (let z = -1.3; z <= 1.4; z += 0.43)
          box(panel, 4.5, 0.02, 0.018, 0x789caf, 0, 0.12, z);
        label(g, "Solar expansion", 3.5);
      } else if (kind === "recycler") {
        for (const z of [-1, 1]) {
          this.solidMeshes.push(
            mesh(
              g,
              new T.CylinderGeometry(0.65, 0.65, 2.3, 24),
              0xa2b6b5,
              0,
              1.2,
              z,
            ),
          );
          for (const y of [0.35, 1.9])
            mesh(
              g,
              new T.TorusGeometry(0.66, 0.045, 8, 24),
              0x3e656b,
              0,
              y,
              z,
            ).rotation.x = Math.PI / 2;
          box(g, 0.25, 1.1, 0.15, 0x79c6bc, 0.6, 1.1, z);
        }
        label(g, "Water recovery", 2.8);
      } else {
        this.solidMeshes.push(box(g, 2.4, 0.8, 1, 0x3d5960, 0, 0.4));
        box(g, 2.6, 0.1, 1.15, 0xc6c3ad, 0, 0.86);
        for (const x of [-1.1, 1.1])
          this.solidMeshes.push(
            box(g, 0.13, 2.5, 0.13, 0xd9b579, x, 1.25, 0.45),
          );
        box(g, 2.5, 0.13, 0.15, 0x98c8bd, 0, 2.45, 0.45);
        for (let i = 0; i < 5; i++)
          box(g, 0.15, 0.38, 0.18, 0xd6b580, -0.8 + i * 0.4, 1.12);
        label(g, "Field workshop", 2.9);
      }
    }
    box(this.tool, 0.14, 0.1, 0.3, 0xe6bf72);
    mesh(
      this.tool,
      new T.CylinderGeometry(0.025, 0.025, 0.3, 8),
      0xb9c8c7,
      0,
      0,
      -0.25,
    ).rotation.x = Math.PI / 2;
    scene.add(this.tool);
    this.tool.visible = false;
    this.tow = mesh(
      scene,
      new T.CylinderGeometry(0.022, 0.022, 1, 8),
      0xd1b571,
    );
    this.tow.visible = false;
  }
  targets() {
    return [
      ...this.samples.map((s) => ({ ...s, id: "sample:" + s.id })),
      ...this.robots
        .filter((r) => !this.data.rescued.includes(r.id))
        .map((r) => {
          const p = this.robotModels.get(r.id)!.position;
          return { ...r, id: "robot:" + r.id, x: p.x, z: p.z };
        }),
      recoveryBay,
    ];
  }
  stamp(g: T.Group, text: string) {
    if (g.userData.stamp === text) return;
    g.userData.stamp = text;
    const label = g.userData.label as FieldLabel | undefined;
    if (label) drawFieldLabel(label, text, "Field operations");
  }
  nearest(p: T.Vector3) {
    return this.targets()
      .filter(
        (s) =>
          s.id !== "recovery" &&
          (!s.id.startsWith("sample:") ||
            !this.data.samples.includes(s.id.slice(7))),
      )
      .map((s) => ({ site: s, distance: Math.hypot(s.x - p.x, s.z - p.z) }))
      .sort((a, b) => a.distance - b.distance)[0];
  }
  bounds(excludeTow = false) {
    const out: T.Box3[] = [];
    for (const m of this.solidMeshes) {
      let visible = true;
      for (let p: T.Object3D | null = m; p; p = p.parent)
        if (!p.visible) visible = false;
      if (visible) {
        m.updateWorldMatrix(true, false);
        const b = this.boundCache.get(m) || new T.Box3();
        if (!this.boundCache.has(m)) {
          b.setFromObject(m);
          this.boundCache.set(m, b);
        }
        this.boundCache.set(m, b);
        (b as T.Box3 & { sourceMesh?: T.Mesh }).sourceMesh = m;
        out.push(b);
      }
    }
    for (const [id, m] of this.robotBodies) {
      if (excludeTow && this.data.towing === id) continue;
      m.updateWorldMatrix(true, false);
      out.push(new T.Box3().setFromObject(m).expandByScalar(0.16));
    }
    return out;
  }
  sync(data: Adventure, vehicle: ExplorerVehicle, dt: number) {
    this.data = data;
    for (const [kind, g] of this.expansions)
      g.visible = data.upgrades.includes(kind);
    for (const [id, rock] of this.sampleRocks) {
      rock.rotation.y += dt * 0.2;
      rock.scale.setScalar(data.samples.includes(id) ? 0.45 : 1);
      this.stamp(
        this.sampleModels.get(id)!,
        data.samples.includes(id) ? "Sample recorded" : "Research sample",
      );
    }
    for (const [i, site] of this.robots.entries()) {
      const robot = this.robotModels.get(site.id)!;
      const working = this.hold?.type === "robot" && this.hold.id === site.id;
      this.tracks.get(site.id)!.draw(working, data.readyRobots.includes(site.id) || data.rescued.includes(site.id) || data.towing === site.id);
      robot.userData.label.visible = !working;
      this.stamp(
        robot,
        data.rescued.includes(site.id)
          ? "RECOVERED / ONLINE"
          : data.towing === site.id
            ? "TOW LINK ACTIVE"
            : data.readyRobots.includes(site.id)
              ? "TRACK REPAIRED"
              : "ROBOT / SOS",
      );
      if (data.towing === site.id) {
        robot.position.set(
          vehicle.state.x + Math.sin(vehicle.state.yaw) * 3.2,
          0,
          vehicle.state.z + Math.cos(vehicle.state.yaw) * 3.2,
        );
        robot.position.y = this.ground(robot.position.x, robot.position.z);
        robot.rotation.y = vehicle.state.yaw;
        robot.traverse((o) => {
          if (o.userData.wheel)
            o.rotation.x -= (vehicle.state.speed * dt) / 0.25;
        });
      } else if (data.rescued.includes(site.id)) {
        const x = -11.5 + (i % 2) * 3, z = -5.5 + Math.floor(i / 2) * 3;
        robot.position.set(x, this.ground(x, z), z);
        robot.rotation.y = Math.PI;
      } else {
        robot.position.set(site.x, this.ground(site.x, site.z), site.z);
        robot.rotation.y = 0.35;
      }
    }
    this.tow.visible = !!data.towing;
    if (data.towing) {
      const bot = this.robotModels.get(data.towing)!;
      const start = vehicle.root.localToWorld(
          new T.Vector3(0, 0.7, vehicle.halfLength),
        ),
        end = bot.position
          .clone()
          .add(
            new T.Vector3(
              -Math.sin(vehicle.state.yaw) * 0.6,
              0.55,
              -Math.cos(vehicle.state.yaw) * 0.6,
            ),
          ),
        d = end.clone().sub(start);
      this.tow.position.copy(start).lerp(end, 0.5);
      this.tow.scale.y = d.length();
      this.tow.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        d.normalize(),
      );
    }
  }
  start(type: "sample" | "robot", id: string) {
    if (this.hold) return;
    this.hold = { type, id, elapsed: 0, step: 0, feedback: "" };
    this.showTask();
  }
  showTask() {
    const h = this.hold;
    if (!h) return;
    if (h.type === "robot") {
      const wrapped = this.tracks.get(h.id)!.wrapped;
      this.status({ name: "Broken track", progress: wrapped ? 0.75 : 0,
        text: wrapped ? "Grab the amber tensioner between the wheels. Pull it up to the green ring until the tread is taut."
          : "Grab the amber tread end. Drag it along the green guide around both wheels, back to where you started." });

    } else {
      this.status({
        name: "Sample scan · pulse " + (h.step + 1) + " of 2",
        text: h.feedback + " Capture the pulse when the white line enters the striped zone.",
        scanWindow: scanWindows[h.step], progress: h.step / 2,
      });
    }
  }
  get scanPosition() {
    return 1 - Math.abs(1 - ((this.hold?.elapsed ?? 0) * 1.05) % 2);
  }
  capturePulse() {
    const h = this.hold;
    if (h?.type !== "sample") return;
    const [low, high] = scanWindows[h.step];
    if (this.scanPosition < low || this.scanPosition > high) {
      h.feedback = "Missed it. Try the next pass.";
      this.showTask();
      return;
    }
    h.feedback = "First pulse recorded.";
    h.elapsed = 0;
    this.advanceTask();
  }
  dragTrack(pointer: T.Vector2, camera: T.Camera, id: number, start: boolean) {
    const h = this.hold;
    if (h?.type !== "robot") return;
    const track = this.tracks.get(h.id)!;
    const wrapped = track.wrapped;
    const ray = new T.Raycaster();
    ray.setFromCamera(pointer, camera);
    if (track.drag(ray.ray, id, start)) {
      this.cancel();
      this.complete({ type: "robot", id: h.id });
    } else if (wrapped !== track.wrapped) this.showTask();
  }
  releaseTrack(id?: number) {
    if (this.hold?.type !== "robot") return;
    const track = this.tracks.get(this.hold.id)!;
    if (id === undefined || track.pointer === id) track.pointer = null;
  }
  private advanceTask() {
    const h = this.hold!;
    h.step++;
    if (h.step === 2) {
      this.cancel();
      this.complete({ type: h.type, id: h.id });
    } else this.showTask();
  }
  cancel() {
    if (this.hold?.type === "robot") this.tracks.get(this.hold.id)!.reset();
    this.hold = null;
    this.tool.visible = false;
    this.status(null);
  }
  update(dt: number, p: T.Object3D, vehicle: ExplorerVehicle) {
    if (
      this.data.towing &&
      Math.hypot(
        vehicle.state.x - recoveryBay.x,
        vehicle.state.z - recoveryBay.z,
      ) < 2.6 &&
      Math.abs(vehicle.state.speed) < 0.3 &&
      !vehicle.transition
    ) {
      if (!this.deliveredLatch) {
        this.deliveredLatch = true;
        this.complete({ type: "delivered", id: this.data.towing });
      }
    } else this.deliveredLatch = false;
    if (!this.hold) return;
    const h = this.hold,
      site =
        h.type === "sample"
          ? this.samples.find((s) => s.id === h.id)!
          : this.robots.find((r) => r.id === h.id)!;
    if (
      Math.hypot(site.x - p.position.x, site.z - p.position.z) > 2.8
    ) {
      this.cancel();
      return;
    }
    h.elapsed += dt;
    const dir = new T.Vector3(
      site.x - p.position.x,
      0,
      site.z - p.position.z,
    ).normalize();
    p.rotation.y = Math.atan2(-dir.x, -dir.z);
    this.tool.visible = h.type === "sample";
    this.tool.position.copy(p.position).addScaledVector(dir, 0.65);
    this.tool.position.y += 1.05;
    this.tool.rotation.set(0, p.rotation.y, Math.sin(h.elapsed * 8) * 0.12);

  }
  hands() {
    return this.hold
      ? {
          right: this.tool.position.clone(),
          left: this.tool.position.clone().add(new T.Vector3(0.12, 0.02, 0.06)),
        }
      : null;
  }
  cameraPose(p: T.Vector3) {
    if (!this.hold) return null;
    if (this.hold.type === "robot") {
      const robot = this.robotModels.get(this.hold.id)!;
      return { look: robot.localToWorld(new T.Vector3(0.52, 0.38, 0)),
        position: robot.localToWorld(new T.Vector3(2.15, 0.48, 0)) };
    }
    const site =
      this.hold.type === "sample"
        ? this.samples.find((s) => s.id === this.hold!.id)!
        : this.robots.find((s) => s.id === this.hold!.id)!;
    const look = new T.Vector3(site.x, this.ground(site.x, site.z) + 0.55, site.z);
    const offset = new T.Vector3(p.x - site.x, 0, p.z - site.z);
    if (!offset.lengthSq()) offset.z = 1;
    offset.setLength(1.65);
    offset.y = 0.95;
    return { look, position: look.clone().add(offset) };
  }
}
