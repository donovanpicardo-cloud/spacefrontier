export type Destination = "moon" | "mars";
export type Allocation = {
  oxygen: boolean;
  greenhouse: boolean;
  recycler: boolean;
  backup: boolean;
};
export type Sim = {
  time: number;
  oxygen: number;
  co2: number;
  battery: number;
  water: number;
  food: number;
  radiation: number;
  temperature: number;
  pressure: number;
  health: number;
  suit: number;
  condition: number;
  crop: number;
  storm: boolean;
  stormSince: number | null;
  repaired: boolean;
  irrigation: boolean;
  shielded: boolean;
  parts: number;
  history: number[][];
};
export const initialSim = (): Sim => ({
  time: 0,
  oxygen: 86,
  co2: 0.4,
  battery: 74,
  water: 82,
  food: 78,
  radiation: 0,
  temperature: 21,
  pressure: 101,
  health: 100,
  suit: 100,
  condition: 65,
  crop: 25,
  storm: false,
  stormSince: null,
  repaired: false,
  irrigation: false,
  shielded: false,
  parts: 6,
  history: [],
});
const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));
export function reinforceShelter(s: Sim): Sim | null {
  if (s.shielded || s.parts < 1 || s.battery < 6) return null;
  return { ...s, shielded: true, parts: s.parts - 1, battery: s.battery - 6 };
}
export function power(
  s: Sim,
  a: Allocation,
  d: Destination,
  upgrades: readonly string[] = [],
) {
  const sunlight = Math.max(0.05, Math.cos(s.time / 240));
  const generated =
    (s.repaired ? 2.5 : 1.1) *
    (upgrades.includes("solar") ? 1.35 : 1) *
    sunlight *
    (s.storm ? (d === "mars" ? 0.18 : 0.05) : 1);
  const consumed =
    0.45 +
    (a.oxygen ? 0.65 : 0) +
    (a.greenhouse ? 0.55 : 0) +
    (a.recycler ? 0.25 : 0);
  return {
    generated,
    consumed,
    net: generated + (a.backup && s.parts > 0 ? 0.9 : 0) - consumed,
  };
}
// Fixed one-second ticks. All reservoir units are illustrative percent capacity;
// time is accelerated gameplay seconds, radiation is an educational exposure index.
export function tick(
  state: Sim,
  a: Allocation,
  d: Destination,
  inside: boolean,
  upgrades: readonly string[] = [],
  recoveryRoom = false,
): Sim {
  const s = { ...state, time: state.time + 1 };
  const p = power(s, a, d, upgrades);
  s.battery = clamp(s.battery + p.net * 0.18);
  const powered = s.battery > 0;
  s.oxygen = clamp(
    s.oxygen - 0.035 + (a.oxygen && powered && s.water > 0 ? 0.065 : 0),
  );
  s.water = clamp(
    s.water -
      0.016 -
      (a.oxygen && powered ? 0.018 : 0) -
      (a.greenhouse && s.irrigation ? 0.012 : 0) +
      (a.recycler && powered
        ? upgrades.includes("recycler")
          ? 0.045
          : 0.025
        : 0),
  );
  s.co2 = clamp(s.co2 + 0.002 - (a.oxygen && powered ? 0.003 : 0), 0.04, 10);
  s.food = clamp(s.food - 0.009);
  if (s.food < 10) s.health = clamp(s.health - 0.04);
  s.crop = clamp(
    s.crop +
      (a.greenhouse && powered && s.irrigation && s.water > 0 ? 0.09 : 0),
  );
  s.suit = clamp(s.suit + (inside ? 0.4 : -0.025));
  if (
    recoveryRoom &&
    inside &&
    upgrades.includes("medbay") &&
    powered &&
    s.food > 0 &&
    (s.health < 100 || s.suit < 100)
  ) {
    s.health = clamp(s.health + 0.45);
    s.suit = clamp(s.suit + 0.8);
    s.battery = clamp(s.battery - 0.06);
    s.food = clamp(s.food - 0.018);
  }
  s.radiation += inside
    ? s.shielded
      ? 0.0001
      : 0.001
    : s.storm
      ? 0.04
      : 0.003;
  s.temperature +=
    (powered
      ? 21 - s.temperature
      : (d === "moon" ? -30 : -15) - s.temperature) * 0.001;
  s.pressure = clamp(s.pressure + (s.condition < 20 ? -0.04 : 0), 0, 101);
  if (s.oxygen < 10 || s.suit === 0 || s.co2 > 3 || s.pressure < 60)
    s.health = clamp(s.health - 0.25);
  if (a.backup && s.parts > 0) s.parts = Math.max(0, s.parts - 0.0008);
  if (s.time % 5 === 0)
    s.history = [
      ...s.history.slice(-59),
      [s.oxygen, s.battery, s.water, s.food],
    ];
  return s;
}
export const missions = (d: Destination) => [
  {
    name: d === "moon" ? "First steps" : "Welcome to Mars",
    task: "Reach the habitat airlock and cycle inside.",
    target: "airlock",
    lesson: "An airlock isolates the cabin from the unbreathable exterior.",
  },
  {
    name: d === "moon" ? "Power the outpost" : "The dust problem",
    task:
      d === "mars"
        ? "Brush the red dust from the solar contacts, then connect the two matching leads."
        : "Open the solar array service panel and connect all three leads to their matching sockets.",
    target: "solar",
    lesson:
      "Restoring solar generation improves power reserves, but sunlight is still finite.",
  },
  {
    name: d === "moon" ? "A garden beyond Earth" : "Greenhouse emergency",
    task: "Turn both supply and return valves, then enable grow lights.",
    target: "greenhouse",
    lesson:
      "Plants need water and electrical lighting. Food production competes with life support.",
  },
  {
    name: d === "moon" ? "Breathable tomorrow" : "Systems under pressure",
    task: "Remove the dirty life-support cartridge to the left tray, then fit the clean one from the right tray.",
    target: "life",
    lesson:
      "Electrolysis consumes both water and electricity to replenish oxygen.",
  },
  {
    name: d === "moon" ? "Survive the darkness" : "The great dust storm",
    task: "Enable emergency power, switch off grow lights and reach shelter.",
    target: "shelter",
    lesson:
      "Prioritizing essential loads and shielding buys time during environmental emergencies.",
  },
];
