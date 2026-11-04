import { validRocket, type RocketProgress } from "./Rocket";
import {
  initialSim,
  type Sim,
  type Allocation,
  type Destination,
} from "../simulation/engine";
import type { VehicleSave } from "./Vehicle";
import { resourceIds } from "./Resources";
import { validAdventure, type Adventure } from "./Adventure";
export type Save = {
  version: 1;
  rocket?: RocketProgress;
  destination: Destination;
  sim: Sim;
  allocation: Allocation;
  mission: number;
  done: number[];
  position: number[];
  inside: boolean;
  mode?: "junior" | "specialist";
  vehicle?: VehicleSave;
  collectedResources?: string[];
  adventure?: Adventure;
  radio?: { sent: number | null; used: boolean };
};
export function parseSave(raw: string | null): Save | null {
  try {
    const v = JSON.parse(raw || "null");
    if (
      !v ||
      v.version !== 1 ||
      !["moon", "mars"].includes(v.destination) ||
      !Number.isInteger(v.mission) ||
      v.mission < 0 ||
      v.mission > 4 ||
      typeof v.inside !== "boolean" ||
      !Array.isArray(v.position) ||
      v.position.length !== 3 ||
      !v.position.every(
        (n: unknown) =>
          typeof n === "number" &&
          Number.isFinite(n) &&
          Math.abs(n) <= 1_000_000,
      ) ||
      !Array.isArray(v.done) ||
      !v.done.every(
        (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 4,
      ) ||
      !v.allocation ||
      !["oxygen", "greenhouse", "recycler", "backup"].every(
        (k) => typeof v.allocation[k] === "boolean",
      ) ||
      !v.sim ||
      !Object.entries(initialSim()).every(([k, d]) =>
        k === "history"
          ? Array.isArray(v.sim[k]) &&
            v.sim[k].length <= 60 &&
            v.sim[k].every(
              (r: unknown) =>
                Array.isArray(r) &&
                r.length === 4 &&
                r.every((n) => Number.isFinite(n)),
            )
          : k === "stormSince"
            ? v.sim[k] === null || Number.isFinite(v.sim[k])
            : typeof d === "boolean"
              ? typeof v.sim[k] === "boolean"
              : typeof v.sim[k] === "number" && Number.isFinite(v.sim[k]),
      )
    )
      return null;
    if (
      v.sim.time < 0 ||
      v.sim.parts < 0 ||
      ["oxygen", "battery", "water", "food", "health", "suit", "crop"].some(
        (k) => v.sim[k] < 0 || v.sim[k] > 100,
      )
    )
      return null;
    if (v.vehicle !== undefined) {
      const r = v.vehicle;
      if (
        !r ||
        !Array.isArray(r.position) ||
        r.position.length !== 3 ||
        !r.position.every(
          (n: unknown) =>
            typeof n === "number" &&
            Number.isFinite(n) &&
            Math.abs(n) <= 1_000_000,
        ) ||
        !Number.isFinite(r.yaw) ||
        typeof r.riding !== "boolean"
      )
        return null;
    }
    if (
      v.collectedResources !== undefined &&
      (!Array.isArray(v.collectedResources) ||
        v.collectedResources.length > resourceIds.length ||
        new Set(v.collectedResources).size !== v.collectedResources.length ||
        !v.collectedResources.every(
          (id: unknown) => typeof id === "string" && resourceIds.includes(id),
        ))
    )
      return null;
    if (
      v.radio !== undefined &&
      (!v.radio ||
        typeof v.radio.used !== "boolean" ||
        !(
          v.radio.sent === null ||
          (Number.isFinite(v.radio.sent) &&
            v.radio.sent >= 0 &&
            v.radio.sent <= v.sim.time)
        ))
    )
      return null;
    if (new Set(v.done).size !== v.done.length) return null;
    if (v.adventure !== undefined && !validAdventure(v.adventure)) return null;
    if (v.rocket !== undefined && !validRocket(v.rocket)) return null;
    return v;
  } catch {
    return null;
  }
}
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
