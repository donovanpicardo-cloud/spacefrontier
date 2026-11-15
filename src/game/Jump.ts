export function jumpPhase(
  grounded: boolean,
  velocity: number,
  landing: number,
  takeoff: number,
) {
  if (takeoff > 0) return "Jump_Takeoff";
  if (!grounded) return velocity > 0.15 ? "Jump_Rise" : "Jump_Fall";
  return landing > 0.035 ? "Jump_Land" : null;
}

