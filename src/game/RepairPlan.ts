import type { Destination } from "../simulation/engine";
export type RepairKind = "solar" | "greenhouse" | "life";
export const SOCKET_X = 0.27;
export type RepairStep = {
  type: "cables" | "brush" | "valves" | "cartridge";
  title: string;
  instruction: string;
  count: number;
  turns?: number[];
};
export function repairPlan(
  destination: Destination,
  kind: RepairKind,
): RepairStep[] {
  if (kind === "greenhouse")
    return [
      {
        type: "valves",
        title: "Balance the water loop",
        instruction:
          "Turn both handwheels clockwise: gold supply, then teal return.",
        count: 2,
        turns: destination === "moon" ? [210, 210] : [180, 270],
      },
    ];
  if (kind === "life")
    return [
      {
        type: "cartridge",
        title: "Replace the air filter",
        instruction:
          "Pull the used cartridge into the left tray. Fit the clean cartridge from the right tray.",
        count: 2,
      },
    ];
  if (destination === "moon")
    return [
      {
        type: "cables",
        title: "Reconnect lunar power",
        instruction:
          "Match each wire to its colour AND symbol on the other side. The socket order is mixed.",
        count: 3,
      },
    ];
  return [
    {
      type: "brush",
      title: "Clear Martian dust",
      instruction: "Sweep red dust off the outdoor power contacts.",
      count: 12,
    },
    {
      type: "cables",
      title: "Reconnect Mars power",
      instruction:
        "The right-hand sockets are swapped. Connect matching colours and symbols across the board.",
      count: 2,
    },
  ];
}
export function angularDelta(previous: number, next: number) {
  const d =
    (Math.atan2(Math.sin(next - previous), Math.cos(next - previous)) * 180) /
    Math.PI;
  return Math.abs(d) > 90 ? 0 : d;
}
export function socketY(index: number, count: number) {
  const row = count === 2 ? [1, 0][index] : [1, 2, 0][index];
  return (count - 1) * 0.115 - row * 0.23;
}
export function matchingSocket(
  index: number,
  count: number,
  x: number,
  y: number,
) {
  return Math.hypot(x - SOCKET_X, y - socketY(index, count)) < 0.13;
}

export function cableStart(index: number, count: number) {
  return { x: -0.43, y: (count - 1) * 0.115 - index * 0.23, z: 0.19 };
}
export function cableOrigin(index: number, count = 3) {
  return { x: -0.58, y: (count - 1) * 0.115 - index * 0.23, z: 0.1 };
}
