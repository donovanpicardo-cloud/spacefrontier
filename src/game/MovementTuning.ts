import type { Destination } from "../simulation/engine";
// Deliberate game-feel values, separate from the scientific gravity facts.
export const suitMovement = (destination: Destination) => ({
  gravity: destination === "moon" ? 5 : 7.5,
  jumpSpeed: 3.7,
  airAcceleration: 2.2,
});

