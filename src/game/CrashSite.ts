import type { Destination } from "../simulation/engine";

export const survivorPosition = [2.8, 0.12, 12];

export function crashSite(destination: Destination) {
  return { x: destination === "moon" ? -3 : -3.8, z: 15 };
}

