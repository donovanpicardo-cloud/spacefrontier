import * as T from "three";

// Follow the top span, far wheel, lower span, and near wheel in order.
const path: T.Vector3[] = [];
const radius = 0.245;
for (let i = 0; i < 10; i++) path.push(new T.Vector3(0.52, 0.27 + radius, 0.38 - 0.076 * i));
for (let i = 0; i < 10; i++) {
  const angle = i * Math.PI / 10;
  path.push(new T.Vector3(0.52, 0.27 + radius * Math.cos(angle), -0.38 - radius * Math.sin(angle)));
}
for (let i = 0; i < 10; i++) path.push(new T.Vector3(0.52, 0.27 - radius, -0.38 + 0.076 * i));
for (let i = 0; i < 10; i++) {
  const angle = i * Math.PI / 10;
  path.push(new T.Vector3(0.52, 0.27 - radius * Math.cos(angle), 0.38 + radius * Math.sin(angle)));
}
path.push(path[0].clone());

export class RobotTrack {
  readonly links = new T.InstancedMesh(new T.BoxGeometry(0.18, 0.048, 0.076),
    new T.MeshStandardMaterial({color: 0x53636a, metalness: 0.65, roughness: 0.65}), path.length - 1);
  readonly grip = new T.Mesh(new T.BoxGeometry(0.19, 0.1, 0.11),
    new T.MeshStandardMaterial({color: 0xffb64a, emissive: 0x975200}));
  readonly guide = new T.Mesh(new T.TorusGeometry(0.066, 0.012, 8, 20),
    new T.MeshBasicMaterial({color: 0x65ffd7}));
  fitted = 0;
  tension = 0;
  pointer: number | null = null;
  private lastView = "";
  constructor(readonly robot: T.Group) {
    robot.add(this.links, this.grip, this.guide);
    this.guide.rotation.y = Math.PI / 2;
    this.links.frustumCulled = false;
    this.draw(false, false);
  }
  get wrapped() { return this.fitted === path.length - 1; }
  reset() {
    this.fitted = 0;
    this.tension = 0;
    this.pointer = null;
  }
  private point(i: number, tension: number) {
    const p = path[i].clone();
    if (i <= 10) p.y -= (1 - tension) * 0.12 * Math.sin(i * Math.PI / 10);
    return p;
  }
  private lever(tension: number) { return new T.Vector3(0.64, 0.42 + 0.32 * tension, 0); }
  draw(active: boolean, repaired: boolean) {
    const count = repaired ? path.length - 1 : this.fitted;
    const tight = repaired ? 1 : this.tension;
    const key = [active, repaired, count, tight].join("/");
    if (key === this.lastView) return;
    this.lastView = key;
    const loose = Math.min(5, path.length - 1 - count);
    this.links.count = count + loose;
    const link = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const a = this.point(i, tight), b = this.point(i + 1, tight);
      link.position.copy(a).lerp(b, 0.5);
      link.rotation.x = -Math.atan2(b.y - a.y, b.z - a.z);
      link.updateMatrix();
      this.links.setMatrixAt(i, link.matrix);
    }
    const end = this.point(count, tight);
    for (let i = 0; i < loose; i++) {
      link.position.set(end.x + 0.04, Math.max(0.035, end.y - 0.042 * (i + 1)), end.z + 0.06 * (i + 1));
      link.rotation.x = link.position.y > 0.035 ? 0.61 : 0;
      link.updateMatrix();
      this.links.setMatrixAt(count + i, link.matrix);
    }
    this.links.instanceMatrix.needsUpdate = true;
    this.grip.visible = !repaired;
    this.guide.visible = active;
    this.grip.position.copy(this.wrapped ? this.lever(tight) : this.point(count, tight));
    this.guide.position.copy(this.wrapped ? this.lever(1) : this.point(Math.min(count + 2, path.length - 1), tight));
    this.guide.position.x = 0.65;
  }
  drag(ray: T.Ray, id: number, start: boolean) {
    const localRay = ray.clone().applyMatrix4(this.robot.matrixWorld.clone().invert());
    const point = localRay.intersectPlane(new T.Plane(new T.Vector3(1, 0, 0), -this.grip.position.x), new T.Vector3());
    if (!point) return false;
    if (start) {
      if (this.pointer === null && point.distanceTo(this.grip.position) < 0.14) this.pointer = id;
      return false;
    }
    if (this.pointer !== id) return false;
    if (this.wrapped) {
      if (Math.abs(point.z) < 0.18) this.tension = T.MathUtils.clamp((point.y - 0.42) / 0.32, 0, 1);
    } else {
      // Accept adjacent links only; crossing the wheel hub cannot finish the loop.
      while (!this.wrapped && point.distanceTo(this.point(this.fitted + 1, 0)) < 0.12) this.fitted++;
      if (this.wrapped) this.pointer = null;
    }
    this.draw(true, false);
    return this.tension >= 0.98;
  }
}

