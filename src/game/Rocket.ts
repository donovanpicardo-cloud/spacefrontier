import type { Sim } from "../simulation/engine";
export type RocketProgress = { stage: number; arrived: boolean };
export const initialRocket = (): RocketProgress => ({
  stage: 0,
  arrived: false,
});
export const rocketPad = {
  id: "rocket",
  name: "Earthbound launch pad",
  x: -32,
  z: -22,
};
export const rocketStages = [
  {
    name: "Flight frame",
    description: "Salvage becomes the rocket’s structure and landing legs.",
    parts: 2,
    battery: 10,
    water: 0,
    oxygen: 0,
    food: 0,
    research: 0,
  },
  {
    name: "Engine & fuel processor",
    description:
      "Ice water and electricity supply the fictional fuel processor.",
    parts: 2,
    battery: 16,
    water: 16,
    oxygen: 0,
    food: 0,
    research: 0,
  },
  {
    name: "Crew capsule & journey supplies",
    description:
      "Pack drinking water, food and oxygen. Sample research calibrates navigation.",
    parts: 2,
    battery: 8,
    water: 8,
    oxygen: 12,
    food: 8,
    research: 1,
  },
] as const;
export function validRocket(v: unknown): v is RocketProgress {
  if (!v || typeof v !== "object") return false;
  const r = v as RocketProgress;
  return (
    Number.isInteger(r.stage) &&
    r.stage >= 0 &&
    r.stage <= 3 &&
    typeof r.arrived === "boolean" &&
    (!r.arrived || r.stage === 3)
  );
}
export function rocketProblem(r: RocketProgress, s: Sim, research: number) {
  if (r.arrived) return "Already home";
  if (r.stage === 3) return "Rocket ready";
  const cost = rocketStages[r.stage];
  for (const key of ["parts", "battery", "water", "oxygen", "food"] as const)
    if (s[key] < cost[key])
      return `Need ${cost[key]}${key === "parts" ? " parts" : `% ${key === "battery" ? "power" : key}`}`;
  return research < cost.research ? "Scan a rock sample to earn 1 research point" : null;
}
export function assembleRocket(r: RocketProgress, s: Sim, research: number) {
  if (rocketProblem(r, s, research)) return null;
  const cost = rocketStages[r.stage];
  return {
    rocket: { stage: r.stage + 1, arrived: false },
    research: research - cost.research,
    sim: {
      ...s,
      parts: s.parts - cost.parts,
      battery: s.battery - cost.battery,
      water: s.water - cost.water,
      oxygen: s.oxygen - cost.oxygen,
      food: s.food - cost.food,
    },
  };
}
export function launchProblem(
  r: RocketProgress,
  completed: number[],
  inside: boolean,
  riding: boolean,
  lifeSupport: Pick<Sim, "health" | "suit" | "oxygen">,
) {
  if (r.arrived) return "Your mission is complete";
  if (lifeSupport.health <= 0) return "Crew health is depleted. Restart the mission.";
  if (lifeSupport.suit <= 0) return "Suit air is empty. Go inside the habitat to refill it.";
  if (lifeSupport.oxygen < 10) return "Outpost oxygen is too low. Restore life support before launch.";
  if (r.stage < 3) return "Build all three rocket sections first";
  if (![0, 1, 2, 3, 4].every((i) => completed.includes(i)))
    return "Finish the five outpost missions first";
  if (inside) return "Go outside to the launch pad";
  if (riding) return "Park your buggy and get out";
  return null;
}
export const FLIGHT_DURATION = 36;
export function flightPhase(t: number) {
  return t < 4
    ? "countdown"
    : t < 13
      ? "ascent"
      : t < 22
        ? "transfer"
        : t < FLIGHT_DURATION
          ? "earth"
          : "complete";
}
