export type DriveInput = { throttle: number; steer: number; brake: boolean };
export type DriveState = { x: number; z: number; yaw: number; speed: number };
export function driveStep(
  state: DriveState,
  input: DriveInput,
  dt: number,
  maxSpeed: number,
  canMove: (
    x: number,
    z: number,
    yaw: number,
    fromX: number,
    fromZ: number,
  ) => boolean,
): DriveState {
  dt = Math.max(0, Math.min(0.05, dt));
  const s = { ...state };
  const desired = input.brake ? 0 : input.throttle * maxSpeed;
  const rate = input.brake ? 14 : input.throttle ? 4.5 : 3;
  s.speed +=
    Math.sign(desired - s.speed) *
    Math.min(Math.abs(desired - s.speed), rate * dt);
  if (Math.abs(s.speed) < 0.02) s.speed = 0;
  const nextYaw =
    s.yaw +
    input.steer *
      Math.min(1.15, Math.abs(s.speed) * 0.4) *
      Math.sign(s.speed) *
      dt;
  if (canMove(s.x, s.z, nextYaw, s.x, s.z)) s.yaw = nextYaw;
  const distance = s.speed * dt,
    steps = Math.max(1, Math.ceil(Math.abs(distance) / 0.1));
  for (let i = 0; i < steps; i++) {
    const x = s.x - (Math.sin(s.yaw) * distance) / steps,
      z = s.z - (Math.cos(s.yaw) * distance) / steps;
    if (!canMove(x, z, s.yaw, s.x, s.z)) {
      s.speed = 0;
      break;
    }
    s.x = x;
    s.z = z;
  }
  return s;
}
