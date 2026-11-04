import type { Sim } from "./engine";
import type { RepairKind } from "../game/RepairPlan";
const capped = (n: number) => Math.max(0, Math.min(100, n));
export function serviceReward(s: Sim, kind: RepairKind): Sim {
  return {
    ...s,
    parts: Math.max(0, s.parts - 1),
    condition: capped(s.condition + 15),
    ...(kind === "solar"
      ? { repaired: true, battery: capped(s.battery + 12) }
      : kind === "greenhouse"
        ? {
            irrigation: true,
            water: capped(s.water + 8),
            food: capped(s.food + 12),
            crop: capped(s.crop + 25),
          }
        : {
            oxygen: capped(s.oxygen + 18),
            suit: capped(s.suit + 20),
            co2: Math.max(0.04, s.co2 - 0.4),
            health: capped(s.health + 4),
          }),
  };
}
export function serviceMessage(before: Sim, after: Sim, kind: RepairKind) {
  const fields =
    kind === "greenhouse"
      ? (["water", "food", "crop"] as const)
      : kind === "life"
        ? (["oxygen", "suit", "health"] as const)
        : (["battery"] as const);
  const names = {
    water: "water",
    food: "food",
    crop: "crops",
    oxygen: "oxygen",
    suit: "suit air",
    health: "health",
    battery: "power",
  };
  const gains = fields
    .filter((k) => after[k] > before[k])
    .map((k) => `+${Math.round(after[k] - before[k])}% ${names[k]}`);
  return `${kind === "greenhouse" ? "Hydroponics" : kind === "life" ? "Life support" : "Solar power"} restored · ${gains.join(" · ") || "reserves already full"} · 1 spare part used.`;
}
