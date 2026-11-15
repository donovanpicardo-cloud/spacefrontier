import type { Destination, Sim } from "../simulation/engine";
export type Upgrade = "solar" | "recycler" | "workshop" | "medbay";
export type Adventure = {
  samples: string[];
  readyRobots: string[];
  rescued: string[];
  towing: string | null;
  upgrades: Upgrade[];
  research: number;
  cooldowns: Record<string, number>;
};
export const initialAdventure = (): Adventure => ({
  samples: [],
  readyRobots: [],
  rescued: [],
  towing: null,
  upgrades: [],
  research: 0,
  cooldowns: {},
});
export const projects: {
  id: Upgrade;
  name: string;
  subtitle: string;
  parts: number;
  power: number;
  water: number;
  research: number;
}[] = [
  {
    id: "medbay",
    name: "Crew recovery room",
    subtitle:
      "Add a walk-in room with a medical cot and recovery equipment. Rest inside to recover health and suit air; uses food and power.",
    parts: 3,
    power: 18,
    water: 0,
    research: 1,
  },
  {
    id: "solar",
    name: "Helios solar wing",
    subtitle: "Build a visible solar canopy. Generate 35% more solar power.",
    parts: 2,
    power: 12,
    water: 0,
    research: 0,
  },
  {
    id: "recycler",
    name: "Water recovery module",
    subtitle: "Install exterior recovery tanks. Recover water faster.",
    parts: 2,
    power: 10,
    water: 8,
    research: 0,
  },
  {
    id: "workshop",
    name: "Field workshop",
    subtitle:
      "Build the robot service bay. Field operations and robot repairs become faster.",
    parts: 3,
    power: 15,
    water: 0,
    research: 2,
  },
];
export function sampleSites(d: Destination) {
  return [
    {
      id: "sample-dark",
      name: d === "moon" ? "Dark lunar rock" : "Dark volcanic fragment",
      description:
        "A dark, textured rock. Compare its rough surface with your other samples.",
      x: -8,
      z: 15,
      colour: d === "moon" ? 0x4c555c : 0x593f36,
    },
    {
      id: "sample-light",
      name: d === "moon" ? "Pale highland fragment" : "Layered pale stone",
      description:
        "A pale fragment with bright layers. Your scanner records its pattern.",
      x: 10,
      z: 14,
      colour: 0xd2c3a5,
    },
    {
      id: "sample-dust",
      name: d === "moon" ? "Fine lunar grains" : "Red surface dust",
      description:
        "Fine grains collected with a sealed sampler. Research helps improve your field tools.",
      x: 31,
      z: -6,
      colour: d === "moon" ? 0x8e9393 : 0xa94e31,
    },
    {
      id: "sample-ice",
      name: "Ice-bearing sample",
      description:
        "A sealed icy sample. Its research data helps the team plan future supply runs.",
      x: -24,
      z: 24,
      colour: 0x9bcfd3,
    },
    ...([["rim", -365, -214], ["basin", 232, -475], ["ridge", 418, 319], ["plain", -539, 127]] as const).map(([landform, x, z]) => ({
      id: "sample-" + landform, name: "Outer " + landform + " specimen",
      description: "A survey specimen collected from the outer " + landform + ".",
      x, z, colour: d === "moon" ? 0x86919a : 0xb07558,
    })),
  ];
}
export function robotSites(d: Destination) {
  return [
    {
      id: "scout",
      name: d === "moon" ? "Luna Scout 7" : "Ares Scout 7",
      x: -25,
      z: 2,
    },
    {
      id: "pip",
      name: d === "moon" ? "PIP lunar mapper" : "PIP Mars mapper",
      x: 29,
      z: 28,
    },
    { id: "relay", name: "Relay survey crawler", x: -288, z: 372 },
    { id: "ranger", name: "Ranger survey crawler", x: 386, z: -258 },
  ];
}
const robotIds = robotSites("moon").map(robot => robot.id);
export const recoveryBay = {
  id: "recovery",
  name: "Robot recovery pad",
  x: -5,
  z: 1,
};
export function badges(a: Adventure) {
  return [
    {
      id: "geologist",
      name: "Junior Geologist",
      earned: a.samples.length >= 4,
      detail: `${Math.min(4, a.samples.length)}/4 samples recorded`,
    },
    {
      id: "rescuer",
      name: "Rover Rescue Crew",
      earned: a.rescued.length >= 2,
      detail: `${Math.min(2, a.rescued.length)}/2 robots returned`,
    },
    {
      id: "builder",
      name: "Outpost Engineer",
      earned: a.upgrades.length >= 4,
      detail: `${a.upgrades.length}/4 projects built`,
    },
    {
      id: "explorer",
      name: "First Discovery",
      earned: a.samples.length >= 1,
      detail: "Record your first sample",
    },
  ];
}
export function projectProblem(a: Adventure, s: Sim, id: Upgrade) {
  const p = projects.find((p) => p.id === id)!;
  return a.upgrades.includes(id)
    ? "Already built"
    : s.parts < p.parts
      ? `Need ${p.parts} spare parts`
      : s.battery < p.power
        ? `Need ${p.power}% power`
        : s.water < p.water
          ? `Need ${p.water}% water`
          : a.research < p.research
            ? `Need ${p.research} research data from samples`
            : null;
}
export function buildProject(a: Adventure, s: Sim, id: Upgrade) {
  if (projectProblem(a, s, id)) return null;
  const p = projects.find((p) => p.id === id)!;
  return {
    adventure: {
      ...a,
      research: a.research - p.research,
      upgrades: [...a.upgrades, id],
    },
    sim: {
      ...s,
      parts: s.parts - p.parts,
      battery: s.battery - p.power,
      water: s.water - p.water,
    },
  };
}
export function collectSample(a: Adventure, id: string): Adventure {
  if (a.samples.includes(id) || !sampleSites("moon").some((s) => s.id === id))
    return a;
  return { ...a, samples: [...a.samples, id], research: a.research + 1 };
}
export function repairRobot(a: Adventure, s: Sim, id: string) {
  if (
    !robotIds.includes(id) ||
    a.readyRobots.includes(id) ||
    a.rescued.includes(id) ||
    s.parts < 1 ||
    s.battery < 8
  )
    return null;
  return {
    adventure: { ...a, readyRobots: [...a.readyRobots, id] },
    sim: { ...s, parts: s.parts - 1, battery: s.battery - 8 },
  };
}
export function deliverRobot(a: Adventure, s: Sim, id: string) {
  if (a.towing !== id || !a.readyRobots.includes(id) || a.rescued.includes(id))
    return null;
  return {
    adventure: { ...a, towing: null, rescued: [...a.rescued, id] },
    sim: {
      ...s,
      parts: Math.min(20, s.parts + 3),
      battery: Math.min(100, s.battery + 10),
    },
  };
}
export function remainingCooldown(a: Adventure, id: string, time: number) {
  return Math.max(0, Math.ceil((a.cooldowns[id] || 0) - time));
}
export function validAdventure(v: unknown): v is Adventure {
  if (!v || typeof v !== "object") return false;
  const a = v as Adventure;
  const unique = (x: unknown, allowed: string[]) =>
    Array.isArray(x) &&
    new Set(x).size === x.length &&
    x.every((i) => typeof i === "string" && allowed.includes(i));
  return (
    unique(
      a.samples,
      sampleSites("moon").map((s) => s.id),
    ) &&
    unique(a.readyRobots, robotIds) &&
    unique(a.rescued, robotIds) &&
    unique(a.upgrades, ["solar", "recycler", "workshop", "medbay"]) &&
    (a.towing === null || robotIds.includes(a.towing)) &&
    (!a.towing ||
      (a.readyRobots.includes(a.towing) && !a.rescued.includes(a.towing))) &&
    Number.isInteger(a.research) &&
    a.research >= 0 &&
    a.research <= a.samples.length &&
    !!a.cooldowns &&
    typeof a.cooldowns === "object" &&
    !Array.isArray(a.cooldowns) &&
    Object.entries(a.cooldowns).every(
      ([k, t]) =>
        ["solar", "greenhouse", "life", "airlock"].includes(k) &&
        Number.isFinite(t) &&
        t >= 0,
    )
  );
}
