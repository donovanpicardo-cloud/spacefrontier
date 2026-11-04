import type { Destination } from "../simulation/engine";

export const ARRIVAL_DURATION = 24;
export function arrivalBeat(seconds: number, destination: Destination) {
  const moon = destination === "moon";
  if (seconds < 6)
    return {
      chapter: "01 / APPROACH",
      title: moon
        ? "The quiet beyond Earth."
        : "A world waiting for footsteps.",
      text: "MISSION CONTROL · Approach confirmed. Preparing descent.",
    };
  if (seconds < 11)
    return {
      chapter: "02 / SYSTEM FAILURE",
      title: "Something is wrong.",
      text: "FLIGHT COMPUTER · Main engine offline. Attitude control failing.",
    };
  if (seconds < 18)
    return {
      chapter: "03 / EMERGENCY DESCENT",
      title: "One chance to make it down.",
      text: moon
        ? "MISSION CONTROL · No atmosphere to slow you. Fire emergency thrusters!"
        : "MISSION CONTROL · Entry trajectory unstable. Brace for a hard landing!",
    };
  if (seconds < 21)
    return {
      chapter: "04 / IMPACT",
      title: "Hold on.",
      text: "FLIGHT COMPUTER · Impact imminent. Crew protection engaged.",
    };
  return {
    chapter: "05 / SIGNAL REACQUIRED",
    title: "Your mission is still alive.",
    text: "MISSION CONTROL · We have your beacon. Reach the outpost. We’ll guide you from here.",
  };
}
