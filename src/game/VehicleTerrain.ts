import * as T from "three";
import type { CollisionWorld } from "./CollisionWorld";
export function wheelSurface(
  x: number,
  z: number,
  ground: (x: number, z: number) => number,
  physics: CollisionWorld,
) {
  let height = ground(x, z);
  for (const b of physics.nearby(x, z, 0.6)) {
    if (!physics.rollable.has(b)) continue;
    const load = physics.shapes.get(b);
    if (load) {
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      const triangles = physics.triangles.get(b) ?? load();
      physics.triangles.set(b, triangles);
      const ray = new T.Ray(new T.Vector3(x, b.max.y + 1, z), new T.Vector3(0, -1, 0));
      const hit = new T.Vector3();
      for (const face of triangles)
        if (ray.intersectTriangle(face.a, face.b, face.c, false, hit)) height = Math.max(height, hit.y);
      continue;
    }
    const cx = (b.min.x + b.max.x) / 2,
      cz = (b.min.z + b.max.z) / 2;
    const rx = (b.max.x - b.min.x) / 2 + 0.25,
      rz = (b.max.z - b.min.z) / 2 + 0.25;
    const q = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
    if (q >= 1) continue;
    const base = ground(cx, cz),
      crest = Math.max(0, b.max.y - base);
    // Smooth rounded envelope gives wheels a climb and descent instead of a hard step.
    height = Math.max(height, ground(x, z) + crest * Math.pow(1 - q, 1.5));
  }
  return height;
}
export function suspensionSupport(
  x: number,
  z: number,
  yaw: number,
  ground: (x: number, z: number) => number,
  physics: CollisionWorld,
) {
  const at = (side: number, front: number) =>
    wheelSurface(
      x + Math.cos(yaw) * side - Math.sin(yaw) * front,
      z - Math.sin(yaw) * side - Math.cos(yaw) * front,
      ground,
      physics,
    );
  const fl = at(-1, 1.15),
    fr = at(1, 1.15),
    bl = at(-1, -1.15),
    br = at(1, -1.15);
  const floor = ground(x, z),
    center = wheelSurface(x, z, ground, physics);
  const height = Math.max(floor, (fl + fr + bl + br) / 4, center - 0.28);
  return {
    height,
    pitch: T.MathUtils.clamp(
      Math.atan2((fl + fr - bl - br) / 2, 2.3),
      -0.42,
      0.42,
    ),
    roll: T.MathUtils.clamp(
      Math.atan2((fr + br - fl - bl) / 2, 2),
      -0.38,
      0.38,
    ),
  };
}

// Both the warped base grid and the streamed tiles use PlaneGeometry's diagonal.
export function groundMeshHeight(mesh: T.Mesh, x: number, z: number) {
  const grid = mesh.geometry as T.PlaneGeometry;
  const vertices = grid.attributes.position;
  const columns = grid.parameters.widthSegments + 1;
  const rows = grid.parameters.heightSegments + 1;
  const cell = (coordinate: number, count: number, stride: number, axis: "getX" | "getZ") => {
    let low = 0, high = count - 1;
    while (high - low > 1) {
      const middle = (low + high) >>> 1;
      if (vertices[axis](middle * stride) <= coordinate) low = middle;
      else high = middle;
    }
    return low;
  };
  const i = cell(z, rows, columns, "getZ") * columns + cell(x, columns, 1, "getX");
  const u = (x - vertices.getX(i)) / (vertices.getX(i + 1) - vertices.getX(i));
  const v = (z - vertices.getZ(i)) / (vertices.getZ(i + columns) - vertices.getZ(i));
  const b = vertices.getY(i + columns), d = vertices.getY(i + 1);
  return u + v <= 1 ? vertices.getY(i) * (1 - u - v) + u * d + v * b
    : vertices.getY(i + columns + 1) * (u + v - 1) + (1 - u) * b + (1 - v) * d;
}

