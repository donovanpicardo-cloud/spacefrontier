import { suspensionSupport, wheelSurface } from "./VehicleTerrain";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildLunarVehicle } from "./environments/LunarVehicle";
import { loadCrewRover } from "./environments/NasaVehicle";
import { vehicleDetail } from "./environments/VehicleDetail";
import { CollisionWorld, BODY_HEIGHT } from "./CollisionWorld";
import type { Destination } from "../simulation/engine";
import { driveStep, type DriveState, type DriveInput } from "./VehiclePhysics";
import { chassisOverlaps } from "./VehicleCollision";
export type VehicleSave = { position: number[]; yaw: number; riding: boolean };
export type VehicleInfo = {
  name: string;
  driving: boolean;
  boarding: boolean;
  speed: number;
  pressurized: boolean;
  hint: string;
};
export class ExplorerVehicle {
  root = new T.Group();
  wheels: T.Group[] = [];
  steering: T.Group[] = [];
  wheel = new T.Group();
  door = new T.Group();
  state: DriveState = { x: 0, z: 0, yaw: 0, speed: 0 };
  disposed = false;
  get halfLength() {
    return this.destination === "mars" ? 2.05 : 1.7;
  }
  driving = false;
  transition: {
    type: "enter" | "exit";
    t: number;
    from: T.Vector3;
    to: T.Vector3;
  } | null = null;
  spawn: T.Vector3;
  name: string;
  radius: number;
  lastEmit = 0;
  hint = "";
  towing = false;
  dynamicObstacles: () => T.Box3[] = () => [];
  blockedBy = "Obstacle";
  blockedFor = 0;
  constructor(
    public scene: T.Scene,
    public destination: Destination,
    public ground: (x: number, z: number) => number,
    public physics: CollisionWorld,
    public status: (info: VehicleInfo) => void,
  ) {
    this.name = destination === "moon" ? "Luna Buggy" : "Ares Scout";
    this.radius = destination === "moon" ? 1.6 : 2;
    this.spawn = new T.Vector3(destination === "moon" ? -8 : -9, 0, 5);
    scene.add(this.root);
    this.build();
    if (destination === "mars") vehicleDetail(this.root, this.wheels, true);
    this.reset();
    if (destination === "mars")
      loadCrewRover(
        this.root,
        [...this.root.children],
        () => this.disposed,
        (wheels) => {
          this.wheels = wheels;
          this.steering = wheels.filter((w) => w.position.z < 0);
          this.placeWheels(0);
        },
      );
  }
  mesh(
    parent: T.Object3D,
    g: T.BufferGeometry,
    color: number,
    x = 0,
    y = 0,
    z = 0,
    metal = 0.3,
  ) {
    const o = new T.Mesh(
      g,
      new T.MeshStandardMaterial({ color, metalness: metal, roughness: 0.55 }),
    );
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  box(
    p: T.Object3D,
    w: number,
    h: number,
    d: number,
    c: number,
    x = 0,
    y = 0,
    z = 0,
  ) {
    return this.mesh(p, new RoundedBoxGeometry(w, h, d, 2, 0.05), c, x, y, z);
  }
  tube(a: T.Vector3, b: T.Vector3, r = 0.045, color = 0xc5c9bd) {
    const o = this.mesh(
      this.root,
      new T.CylinderGeometry(r, r, a.distanceTo(b), 10),
      color,
    );
    o.position.copy(a).lerp(b, 0.5);
    o.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return o;
  }
  build() {
    if (this.destination === "moon") {
      const model = buildLunarVehicle(this.root);
      this.wheels = model.wheels;
      this.steering = model.steering;
      this.wheel = model.control;
      return;
    }
    const mars = this.destination === "mars",
      orange = mars ? 0xce713f : 0xd8ae61;
    this.box(this.root, 1.7, 0.26, mars ? 3.2 : 2.5, 0x33464c, 0, 0.65, 0);
    this.box(this.root, 1.55, 0.18, 1.5, 0xbcc3b5, 0, 0.86, -0.3);
    for (const x of [0]) {
      this.box(this.root, 0.72, 0.16, 0.62, 0x263c42, x, 1.02, -0.2);
      this.box(this.root, 0.72, 0.65, 0.12, 0x263c42, x, 1.35, 0.12);
    }
    const zs = mars ? [-1.25, 0, 1.25] : [-0.95, 0.95];
    for (const x of [-1, 1])
      for (const z of zs) {
        const pivot = new T.Group();
        pivot.position.set(x * (mars ? 1.08 : 0.98), 0.55, z);
        this.root.add(pivot);
        const wheel = new T.Group();
        pivot.add(wheel);
        this.wheels.push(wheel);
        if (z < -0.5) this.steering.push(pivot);
        this.mesh(
          wheel,
          new T.CylinderGeometry(0.49, 0.49, 0.32, 20),
          mars ? 0x343b37 : 0x78827b,
        ).rotation.z = Math.PI / 2;
        this.mesh(
          wheel,
          new T.CylinderGeometry(0.21, 0.21, 0.35, 16),
          0xc2bfae,
        ).rotation.z = Math.PI / 2;
        for (let i = 0; i < 12; i++) {
          const tread = this.box(
            wheel,
            0.36,
            0.05,
            0.11,
            0x252e2e,
            0,
            Math.sin((i * Math.PI) / 6) * 0.49,
            Math.cos((i * Math.PI) / 6) * 0.49,
          );
          tread.rotation.x = (-i * Math.PI) / 6;
        }
        this.box(
          this.root,
          0.5,
          0.1,
          0.76,
          orange,
          x * (mars ? 1.05 : 0.96),
          1.12,
          z,
        );
      }
    this.box(this.root, 1.6, 0.44, 0.65, orange, 0, 1.03, 1.1);
    this.box(this.root, 0.52, 0.45, 0.4, 0xc9c6b0, -0.47, 1.4, 1.08);
    this.tube(
      new T.Vector3(0.7, 1.1, 1.1),
      new T.Vector3(0.7, 2.5, 1.1),
      0.018,
    );
    const antenna = this.mesh(
      this.root,
      new T.SphereGeometry(0.055, 12, 8),
      0x8de1cb,
      0.7,
      2.5,
      1.1,
    );
    (antenna.material as T.MeshStandardMaterial).emissive.setHex(0x65b49f);
    if (mars) {
      this.box(this.root, 1.75, 1.25, 0.8, orange, 0, 1.65, 0.85);
      this.box(this.root, 1.85, 0.16, 2.45, 0xd7c9a6, 0, 2.45, -0.15);
      for (const x of [-0.82, 0.82])
        this.box(this.root, 0.09, 1.3, 0.09, 0x34454b, x, 1.8, -1.2);
      const glassMaterial = new T.MeshPhysicalMaterial({
        color: 0x9ed5dc,
        transparent: true,
        opacity: 0.16,
        roughness: 0.1,
        metalness: 0.15,
        depthWrite: false,
      });
      const glass = new T.Mesh(
        new T.BoxGeometry(1.55, 1.08, 0.035),
        glassMaterial,
      );
      glass.position.set(0, 1.9, -1.2);
      this.root.add(glass);
      this.box(this.root, 1.75, 0.35, 0.1, orange, 0, 1.18, -1.2);
      const sideGlass = new T.Mesh(
        new T.BoxGeometry(0.035, 1.02, 1.5),
        glassMaterial,
      );
      sideGlass.position.set(0.87, 1.9, -0.45);
      this.root.add(sideGlass);
      this.box(this.root, 0.08, 0.55, 1.5, orange, 0.88, 1.25, -0.45);
      this.door.position.set(-0.9, 1.25, 0.3);
      this.root.add(this.door);
      this.box(this.door, 0.08, 0.55, 1.0, orange, 0, 0, -0.45);
      const doorGlass = new T.Mesh(
        new T.BoxGeometry(0.035, 1.02, 1.5),
        glassMaterial,
      );
      doorGlass.position.set(0, 0.65, -0.75);
      this.door.add(doorGlass);
      this.box(this.root, 0.65, 0.05, 0.65, 0x23455b, 0, 2.57, 0.6);
    } else {
      for (const x of [-0.78, 0.78]) {
        this.tube(new T.Vector3(x, 0.85, -1.05), new T.Vector3(x, 2.15, -0.55));
        this.tube(new T.Vector3(x, 2.15, -0.55), new T.Vector3(x, 2.15, 0.45));
        this.tube(new T.Vector3(x, 2.15, 0.45), new T.Vector3(x, 0.85, 0.8));
      }
      this.tube(
        new T.Vector3(-0.78, 2.15, -0.55),
        new T.Vector3(0.78, 2.15, -0.55),
      );
      this.box(this.root, 1.1, 0.08, 0.55, 0x2f4c5a, 0, 1.54, -0.9);
    }
    this.wheel.position.set(0, 1.55, -0.78);
    this.wheel.rotation.x = -0.35;
    this.root.add(this.wheel);
    this.mesh(this.wheel, new T.TorusGeometry(0.23, 0.025, 8, 24), 0x202f35);
    this.box(this.wheel, 0.42, 0.02, 0.02, 0xb4bbb1);
    for (const x of [-0.62, 0.62]) {
      const lamp = this.mesh(
        this.root,
        new T.CylinderGeometry(0.1, 0.1, 0.08, 16),
        0xf7e5af,
        x,
        1.0,
        -1.4,
      );
      lamp.rotation.x = Math.PI / 2;
      (lamp.material as T.MeshStandardMaterial).emissive.setHex(0xf7e5af);
    }
  }
  emit() {
    this.status({
      name: this.name,
      driving: this.driving,
      boarding: !!this.transition,
      speed: Math.abs(this.state.speed),
      pressurized: this.destination === "mars",
      hint: this.hint,
    });
  }
  reset() {
    this.driving = false;
    this.transition = null;
    const facing = Math.PI + Math.PI / 6;
    const safe = this.clearParking(this.spawn.x, this.spawn.z, facing);
    this.state = { x: safe.x, z: safe.y, yaw: facing, speed: 0 };
    this.root.position.set(safe.x, this.ground(safe.x, safe.y), safe.y);
    this.root.rotation.set(0, facing, 0);
    this.placeWheels(0);
    this.hint = "";
    this.emit();
  }
  bounds() {
    this.root.updateMatrixWorld(true);
    const width = this.destination === "moon" ? 1.18 : 1.35;
    return [
      new T.Box3(
        new T.Vector3(-width, 0.05, -this.halfLength),
        new T.Vector3(
          width,
          this.destination === "mars" ? 2.6 : 2.2,
          this.halfLength,
        ),
      ).applyMatrix4(this.root.matrixWorld),
    ];
  }
  near(p: T.Vector3) {
    return p.distanceTo(new T.Vector3(this.state.x, p.y, this.state.z)) < 3.25;
  }
  seat() {
    this.root.updateMatrixWorld(true);
    return this.root.localToWorld(
      new T.Vector3(
        this.destination === "moon" ? -0.39 : 0,
        this.destination === "moon" ? 0.35 : 0,
        -0.32,
      ),
    );
  }
  private placeWheels(travel: number) {
    const forwardX = Math.sin(this.state.yaw), forwardZ = Math.cos(this.state.yaw);
    let chassisLift = 0;
    for (const wheel of this.wheels) {
      const radius = wheel.name.startsWith("WheelPivot_") ? 0.32 : 0.51;
      const hub = wheel.getWorldPosition(new T.Vector3());
      let hubY = wheelSurface(hub.x, hub.z, this.ground, this.physics) + radius;
      // The front of a rolling tire meets a ledge before its axle reaches it.
      for (const offset of [-0.7 * radius, 0.7 * radius]) {
        const surface = wheelSurface(hub.x + forwardX * offset, hub.z + forwardZ * offset, this.ground, this.physics);
        hubY = Math.max(hubY, surface + Math.sqrt(radius * radius - offset * offset));
      }
      for (const side of [-0.14, 0.14]) {
        const shoulder = wheelSurface(hub.x + forwardZ * side, hub.z - forwardX * side, this.ground, this.physics);
        hubY = Math.max(hubY, shoulder + radius);
      }
      chassisLift = Math.max(chassisLift, hubY - hub.y);
      wheel.rotation.x -= travel / radius;
    }
    // Keep axles and fenders together; a tire meeting a ledge lifts the vehicle.
    this.root.position.y += chassisLift;
  }
  hands() {
    this.root.updateMatrixWorld(true);
    return {
      left: this.root.localToWorld(
        new T.Vector3(this.destination === "moon" ? -0.57 : -0.18, 1.55, -0.78),
      ),
      right: this.root.localToWorld(
        new T.Vector3(this.destination === "moon" ? -0.21 : 0.18, 1.55, -0.78),
      ),
    };
  }
  enter(p: T.Vector3) {
    if (this.transition) return;
    this.transition = { type: "enter", t: 0, from: p.clone(), to: this.seat() };
    this.hint = "Climbing aboard…";
    this.emit();
  }
  exit(p: T.Vector3) {
    if (this.transition) return null;
    if (Math.abs(this.state.speed) > 0.5) {
      this.hint = "Hold Space to brake before getting out.";
      this.emit();
      return null;
    }
    for (const local of [
      new T.Vector3(-this.radius - 1.5, 0, -0.2),
      new T.Vector3(this.radius + 1.5, 0, -0.2),
      new T.Vector3(0, 0, 3.8),
    ]) {
      const point = local
        .applyAxisAngle(new T.Vector3(0, 1, 0), this.state.yaw)
        .add(this.root.position);
      point.y = this.ground(point.x, point.z) + 0.12;
      const blocked = [
        ...this.physics.nearby(point.x, point.z),
        ...this.bounds(),
        ...this.dynamicObstacles(),
      ].some(
        (b) =>
          this.physics.overlaps(point.x, point.z, b) &&
          point.y + BODY_HEIGHT > b.min.y &&
          point.y + 0.24 < b.max.y,
      );
      if (!blocked) {
        this.transition = { type: "exit", t: 0, from: p.clone(), to: point };
        this.hint = "Stepping out…";
        this.emit();
        return point;
      }
    }
    this.hint = "No room to get out here. Drive to a clear spot.";
    this.emit();
    return null;
  }
  canMove(
    x: number,
    z: number,
    yaw = this.state.yaw,
    fromX = this.state.x,
    fromZ = this.state.z,
  ) {
    const height = this.ground(x, z),
      current = this.ground(fromX, fromZ);
    if (
      Math.abs(height - current) >
      Math.max(0.12, Math.hypot(x - fromX, z - fromZ) * 1.1)
    ) {
      this.blockedBy = "Steep terrain";
      return false;
    }
    return this.clearAt(x, z, yaw);
  }
  clearAt(x: number, z: number, yaw = this.state.yaw) {
    const height = this.ground(x, z);
    for (const b of this.physics.nearby(x, z, 2.25))
      if (
        !this.physics.rollable.has(b) &&
        chassisOverlaps(
          x,
          z,
          yaw,
          this.destination === "mars" ? 1.35 : 1.18,
          this.halfLength,
          b,
        ) &&
        height + (this.destination === "mars" ? 2.6 : 2.2) > b.min.y + 0.03 &&
        height + 0.5 < b.max.y &&
        this.physics.vehicleHits(
          b,
          x,
          height,
          z,
          yaw,
          this.destination === "mars" ? 1.35 : 1.18,
          this.halfLength,
          this.destination === "mars" ? 2.6 : 2.2,
        )
      ) {
        this.blockedBy = this.physics.labels.get(b) || "Solid obstacle";
        return false;
      }
    for (const b of this.dynamicObstacles()) {
      const source = (b as T.Box3 & { sourceMesh?: T.Mesh }).sourceMesh;
      if (source && !this.physics.shapes.has(b))
        this.physics.shape(
          b,
          source.geometry,
          source.matrixWorld,
          "Outpost module",
        );
      if (
        chassisOverlaps(
          x,
          z,
          yaw,
          this.destination === "mars" ? 1.35 : 1.18,
          this.halfLength,
          b,
        ) &&
        height + 2.6 > b.min.y &&
        height + 0.45 < b.max.y &&
        (!source ||
          this.physics.vehicleHits(
            b,
            x,
            height,
            z,
            yaw,
            this.destination === "mars" ? 1.35 : 1.18,
            this.halfLength,
            this.destination === "mars" ? 2.6 : 2.2,
          ))
      ) {
        this.blockedBy = source?.parent?.name || "Outpost module";
        return false;
      }
    }
    if (this.towing) {
      const tx = x + Math.sin(yaw) * 3.2,
        tz = z + Math.cos(yaw) * 3.2,
        ty = this.ground(tx, tz);
      for (const b of [
        ...this.physics.nearby(tx, tz, 1.2),
        ...this.dynamicObstacles(),
      ])
        if (
          !this.physics.rollable.has(b) &&
          chassisOverlaps(tx, tz, yaw, 0.65, 0.75, b) &&
          ty + 1.1 > b.min.y &&
          ty + 0.4 < b.max.y &&
          this.physics.vehicleHits(b, tx, ty, tz, yaw, 0.65, 0.75, 1.1)
        ) {
          this.blockedBy = "Tow path";
          return false;
        }
    }
    return true;
  }
  clearParking(x: number, z: number, yaw = this.state.yaw) {
    if (this.clearAt(x, z, yaw)) return new T.Vector2(x, z);
    for (let r = 0.5; r <= 12; r += 0.5)
      for (let i = 0; i < 24; i++) {
        const px = x + Math.cos((i * Math.PI) / 12) * r,
          pz = z + Math.sin((i * Math.PI) / 12) * r;
        if (this.clearAt(px, pz, yaw)) return new T.Vector2(px, pz);
      }
    return new T.Vector2(x, z);
  }
  update(dt: number, input: DriveInput, player: T.Object3D) {
    this.lastEmit += dt;
    if (this.transition) {
      const t = Math.min(1, (this.transition.t += dt / 1.1)),
        smooth = t * t * (3 - 2 * t);
      player.position.lerpVectors(
        this.transition.from,
        this.transition.to,
        smooth,
      );
      player.position.y += Math.sin(t * Math.PI) * 0.22;
      const upright = new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP, this.state.yaw);
      player.quaternion.slerpQuaternions(upright, this.root.quaternion,
        this.transition.type === "enter" ? smooth : 1 - smooth);
      this.door.rotation.y = -Math.sin(t * Math.PI) * 1.1;
      if (t >= 1) {
        this.driving = this.transition.type === "enter";
        this.transition = null;
        this.hint = this.driving
          ? "W/S drive · A/D steer · Space brake · E get out"
          : "";
        this.emit();
      }
    } else if (this.driving) {
      this.state = driveStep(
        this.state,
        input,
        dt,
        this.towing ? 4 : this.destination === "moon" ? 8 : 6,
        (x, z, yaw, fromX, fromZ) => this.canMove(x, z, yaw, fromX, fromZ),
      );
      if (input.throttle && !input.brake && this.state.speed === 0)
        this.blockedFor = 1.5;
      else this.blockedFor = Math.max(0, this.blockedFor - dt);
      this.hint =
        this.blockedFor > 0
          ? `${this.blockedBy} ahead. Steer around it or reverse with S.`
          : this.towing
            ? "ROBOT IN TOW · Drive gently to the recovery pad."
            : "W/S drive · A/D steer · Space brake · E get out";
      const support = suspensionSupport(
        this.state.x,
        this.state.z,
        this.state.yaw,
        this.ground,
        this.physics,
      );
      this.root.position.x = this.state.x;
      this.root.position.z = this.state.z;
      this.root.position.y = T.MathUtils.damp(
        this.root.position.y,
        support.height,
        12,
        dt,
      );
      this.root.rotation.order = "YXZ";
      this.root.rotation.y = this.state.yaw;
      this.root.rotation.x = T.MathUtils.damp(
        this.root.rotation.x,
        support.pitch,
        7,
        dt,
      );
      this.root.rotation.z = T.MathUtils.damp(
        this.root.rotation.z,
        support.roll,
        7,
        dt,
      );
      this.placeWheels(this.state.speed * dt);
      for (const s of this.steering) s.rotation.y = input.steer * 0.32;
      this.wheel.rotation.z = input.steer * 0.4;
      player.position.copy(this.seat());
      player.quaternion.copy(this.root.quaternion);
    }
    if (this.lastEmit > 0.2) {
      this.lastEmit = 0;
      this.emit();
    }
  }
  save(): VehicleSave {
    return {
      position: this.root.position.toArray(),
      yaw: this.state.yaw,
      riding: this.driving || this.transition?.type === "enter",
    };
  }
  restore(v: VehicleSave | undefined, player: T.Object3D) {
    this.reset();
    if (!v) return;
    const safe = this.clearParking(v.position[0], v.position[2], v.yaw);
    this.state = { x: safe.x, z: safe.y, yaw: v.yaw, speed: 0 };
    this.root.position.set(
      this.state.x,
      this.ground(this.state.x, this.state.z),
      this.state.z,
    );
    const support = suspensionSupport(safe.x, safe.y, v.yaw, this.ground, this.physics);
    this.root.position.y = support.height;
    this.root.rotation.set(support.pitch, v.yaw, support.roll, "YXZ");
    this.placeWheels(0);
    this.driving = v.riding;
    if (v.riding) {
      player.position.copy(this.seat());
      player.quaternion.copy(this.root.quaternion);
    }
    this.emit();
  }
}
