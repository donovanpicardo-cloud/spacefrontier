import type { Box3 } from "three";

/** Rectangle/box SAT: use the visible chassis footprint, not an oversized circle. */
export function chassisOverlaps(
  x: number,
  z: number,
  yaw: number,
  width: number,
  length: number,
  b: Box3,
) {
  const c = Math.cos(yaw),
    s = Math.sin(yaw),
    dx = (b.min.x + b.max.x) / 2 - x,
    dz = (b.min.z + b.max.z) / 2 - z;
  const bx = (b.max.x - b.min.x) / 2,
    bz = (b.max.z - b.min.z) / 2;
  const ac = Math.abs(c),
    as = Math.abs(s),
    gap = 0.015;
  return (
    Math.abs(dx) < width * ac + length * as + bx - gap &&
    Math.abs(dz) < width * as + length * ac + bz - gap &&
    Math.abs(dx * c - dz * s) < width + bx * ac + bz * as - gap &&
    Math.abs(dx * s + dz * c) < length + bx * as + bz * ac - gap
  );
}

