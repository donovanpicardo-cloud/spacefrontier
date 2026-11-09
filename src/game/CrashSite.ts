import type { Destination } from "../simulation/engine";

export const survivorPosition = [2.8, 0.12, 12];

export function crashSite(destination: Destination) {
  return destination === "moon" ? { x: -3, z: 15 } : { x: 0, z: 7 };
}
