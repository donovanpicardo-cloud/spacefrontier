export type TouchKey = "Space" | "Shift" | "KeyE" | "KeyA" | "KeyD" | "KeyW" | "KeyS";

export function joystickAxes(x: number, y: number, radius: number) {
  const distance = Math.hypot(x, y);
  const deadZone = radius * 0.16;
  if (distance <= deadZone) return { x: 0, y: 0 };
  const strength = Math.min(1, (distance - deadZone) / (radius - deadZone));
  return { x: x / distance * strength, y: y / distance * strength };
}
