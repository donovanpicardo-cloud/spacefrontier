export function navigationTarget(
  p: { x: number; z: number },
  inside: boolean,
  station: { id: string; x: number; z: number },
) {
  const interior = [
    "greenhouse",
    "life",
    "shelter",
    "fabricator",
    "medbay",
  ].includes(station.id);
  const destination =
    inside !== interior
      ? { x: 0, z: inside ? -13 : -8 }
      : { x: station.x, z: station.z };
  if (inside && station.id === "medbay") {
    if (Math.abs(p.z + 23) > 0.28)
      return { x: p.x > 6.5 ? p.x : 0, z: -23, phase: "room-align" };
    return { x: station.x, z: -23, phase: "room-enter" };
  }
  // The central habitat aisle is clear of workstations and growing racks.
  if (inside && p.x > 7 && !["medbay"].includes(station.id))
    return { x: 3, z: -23, phase: "room-exit" };
  if (inside && Math.abs(p.z - destination.z) > 2) {
    if (Math.abs(p.x) > 1.15) return { x: 0, z: p.z, phase: "aisle" };
    return { x: 0, z: destination.z, phase: "hall" };
  }
  return { ...destination, phase: "target" };
}
