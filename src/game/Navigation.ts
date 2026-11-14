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
    station.id === "airlock"
      ? { x: 0, z: inside ? -13.4 : -8.2 }
      : inside !== interior
        ? { x: 0, z: inside ? -13.4 : -8.2 }
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

type Waypoint = { x: number; z: number };

export function walkingRoute(
  start: Waypoint,
  goal: Waypoint,
  radius: number,
  clear: (point: Waypoint) => boolean,
): Waypoint[] {
  const step = 1;
  const distance = (a: Waypoint, b: Waypoint) => Math.hypot(a.x - b.x, a.z - b.z);
  const segment = (a: Waypoint, b: Waypoint) => {
    const n = Math.max(1, Math.ceil(distance(a, b) / 0.3));
    for (let i = 1; i <= n; i++) {
      if (!clear({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n })) return false;
    }
    return true;
  };
  if (distance(start, goal) <= radius) return [];
  const length = distance(start, goal);
  const approach = { x: goal.x + (start.x - goal.x) * radius * .8 / length, z: goal.z + (start.z - goal.z) * radius * .8 / length };
  if (segment(start, approach)) return [approach];

  type Node = Waypoint & { cost: number; score: number; parent?: Node };
  const open: Node[] = [{ ...start, cost: 0, score: length }];
  const costs = new Map<string, number>();
  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let visited = 0; open.length && visited < 3000; visited++) {
    open.sort((a, b) => b.score - a.score);
    const node = open.pop()!;
    if (distance(node, goal) <= radius) {
      const points: Waypoint[] = [];
      for (let current: Node | undefined = node; current?.parent; current = current.parent) points.unshift(current);
      const route: Waypoint[] = [];
      let previous = start;
      for (let i = 0; i < points.length; i++) {
        while (i + 1 < points.length && segment(previous, points[i + 1])) i++;
        previous = points[i];
        route.push({ x: previous.x, z: previous.z });
      }
      return route;
    }
    for (const [dx, dz] of offsets) {
      const next = { x: node.x + dx * step, z: node.z + dz * step };
      const key = [Math.round(next.x - start.x), Math.round(next.z - start.z)].join(",");
      const cost = node.cost + Math.hypot(dx, dz) * step;
      if (cost >= (costs.get(key) ?? Infinity) || !segment(node, next)) continue;
      costs.set(key, cost);
      open.push({ ...next, cost, score: cost + distance(next, goal) * 1.6, parent: node });
    }
  }
  return [];
}
