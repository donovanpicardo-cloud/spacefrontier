import * as T from "three";

export const BODY_HEIGHT = 1.98;
export const BODY_RADIUS = 0.38;
const STEP = 0.24;

/** Spatially indexed, height-aware solid volumes; decorative effects are excluded. */
export class CollisionWorld {
  cells = new Map<string, T.Box3[]>();
  count = 0;
  rollable = new WeakSet<T.Box3>();
  shapes = new WeakMap<T.Box3, () => T.Triangle[]>();
  triangles = new WeakMap<T.Box3, T.Triangle[]>();
  labels = new WeakMap<T.Box3, string>();
  closedShapes = new WeakSet<T.Box3>();
  shape(box: T.Box3, g: T.BufferGeometry, m: T.Matrix4, label: string) {
    const matrix = m.clone();
    const parameters =
      (
        g as T.BufferGeometry & {
          parameters?: Record<string, number | boolean>;
        }
      ).parameters || {};
    const fullSphere =
      g.type === "SphereGeometry" &&
      Number(parameters.thetaLength ?? Math.PI) >= Math.PI - 1e-6 &&
      Number(parameters.phiLength ?? Math.PI * 2) >= Math.PI * 2 - 1e-6;
    const closedTorus =
      g.type === "TorusGeometry" &&
      Number(parameters.arc ?? Math.PI * 2) >= Math.PI * 2 - 1e-6;
    if (
      label === "Boulder" ||
      [
        "BoxGeometry",
        "RoundedBoxGeometry",
        "IcosahedronGeometry",
        "CapsuleGeometry",
      ].includes(g.type) ||
      fullSphere ||
      closedTorus ||
      (["CylinderGeometry", "ConeGeometry"].includes(g.type) &&
        !parameters.openEnded)
    )
      this.closedShapes.add(box);
    this.labels.set(box, label);
    this.shapes.set(box, () => {
      const p = g.attributes.position,
        index = g.index,
        result: T.Triangle[] = [];
      for (let i = 0; i < (index ? index.count : p.count); i += 3) {
        const vertices = [0, 1, 2].map((j) =>
          new T.Vector3()
            .fromBufferAttribute(p, index ? index.getX(i + j) : i + j)
            .applyMatrix4(matrix),
        );
        result.push(new T.Triangle(vertices[0], vertices[1], vertices[2]));
      }
      return result;
    });
  }
  vehicleHits(
    box: T.Box3,
    x: number,
    y: number,
    z: number,
    yaw: number,
    halfWidth: number,
    halfLength: number,
    height: number,
  ) {
    const load = this.shapes.get(box);
    if (!load) return true;
    let tris = this.triangles.get(box);
    if (!tris) {
      tris = load();
      this.triangles.set(box, tris);
    }
    const volume = new T.Box3(
      new T.Vector3(-halfWidth, 0.42, -halfLength),
      new T.Vector3(halfWidth, height, halfLength),
    );
    const inverse = new T.Matrix4()
      .makeRotationY(-yaw)
      .multiply(new T.Matrix4().makeTranslation(-x, -y, -z));
    const triangle = new T.Triangle();
    const touched = tris.some((t) => {
      triangle.copy(t);
      triangle.a.applyMatrix4(inverse);
      triangle.b.applyMatrix4(inverse);
      triangle.c.applyMatrix4(inverse);
      return volume.intersectsTriangle(triangle);
    });
    if (touched || !this.closedShapes.has(box)) return touched;
    // A valid old save can be entirely inside a large solid: surface tests alone miss containment.
    const ray = new T.Ray(
        new T.Vector3(x, y + (height + 0.42) / 2, z),
        new T.Vector3(0.812, 0.339, 0.477).normalize(),
      ),
      hit = new T.Vector3(),
      distances: number[] = [];
    for (const t of tris)
      if (ray.intersectTriangle(t.a, t.b, t.c, false, hit))
        distances.push(hit.distanceTo(ray.origin));
    distances.sort((a, b) => a - b);
    return (
      distances.filter((v, i) => i === 0 || v - distances[i - 1] > 1e-5)
        .length %
        2 ===
      1
    );
  }
  clearFoot(p: T.Vector3, dynamic: T.Box3[] = []) {
    return ![...this.nearby(p.x, p.z), ...dynamic].some(
      (b) =>
        this.overlaps(p.x, p.z, b) &&
        p.y + BODY_HEIGHT > b.min.y + 0.025 &&
        p.y + STEP < b.max.y - 0.005,
    );
  }
  safeFoot(
    p: T.Vector3,
    ground: (x: number, z: number) => number,
    dynamic: T.Box3[] = [],
  ) {
    const original = p.clone();
    original.y = ground(original.x, original.z) + 0.12;
    if (this.clearFoot(original, dynamic)) return original;
    for (let r = 0.25; r <= 5; r += 0.25)
      for (let i = 0; i < 32; i++) {
        const q = new T.Vector3(
          p.x + Math.cos((i * Math.PI) / 16) * r,
          0,
          p.z + Math.sin((i * Math.PI) / 16) * r,
        );
        q.y = ground(q.x, q.z) + 0.12;
        if (this.clearFoot(q, dynamic)) return q;
      }
    this.recover(original, dynamic);
    return original;
  }
  workExit(
    p: T.Vector3,
    ground: (x: number, z: number) => number,
    dynamic: T.Box3[] = [],
  ) {
    for (const [dx, dz] of [
      [0, 0.9],
      [-0.9, 0],
      [0.9, 0],
      [-0.65, 0.65],
      [0.65, 0.65],
      [0, -0.9],
      [-0.65, -0.65],
      [0.65, -0.65],
    ]) {
      let clear = true;
      for (let i = 1; i <= 12; i++) {
        const q = new T.Vector3(p.x + (dx * i) / 12, 0, p.z + (dz * i) / 12);
        q.y = ground(q.x, q.z) + 0.12;
        if (!this.clearFoot(q, dynamic)) {
          clear = false;
          break;
        }
      }
      if (clear)
        return new T.Vector3(
          p.x + dx,
          ground(p.x + dx, p.z + dz) + 0.12,
          p.z + dz,
        );
    }
    return this.safeFoot(p, ground, dynamic);
  }
  add(box: T.Box3) {
    if (
      box.isEmpty() ||
      box.min.x < -350 ||
      box.max.x > 350 ||
      box.min.z < -350 ||
      box.max.z > 350
    )
      return;
    this.count++;
    for (let x = Math.floor(box.min.x / 4); x <= Math.floor(box.max.x / 4); x++)
      for (
        let z = Math.floor(box.min.z / 4);
        z <= Math.floor(box.max.z / 4);
        z++
      ) {
        const key = x + "," + z;
        const entries = this.cells.get(key) || [];
        entries.push(box);
        this.cells.set(key, entries);
      }
  }
  collect(scene: T.Scene, doors: T.Mesh[]) {
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      for (let parent = o.parent; parent; parent = parent.parent)
        if (!parent.visible || parent.userData.noCollision) return;
      if (
        !(o instanceof T.Mesh) ||
        !o.visible ||
        doors.includes(o) ||
        o.userData.noCollision
      )
        return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const box = g.boundingBox!;
      const size = box.getSize(new T.Vector3());
      if (
        Math.max(size.x, size.z) > 250 ||
        o.getWorldPosition(new T.Vector3()).length() > 350
      )
        return;
      if (o instanceof T.InstancedMesh) {
        const m = new T.Matrix4(),
          world = new T.Matrix4();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          world.multiplyMatrices(o.matrixWorld, m);
          const volume = box.clone().applyMatrix4(world);
          if (
            o.userData.surfaceRock &&
            volume.max.y - volume.min.y <= 2.2 &&
            Math.max(
              volume.max.x - volume.min.x,
              volume.max.z - volume.min.z,
            ) <= 4.2
          )
            this.rollable.add(volume);
          this.add(volume);
          this.shape(
              volume,
              g,
              world,
              o.userData.surfaceRock
                ? "Boulder"
                : o.name || "Outpost equipment",
            );
        }
      } else if (g.type === "ExtrudeGeometry") {
        // Use individual hull/rib triangles, never an enclosing box across the walkable interior.
        const p = g.attributes.position,
          index = g.index,
          n = index ? index.count : p.count;
        const a = new T.Vector3(),
          b = new T.Vector3(),
          c = new T.Vector3();
        for (let i = 0; i < n; i += 3) {
          a.fromBufferAttribute(p, index ? index.getX(i) : i).applyMatrix4(
            o.matrixWorld,
          );
          b.fromBufferAttribute(
            p,
            index ? index.getX(i + 1) : i + 1,
          ).applyMatrix4(o.matrixWorld);
          c.fromBufferAttribute(
            p,
            index ? index.getX(i + 2) : i + 2,
          ).applyMatrix4(o.matrixWorld);
          const volume = new T.Box3()
            .setFromPoints([a, b, c])
            .expandByScalar(0.015);
          this.add(volume);
          this.shapes.set(volume, () => [
            new T.Triangle(a.clone(), b.clone(), c.clone()),
          ]);
          // Capture this triangle now; the scratch vertices are reused below.
          this.triangles.set(volume, [
            new T.Triangle(a.clone(), b.clone(), c.clone()),
          ]);
          this.labels.set(volume, "Habitat wall");
        }
      } else if (g.type === "TubeGeometry") {
        const params = (g as T.TubeGeometry).parameters;
        for (let i = 0; i < params.tubularSegments; i++) {
          const a = params.path
            .getPointAt(i / params.tubularSegments)
            .applyMatrix4(o.matrixWorld);
          const b = params.path
            .getPointAt((i + 1) / params.tubularSegments)
            .applyMatrix4(o.matrixWorld);
          const volume = new T.Box3()
            .setFromPoints([a, b])
            .expandByScalar(params.radius);
          this.add(volume);
          this.shape(volume, g, o.matrixWorld, "Utility pipe");
        }
      } else {
        const volume = box.clone().applyMatrix4(o.matrixWorld);
        if (
          o.userData.surfaceRock &&
          volume.max.y - volume.min.y <= 2.2 &&
          Math.max(volume.max.x - volume.min.x, volume.max.z - volume.min.z) <=
            4.2
        )
          this.rollable.add(volume);
        this.add(volume);
        this.shape(
            volume,
            g,
            o.matrixWorld,
            o.userData.surfaceRock ? "Boulder" : o.name || "Outpost equipment",
          );
      }
    });
  }
  nearby(x: number, z: number, r = BODY_RADIUS) {
    const result = new Set<T.Box3>();
    for (let i = Math.floor((x - r) / 4); i <= Math.floor((x + r) / 4); i++)
      for (let j = Math.floor((z - r) / 4); j <= Math.floor((z + r) / 4); j++)
        for (const box of this.cells.get(i + "," + j) || []) result.add(box);
    return result;
  }
  overlaps(x: number, z: number, b: T.Box3, radius = BODY_RADIUS) {
    const nx = Math.max(b.min.x, Math.min(b.max.x, x)),
      nz = Math.max(b.min.z, Math.min(b.max.z, z));
    return (x - nx) ** 2 + (z - nz) ** 2 < radius ** 2;
  }
  recover(p: T.Vector3, dynamic: T.Box3[] = []) {
    const blockers = (q: T.Vector3) =>
      [...this.nearby(q.x, q.z), ...dynamic].filter(
        (b) =>
          this.overlaps(q.x, q.z, b) &&
          q.y + BODY_HEIGHT > b.min.y + 0.025 &&
          q.y + STEP < b.max.y - 0.005,
      );
    for (let i = 0; i < 12; i++) {
      const hits = blockers(p);
      if (!hits.length) return;
      let best: T.Vector3 | null = null,
        score = Infinity;
      for (const b of hits)
        for (const q of [
          new T.Vector3(b.min.x - BODY_RADIUS - 0.01, p.y, p.z),
          new T.Vector3(b.max.x + BODY_RADIUS + 0.01, p.y, p.z),
          new T.Vector3(p.x, p.y, b.min.z - BODY_RADIUS - 0.01),
          new T.Vector3(p.x, p.y, b.max.z + BODY_RADIUS + 0.01),
        ]) {
          const next = blockers(q).length * 100 + q.distanceTo(p);
          if (next < score) {
            score = next;
            best = q;
          }
        }
      if (best) p.copy(best);
      else return;
    }
  }
  move(p: T.Vector3, dx: number, dz: number, dynamic: T.Box3[] = []) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
    for (let i = 0; i < steps; i++)
      for (const axis of ["x", "z"] as const) {
        const next = p.clone();
        next[axis] += (axis === "x" ? dx : dz) / steps;
        const obstacles = [...this.nearby(next.x, next.z), ...dynamic];
        const depth = (x: number, z: number, b: T.Box3) => {
          const edge = Math.min(
            x - b.min.x,
            b.max.x - x,
            z - b.min.z,
            b.max.z - z,
          );
          return edge >= 0
            ? BODY_RADIUS + edge
            : BODY_RADIUS -
                Math.hypot(
                  x - Math.max(b.min.x, Math.min(b.max.x, x)),
                  z - Math.max(b.min.z, Math.min(b.max.z, z)),
                );
        };
        const blocked = obstacles.some(
          (b) =>
            this.overlaps(next.x, next.z, b) &&
            p.y + BODY_HEIGHT > b.min.y + 0.025 &&
            p.y + STEP < b.max.y - 0.005 &&
            !(
              depth(p.x, p.z, b) > 0 &&
              depth(next.x, next.z, b) < depth(p.x, p.z, b) - 0.00001
            ),
        );
        if (!blocked) p[axis] = next[axis];
      }
  }
  vertical(
    p: T.Vector3,
    nextY: number,
    terrain: number,
    dynamic: T.Box3[] = [],
  ) {
    let floor = terrain,
      ceiling = Infinity;
    for (const b of [...this.nearby(p.x, p.z), ...dynamic])
      if (this.overlaps(p.x, p.z, b)) {
        if (b.max.y <= p.y + STEP + 0.01)
          floor = Math.max(floor, b.max.y + 0.005);
        if (b.min.y >= p.y + BODY_HEIGHT - STEP - 0.01)
          ceiling = Math.min(ceiling, b.min.y - BODY_HEIGHT - 0.01);
      }
    return {
      y: Math.max(floor, Math.min(nextY, ceiling)),
      floor,
      hitCeiling: nextY > ceiling,
    };
  }
}
