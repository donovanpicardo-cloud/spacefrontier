import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { industrialSurface } from "./environments/HardwareMaterials";
import { serviceEquipment } from "./ServiceEquipment";
import type { Destination } from "../simulation/engine";
import {
  repairPlan,
  angularDelta,
  socketY,
  matchingSocket,
  SOCKET_X,
  cableStart,
  cableOrigin,
  type RepairKind,
  type RepairStep,
} from "./RepairPlan";

export type RepairInfo = {
  title: string;
  instruction: string;
  progress: number;
  step: number;
  steps: number;
};
const locations = {
  solar: [8.8, 1.4, -4.5],
  greenhouse: [-1.9, 1.4, -22],
  life: [3, 1.4, -25.82],
} as const;
const colours = [0xf2c873, 0x8de2d0, 0xb6b9ff];
const symbols = ["○", "△", "□"];
type Device = { root: T.Group; parts: T.Group; lamp: T.Mesh; fixed: boolean };
export class WorldRepairs {
  devices = new Map<RepairKind, Device>();
  active: RepairKind | null = null;
  plan: RepairStep[] = [];
  stepIndex = 0;
  connected = new Set<number>();
  cleaned = new Set<number>();
  turns: number[] = [];
  cartridge = 0;
  held = false;
  selected = 0;
  cursor = new T.Vector3(-0.4, 0, 0.16);
  lastAngle = 0;
  finishIn = 0;
  plugs: T.Mesh[] = [];
  wires: T.Mesh[] = [];
  wheels: T.Group[] = [];
  dust: T.Mesh[] = [];
  brush = new T.Group();
  cartridgeMesh: T.Mesh | null = null;
  cleanCartridge: T.Mesh | null = null;
  ray = new T.Raycaster();
  hand = new T.Vector3();
  constructor(
    public scene: T.Scene,
    public destination: Destination,
    public status: (info: RepairInfo | null) => void,
    public complete: () => void,
  ) {
    for (const kind of ["solar", "greenhouse", "life"] as RepairKind[]) {
      const root = new T.Group();
      root.position.fromArray([...locations[kind]]);
      scene.add(root);
      const housing = this.mesh(
        root,
        new RoundedBoxGeometry(1.5, 1.04, 0.2, 3, 0.05),
        0x263e46,
        0,
        0,
        -0.05,
      );
      this.mesh(
        root,
        new T.BoxGeometry(1.36, 0.035, 0.18),
        0xb0bcb3,
        0,
        0.48,
        0,
      );
      const lamp = this.mesh(
        root,
        new T.SphereGeometry(0.035, 12, 8),
        0xe9a15d,
        0.55,
        0.37,
        0.1,
        true,
      );
      industrialSurface(housing.material as T.MeshStandardMaterial);
      serviceEquipment(root, kind);
      const parts = new T.Group();
      parts.userData.noCollision = true;
      this.mesh(
        root,
        new T.BoxGeometry(0.24, 0.95, 0.24),
        0x354a50,
        0,
        -0.85,
        -0.1,
      );
      root.add(parts);
      this.devices.set(kind, { root, parts, lamp, fixed: false });
      this.build(kind, repairPlan(destination, kind)[0]);
    }
  }
  mesh(
    parent: T.Object3D,
    g: T.BufferGeometry,
    color: number,
    x = 0,
    y = 0,
    z = 0,
    glow = false,
  ) {
    const m = new T.MeshStandardMaterial({
      color,
      metalness: 0.35,
      roughness: 0.55,
      emissive: glow ? color : 0,
      emissiveIntensity: glow ? 0.65 : 0,
    });
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  filterPleats(parent: T.Mesh, w: number, h: number, clean: boolean) {
    for (let i = 0; i < 18; i++) {
      const pleat = this.mesh(
        parent,
        new T.BoxGeometry(w / 22, h * 0.81, 0.035),
        clean ? 0xd5dfcb : 0x8f8776,
        -w * 0.43 + i * w * 0.05,
        0,
        0.069,
      );
      pleat.rotation.y = i % 2 ? 0.34 : -0.34;
    }
    for (const x of [-w * 0.46, w * 0.46])
      this.mesh(
        parent,
        new T.BoxGeometry(0.018, h * 0.87, 0.025),
        0x455c64,
        x,
        0,
        0.08,
      );
  }
  label(parent: T.Group, text: string, x: number, y: number, z: number) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#e9efe0";
    ctx.font = "bold 86px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 64, 94);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    const o = new T.Mesh(
      new T.PlaneGeometry(0.1, 0.1),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    o.position.set(x, y, z);
    parent.add(o);
  }
  clear(parts: T.Group) {
    for (const child of [...parts.children]) {
      parts.remove(child);
      child.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            for (const t of Object.values(m))
              if (t instanceof T.Texture) t.dispose();
            m.dispose();
          }
        }
      });
    }
  }
  build(kind: RepairKind, step: RepairStep) {
    const d = this.devices.get(kind)!;
    this.clear(d.parts);
    if (this.active === kind) {
      this.plugs = [];
      this.wires = [];
      this.wheels = [];
      this.dust = [];
      this.cartridgeMesh = null;
      this.cleanCartridge = null;
    }
    const part = d.parts;
    if (step.type === "cables")
      for (let i = 0; i < step.count; i++) {
        const y = socketY(i, step.count),
          colour = colours[i];
        const socket = this.mesh(
          part,
          new T.TorusGeometry(0.07, 0.014, 8, 24),
          colour,
          SOCKET_X,
          y,
          0.1,
        );
        this.label(part, symbols[i], SOCKET_X, y, 0.12);
        const plug = this.mesh(
          part,
          new T.CylinderGeometry(0.046, 0.046, 0.09, 12),
          colour,
          cableStart(i, step.count).x,
          cableStart(i, step.count).y,
          cableStart(i, step.count).z,
        );
        plug.rotation.x = Math.PI / 2;
        plug.userData.part = "plug";
        plug.userData.index = i;
        this.label(
          part,
          symbols[i],
          plug.position.x,
          plug.position.y - 0.09,
          0.23,
        );
        const wire = this.mesh(
          part,
          new T.TubeGeometry(
            new T.CatmullRomCurve3([
              new T.Vector3(
                cableOrigin(i, step.count).x,
                cableOrigin(i, step.count).y,
                0.1,
              ),
              new T.Vector3(-0.42, cableOrigin(i, step.count).y - 0.055, 0.16),
              new T.Vector3(-0.36, cableOrigin(i, step.count).y - 0.065, 0.19),
              plug.position.clone(),
            ]),
            12,
            0.012,
            6,
            false,
          ),
          colour,
        );
        wire.userData.part = "wire";
        wire.userData.index = i;
        if (this.active === kind) {
          this.plugs.push(plug);
          this.wires.push(wire);
        }
        socket.userData.socket = i;
      }
    if (step.type === "valves")
      for (let i = 0; i < step.count; i++) {
        const x = step.count === 1 ? 0 : i === 0 ? -0.3 : 0.3;
        this.mesh(
          part,
          new T.CylinderGeometry(0.055, 0.055, 0.7, 12),
          0x699d9b,
          x,
          0,
          0.03,
        );
        const wheel = new T.Group();
        wheel.position.set(x, 0, 0.16);
        part.add(wheel);
        wheel.userData.part = "valve";
        wheel.userData.index = i;
        this.mesh(wheel, new T.TorusGeometry(0.18, 0.025, 12, 48), colours[i]);
        this.mesh(wheel, new T.BoxGeometry(0.36, 0.025, 0.025), colours[i]);
        this.mesh(wheel, new T.BoxGeometry(0.025, 0.36, 0.025), colours[i]);
        this.mesh(
          wheel,
          new T.CylinderGeometry(0.045, 0.045, 0.08, 12),
          colours[i],
        ).rotation.x = Math.PI / 2;
        this.label(part, i === 0 ? "↑" : "↓", x, -0.31, 0.12);
        if (this.active === kind) this.wheels.push(wheel);
      }
    if (step.type === "brush") {
      this.mesh(
        part,
        new T.BoxGeometry(0.94, 0.55, 0.06),
        0xa7d4c8,
        0,
        0,
        0.07,
      );
      for (let i = 0; i < step.count; i++) {
        const x = -0.36 + (i % 4) * 0.24,
          y = 0.18 - Math.floor(i / 4) * 0.18;
        const patch = this.mesh(
          part,
          new T.BoxGeometry(0.215, 0.15, 0.018),
          this.destination === "mars" ? 0xa85e38 : 0x8a826d,
          x,
          y,
          0.114,
        );
        patch.userData.part = "dust";
        if (this.active === kind) this.dust.push(patch);
      }
      const brush = new T.Group();
      this.mesh(brush, new T.BoxGeometry(0.1, 0.16, 0.035), 0xe3cf9a);
      this.mesh(
        brush,
        new T.BoxGeometry(0.12, 0.09, 0.04),
        0x95b7ae,
        0,
        -0.085,
        -0.015,
      );
      brush.position.set(0.5, -0.29, 0.17);
      part.add(brush);
      if (this.active === kind) this.brush = brush;
    }
    if (step.type === "cartridge") {
      this.mesh(
        part,
        new T.BoxGeometry(0.57, 0.38, 0.05),
        0x0c1920,
        0,
        0.1,
        0.08,
      );
      this.mesh(
        part,
        new T.BoxGeometry(0.27, 0.13, 0.08),
        0x78918d,
        -0.46,
        -0.34,
        0.12,
      );
      this.mesh(
        part,
        new T.BoxGeometry(0.27, 0.13, 0.08),
        0x78918d,
        0.46,
        -0.34,
        0.12,
      );
      const old = this.mesh(
        part,
        new RoundedBoxGeometry(0.5, 0.31, 0.12, 3, 0.02),
        0x94684b,
        0,
        0.1,
        0.18,
      );
      old.userData.part = "filter";
      this.filterPleats(old, 0.5, 0.31, false);
      const clean = this.mesh(
        part,
        new RoundedBoxGeometry(0.42, 0.27, 0.12, 3, 0.018),
        0xc5e9dc,
        0.46,
        -0.3,
        0.22,
      );
      clean.userData.part = "cleanFilter";
      this.filterPleats(clean, 0.42, 0.27, true);
      if (this.active === kind) this.cleanCartridge = clean;
      this.label(part, "×", -0.46, -0.31, 0.18);
      this.label(part, "+", 0.46, -0.31, 0.31);
      if (this.active === kind) this.cartridgeMesh = old;
    }
    this.mesh(
      part,
      new T.BoxGeometry(0.04, 0.04, 0.04),
      0xa2b5ad,
      -0.56,
      0.38,
      0.09,
    );
  }
  start(kind: RepairKind) {
    this.cancel();
    this.active = kind;
    this.devices.get(kind)!.fixed = false;
    const lamp = this.devices.get(kind)!.lamp
      .material as T.MeshStandardMaterial;
    lamp.color.setHex(0xe9a15d);
    lamp.emissive.setHex(0xe9a15d);
    this.plan = repairPlan(this.destination, kind);
    this.stepIndex = 0;
    this.resetStep();
    this.hand.copy(this.worldPoint(new T.Vector3(0.3, -0.2, 0.22)));
    this.emit();
  }
  resetStep() {
    this.connected.clear();
    this.cleaned.clear();
    this.turns = this.plan[this.stepIndex].turns?.map(() => 0) || [];
    this.cartridge = 0;
    this.held = false;
    this.selected = 0;
    this.finishIn = 0;
    this.build(this.active!, this.plan[this.stepIndex]);
  }
  get device() {
    return this.active ? this.devices.get(this.active)! : null;
  }
  get step() {
    return this.plan[this.stepIndex];
  }
  worldPoint(local: T.Vector3) {
    return this.device!.root.localToWorld(local.clone());
  }
  anchor() {
    const p = this.device!.root.position;
    const side = this.active === "greenhouse" ? 1 : -1;
    return new T.Vector3(
      p.x - side * 0.4,
      0.17,
      p.z + (this.active === "greenhouse" ? 0.65 : 0.5),
    );
  }
  cameraPose() {
    return {
      position: this.worldPoint(new T.Vector3(0, 0.08, 1.9)),
      look: this.worldPoint(new T.Vector3(0, 0, 0.17)),
    };
  }
  localPoint(
    e: MouseEvent | PointerEvent,
    camera: T.Camera,
    canvas: HTMLCanvasElement,
  ) {
    const b = canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        1 - ((e.clientY - b.top) / b.height) * 2,
      ),
      camera,
    );
    const plane = new T.Plane(
      new T.Vector3(0, 0, 1),
      -this.device!.root.position.z - 0.17,
    );
    const hit = this.ray.ray.intersectPlane(plane, new T.Vector3());
    return hit ? this.device!.root.worldToLocal(hit) : null;
  }
  pointerDown(e: PointerEvent, camera: T.Camera, canvas: HTMLCanvasElement) {
    if (!this.active || this.finishIn) return;
    const p = this.localPoint(e, camera, canvas);
    if (!p) return;
    if (this.step.type === "cables") {
      const i = this.plugs.findIndex(
        (o, i) =>
          !this.connected.has(i) &&
          Math.hypot(o.position.x - p.x, o.position.y - p.y) < 0.15,
      );
      if (i < 0) return;
      this.selected = i;
    } else if (this.step.type === "valves") {
      const i = this.wheels.findIndex(
        (o) => Math.hypot(o.position.x - p.x, o.position.y - p.y) < 0.23,
      );
      if (i < 0) return;
      this.selected = i;
      this.lastAngle = Math.atan2(p.y, p.x - this.wheels[i].position.x);
    } else if (this.step.type === "brush") {
      if (Math.abs(p.x) > 0.55 || Math.abs(p.y) > 0.4) return;
    } else {
      const from =
        this.cartridge === 0
          ? new T.Vector3(0, 0.1)
          : new T.Vector3(0.46, -0.3);
      if (Math.hypot(p.x - from.x, p.y - from.y) > 0.24) return;
    }
    this.held = true;
    canvas.setPointerCapture(e.pointerId);
    this.cursor.copy(p);
    this.applyPoint(p);
    e.preventDefault();
  }
  pointerMove(e: MouseEvent, camera: T.Camera, canvas: HTMLCanvasElement) {
    if (!this.active || !this.held || this.finishIn) return;
    const p = this.localPoint(e, camera, canvas);
    if (p) this.applyPoint(p);
  }
  applyPoint(p: T.Vector3) {
    p.x = T.MathUtils.clamp(p.x, -0.62, 0.62);
    p.y = T.MathUtils.clamp(p.y, -0.42, 0.42);
    p.z = 0.2;
    this.cursor.copy(p);
    if (this.step.type === "cables") {
      const plug = this.plugs[this.selected];
      plug.position.copy(p);
      const y = socketY(this.selected, this.step.count);
      const g = new T.TubeGeometry(
        new T.CatmullRomCurve3([
          new T.Vector3(
            cableOrigin(this.selected, this.step.count).x,
            cableOrigin(this.selected, this.step.count).y,
            0.1,
          ),
          new T.Vector3(
            -0.4,
            cableOrigin(this.selected, this.step.count).y,
            0.16,
          ),
          new T.Vector3(
            (p.x - 0.4) * 0.5,
            (cableOrigin(this.selected, this.step.count).y + p.y) * 0.5 - 0.045,
            0.2 + this.selected * 0.025,
          ),
          p.clone(),
        ]),
        16,
        0.012,
        6,
        false,
      );
      this.wires[this.selected].geometry.dispose();
      this.wires[this.selected].geometry = g;
    } else if (this.step.type === "valves") {
      const wheel = this.wheels[this.selected],
        angle = Math.atan2(p.y, p.x - wheel.position.x);
      // A clockwise turn has decreasing angle on the equipment's upright XY plane.
      this.turns[this.selected] = Math.max(
        0,
        Math.min(
          this.step.turns![this.selected],
          this.turns[this.selected] - angularDelta(this.lastAngle, angle),
        ),
      );
      this.lastAngle = angle;
      wheel.rotation.z = (-this.turns[this.selected] * Math.PI) / 180;
      if (this.turns.every((v, i) => v >= this.step.turns![i] - 0.5))
        this.finishStage();
    } else if (this.step.type === "brush") {
      this.brush.position.copy(p);
      for (let i = 0; i < this.dust.length; i++)
        if (this.dust[i].position.distanceTo(p) < 0.23) {
          this.cleaned.add(i);
          this.dust[i].visible = false;
        }
      if (this.cleaned.size === this.step.count) this.finishStage();
    } else if (this.cartridgeMesh) this.cartridgeMesh.position.copy(p);
    this.emit();
  }
  pointerUp() {
    if (!this.active || !this.held) return;
    this.held = false;
    if (this.step.type === "cables") {
      const plug = this.plugs[this.selected];
      if (
        matchingSocket(
          this.selected,
          this.step.count,
          plug.position.x,
          plug.position.y,
        )
      ) {
        plug.position.set(
          SOCKET_X,
          socketY(this.selected, this.step.count),
          0.15,
        );
        this.connected.add(this.selected);
        this.held = true;
        this.applyPoint(plug.position.clone());
        this.held = false;
        if (this.connected.size === this.step.count) this.finishStage();
      } else {
        const start = cableStart(this.selected, this.step.count);
        plug.position.set(start.x, start.y, start.z);
        this.held = true;
        this.applyPoint(plug.position.clone());
        this.held = false;
      }
    } else if (this.step.type === "cartridge") {
      const target =
        this.cartridge === 0
          ? new T.Vector3(-0.46, -0.34, 0.16)
          : new T.Vector3(0, 0.1, 0.17);
      if (
        this.cartridgeMesh &&
        Math.hypot(this.cursor.x - target.x, this.cursor.y - target.y) < 0.19
      ) {
        this.cartridgeMesh.position.copy(target);
        this.cartridge++;
        if (this.cartridge === 1) {
          this.cartridgeMesh = this.cleanCartridge;
        } else this.finishStage();
      } else if (this.cartridgeMesh)
        this.cartridgeMesh.position.set(
          this.cartridge === 0 ? 0 : 0.46,
          this.cartridge === 0 ? 0.1 : -0.3,
          0.18,
        );
    }
    this.emit();
  }
  key(code: string) {
    if (!this.active || this.finishIn) return;
    if (/^Digit[123]$/.test(code)) {
      this.selected = Math.min(Number(code.at(-1)) - 1, this.step.count - 1);
      const part =
        this.step.type === "cables"
          ? this.plugs[this.selected]
          : this.wheels[this.selected];
      if (part) this.cursor.copy(part.position);
      return;
    }
    if (code === "Space") {
      if (this.held) this.pointerUp();
      else {
        this.held = true;
        if (this.step.type === "cables")
          this.cursor.copy(this.plugs[this.selected].position);
        else if (this.step.type === "cartridge" && this.cartridgeMesh)
          this.cursor.copy(this.cartridgeMesh.position);
        this.lastAngle = Math.atan2(
          this.cursor.y,
          this.cursor.x - (this.wheels[this.selected]?.position.x || 0),
        );
      }
      return;
    }
    if (!this.held) return;
    if (
      this.step.type === "valves" &&
      (code === "ArrowRight" || code === "ArrowLeft")
    ) {
      const i = this.selected;
      this.turns[i] = T.MathUtils.clamp(
        this.turns[i] + (code === "ArrowRight" ? 15 : -15),
        0,
        this.step.turns![i],
      );
      this.wheels[i].rotation.z = (-this.turns[i] * Math.PI) / 180;
      this.cursor.set(
        this.wheels[i].position.x + Math.cos(this.wheels[i].rotation.z) * 0.18,
        Math.sin(this.wheels[i].rotation.z) * 0.18,
        0.2,
      );
      if (this.turns.every((v, i) => v >= this.step.turns![i] - 0.5))
        this.finishStage();
      this.emit();
      return;
    }
    const p = this.cursor.clone();
    if (code === "ArrowRight") p.x += 0.06;
    if (code === "ArrowLeft") p.x -= 0.06;
    if (code === "ArrowUp") p.y += 0.06;
    if (code === "ArrowDown") p.y -= 0.06;
    this.applyPoint(p);
  }
  fraction() {
    if (!this.active) return 0;
    return this.step.type === "cables"
      ? this.connected.size / this.step.count
      : this.step.type === "brush"
        ? this.cleaned.size / this.step.count
        : this.step.type === "valves"
          ? this.turns.reduce((a, v, i) => a + v / this.step.turns![i], 0) /
            this.step.count
          : this.cartridge / 2;
  }
  emit() {
    if (this.active)
      this.status({
        title: this.step.title,
        instruction:
          this.step.type === "cartridge" && this.cartridge === 1
            ? "Now drag the clean filter from the right tray into the empty slot."
            : this.step.type === "valves" &&
                this.step.count === 2 &&
                this.turns[0] >= this.step.turns![0] - 0.5
              ? "Supply ready! Turn the teal return handle clockwise."
              : this.step.instruction,
        progress: (this.stepIndex + this.fraction()) / this.plan.length,
        step: this.stepIndex + 1,
        steps: this.plan.length,
      });
  }
  finishStage() {
    if (this.finishIn) return;
    this.held = false;
    this.finishIn = 0.75;
    this.emit();
  }
  update(dt: number) {
    if (!this.active) return;
    const target = this.worldPoint(
      this.held || this.finishIn ? this.cursor : new T.Vector3(0, -0.38, 0.23),
    );
    this.hand.lerp(target, 1 - Math.exp(-dt * 14));
    if (this.finishIn > 0) {
      this.finishIn -= dt;
      if (this.finishIn <= 0) {
        if (this.stepIndex + 1 < this.plan.length) {
          this.stepIndex++;
          this.resetStep();
          this.emit();
        } else {
          const d = this.device!;
          d.fixed = true;
          (d.lamp.material as T.MeshStandardMaterial).color.setHex(0x8ce1b4);
          (d.lamp.material as T.MeshStandardMaterial).emissive.setHex(0x8ce1b4);
          this.active = null;
          this.status(null);
          this.complete();
        }
      }
    }
  }
  hands() {
    if (!this.active || (!this.held && !this.finishIn)) return null;
    const offset = this.active === "greenhouse" ? -0.4 : 0.4;
    const left =
      Math.abs(this.cursor.x - (offset - 0.26)) <
      Math.abs(this.cursor.x - (offset + 0.26));
    return left
      ? {
          left: this.hand,
          right: this.worldPoint(new T.Vector3(0.5, -0.38, 0.19)),
        }
      : {
          right: this.hand,
          left: this.worldPoint(new T.Vector3(-0.3, 0.32, 0.19)),
        };
  }
  cancel() {
    if (this.active) {
      const kind = this.active;
      this.held = false;
      this.finishIn = 0;
      this.active = null;
      if (!this.devices.get(kind)!.fixed)
        this.build(kind, repairPlan(this.destination, kind)[0]);
      this.status(null);
    }
  }
  reset() {
    this.cancel();
    for (const [k, d] of this.devices) {
      d.fixed = false;
      this.build(k, repairPlan(this.destination, k)[0]);
      (d.lamp.material as T.MeshStandardMaterial).color.setHex(0xe9a15d);
      (d.lamp.material as T.MeshStandardMaterial).emissive.setHex(0xe9a15d);
    }
  }
  sync(flags: Record<RepairKind, boolean>) {
    for (const [kind, d] of this.devices) {
      if (!flags[kind] || d.fixed || this.active === kind) continue;
      const plan = repairPlan(this.destination, kind),
        step = plan[plan.length - 1];
      this.build(kind, step);
      for (const o of d.parts.children) {
        const i = o.userData.index || 0;
        if (o.userData.part === "plug")
          o.position.set(SOCKET_X, socketY(i, step.count), 0.15);
        if (o.userData.part === "wire" && o instanceof T.Mesh) {
          const y = socketY(i, step.count);
          o.geometry.dispose();
          o.geometry = new T.TubeGeometry(
            new T.CatmullRomCurve3([
              new T.Vector3(
                cableOrigin(i, step.count).x,
                cableOrigin(i, step.count).y,
                0.1,
              ),
              new T.Vector3(-0.42, cableOrigin(i, step.count).y - 0.055, 0.16),
              new T.Vector3(
                -0.04,
                (cableOrigin(i, step.count).y + y) * 0.5,
                0.17 + i * 0.025,
              ),
              new T.Vector3(SOCKET_X, y, 0.15),
            ]),
            16,
            0.012,
            6,
            false,
          );
        }
        if (o.userData.part === "dust") o.visible = false;
        if (o.userData.part === "valve")
          o.rotation.z = (-(step.turns?.[i] || 0) * Math.PI) / 180;
        if (o.userData.part === "filter") o.position.set(-0.46, -0.34, 0.16);
        if (o.userData.part === "cleanFilter") o.position.set(0, 0.1, 0.17);
      }
      d.fixed = true;
      (d.lamp.material as T.MeshStandardMaterial).color.setHex(0x8ce1b4);
      (d.lamp.material as T.MeshStandardMaterial).emissive.setHex(0x8ce1b4);
    }
  }
}
