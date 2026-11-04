import { MathUtils } from "three";
export function orbitDelta(
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  sensitivity: number,
) {
  if (![yaw, pitch, dx, dy, sensitivity].every(Number.isFinite))
    return { yaw: 0, pitch: 0.2 };
  return {
    yaw: yaw - dx * 0.003 * sensitivity,
    pitch: MathUtils.clamp(pitch + dy * 0.003 * sensitivity, -0.42, 0.95),
  };
}

export function shoulderFraming(distance: number) {
  const tight = MathUtils.clamp((2.9 - distance) / 1.3, 0, 1);
  return { fov: 52 + tight * 30, aimDrop: tight * 0.36 };
}
