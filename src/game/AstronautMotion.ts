export type HorizontalVelocity = { x: number; z: number };
/** Boots accelerate/brake on the ground. In flight there is no magic air brake. */
export function horizontalStep(
  v: HorizontalVelocity,
  input: HorizontalVelocity,
  yaw: number,
  grounded: boolean,
  enabled: boolean,
  sprint: boolean,
  dt: number,
) {
  dt = Math.max(0, Math.min(0.05, dt));
  if (!enabled) return { x: 0, z: 0, dx: 0, dz: 0 };
  const length = Math.hypot(input.x, input.z),
    speed = sprint ? 4.5 : 2.1;
  const scale = speed / Math.max(1, length);
  const x = input.x * scale, z = input.z * scale;
  const targetX = x * Math.cos(yaw) + z * Math.sin(yaw),
    targetZ = z * Math.cos(yaw) - x * Math.sin(yaw);
  if (!grounded) {
    // Gently steer with the suit in flight, but releasing controls preserves momentum.
    if (!length) return { ...v, dx: v.x * dt, dz: v.z * dt };
    const difference = Math.hypot(targetX - v.x, targetZ - v.z);
    const fraction = difference ? Math.min(1, (2.2 * dt) / difference) : 0;
    const next = {
      x: v.x + (targetX - v.x) * fraction,
      z: v.z + (targetZ - v.z) * fraction,
    };
    return {
      ...next,
      dx: (v.x + next.x) * 0.5 * dt,
      dz: (v.z + next.z) * 0.5 * dt,
    };
  }
  const blend = 1 - Math.exp(-(length ? 8 : 14) * dt);
  const next = {
    x: v.x + (targetX - v.x) * blend,
    z: v.z + (targetZ - v.z) * blend,
  };
  return {
    ...next,
    dx: (v.x + next.x) * 0.5 * dt,
    dz: (v.z + next.z) * 0.5 * dt,
  };
}
export function ballisticStep(velocity: number, gravity: number, dt: number) {
  dt = Math.max(0, Math.min(0.05, dt));
  return {
    dy: velocity * dt - 0.5 * gravity * dt * dt,
    velocity: velocity - gravity * dt,
  };
}
