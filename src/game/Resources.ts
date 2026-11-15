import type { Destination, Sim } from "../simulation/engine";
export type ResourceKind = "ice" | "salvage" | "battery";
export const resourceTitles: Record<ResourceKind, string> = {
  ice: "Water ice extraction",
  salvage: "Equipment recovery",
  battery: "Portable power station",
};
export type ResourceSite = {
  id: string;
  kind: ResourceKind;
  name: string;
  x: number;
  z: number;
  amount: number;
};
const originalIds = [
  "ice-near",
  "ice-far",
  "salvage-near",
  "salvage-far",
  "battery-near",
  "battery-far",
  "ice-rim",
  "ice-basin",
  "salvage-relay",
  "salvage-canyon",
  "battery-relay",
  "battery-mesa",
];
// Each quadrant has a near and an outer station of each kind.
const surveyStations: ResourceSite[] = [];
for (const [sector, sx, sz] of [
  ["NE", 1, -1], ["SE", 1, 1], ["SW", -1, 1], ["NW", -1, -1],
] as const) {
  for (const [kind, x, z, amount] of [
    ["ice", 34, 15, 10], ["battery", 25, 41, 12],
    ["ice", 100, 146, 14], ["battery", 151, 63, 16],
    ["ice", 265, 346, 14], ["battery", 482, 118, 16],
    ["salvage", 312, 554, 3],
  ] as const) {
    const band = x > 200 ? "frontier" : x > 80 ? "outer" : "inner";
    surveyStations.push({ id: kind + "-" + sector + "-" + band, kind,
      name: resourceTitles[kind] + " · " + sector + " " + band, x: sx * x, z: sz * z, amount });
  }
}
export const resourceIds = [...originalIds, ...surveyStations.map(s => s.id)];
export function resourceSites(d: Destination): ResourceSite[] {
  const positions =
    d === "moon"
      ? [
          [-64, 42],
          [76, -67],
          [61, 55],
          [-79, -44],
          [32, -63],
          [-55, -71],
          [-148, 104],
          [162, -121],
          [136, 113],
          [-174, -108],
          [118, -161],
          [-132, 164],
        ]
      : [
          [-61, -58],
          [72, 63],
          [-76, 48],
          [66, -58],
          [40, 70],
          [-41, -73],
          [-154, -112],
          [149, 128],
          [-168, 102],
          [172, -118],
          [132, 165],
          [-126, -170],
        ];
  const kinds: ResourceKind[] = [
    "ice",
    "ice",
    "salvage",
    "salvage",
    "battery",
    "battery",
    "ice",
    "ice",
    "salvage",
    "salvage",
    "battery",
    "battery",
  ];
  const names =
    d === "moon"
      ? [
          "Water ice deposit · Shadow Crater",
          "Water ice deposit · Far Regolith",
          "Survey probe recovery · Ridge",
          "Equipment recovery · Western Crater",
          "Portable power station · Southern Plain",
          "Portable power station · Far Ridge",
          "Water ice deposit · Polar Rim",
          "Water ice deposit · Shaded Basin",
          "Relay equipment recovery · East",
          "Equipment recovery · Outer Crater",
          "Portable power station · Highland",
          "Emergency power station · Basin",
        ]
      : [
          "Subsurface ice deposit · North",
          "Subsurface ice deposit · South",
          "Survey drone recovery · Canyon",
          "Equipment recovery · Eastern Plain",
          "Portable power station · Southern Plain",
          "Portable power station · Northern Plain",
          "Subsurface ice deposit · Frost Canyon",
          "Subsurface ice deposit · Ancient Lake",
          "Relay equipment recovery · West",
          "Equipment recovery · Red Canyon",
          "Portable power station · Mesa",
          "Portable power station · Northern Ridge",
        ];
  return originalIds.map((id, i) => ({
    id,
    kind: kinds[i],
    name: names[i],
    x: positions[i][0],
    z: positions[i][1],
    amount: [14, 20, 1, 2, 16, 22, 16, 18, 5, 6, 18, 20][i],
  })).concat(surveyStations);
}
export function hasResourceSpace(s: Sim, kind: ResourceKind, amount = 1) {
  return kind === "ice"
    ? s.water + amount <= 100
    : kind === "battery"
      ? s.battery + amount <= 100
      : s.parts + amount <= 20;
}
export function resourceReward(s: Sim, site: ResourceSite): Sim {
  return {
    ...s,
    ...(site.kind === "ice"
      ? { water: Math.min(100, s.water + site.amount) }
      : site.kind === "battery"
        ? { battery: Math.min(100, s.battery + site.amount) }
        : { parts: Math.min(20, s.parts + site.amount) }),
  };
}
export class Gathering {
  duration = 3;
  collected = new Set<string>();
  active: string | null = null;
  elapsed = 0;
  start(id: string) {
    if (this.collected.has(id) || !resourceIds.includes(id)) return false;
    if (this.active !== id) {
      this.active = id;
      this.elapsed = 0;
    }
    return true;
  }
  cancel() {
    this.active = null;
    this.elapsed = 0;
  }
  update(dt: number, held: boolean, near: boolean) {
    if (!this.active) return null;
    if (!held || !near) {
      this.cancel();
      return null;
    }
    this.elapsed += Math.max(0, Math.min(dt, 0.1));
    if (this.elapsed + 1e-8 < this.duration) return null;
    const id = this.active;
    this.collected.add(id);
    this.cancel();
    return id;
  }
  restore(ids: string[] = []) {
    this.cancel();
    this.collected = new Set(ids.filter((id) => resourceIds.includes(id)));
  }
}

