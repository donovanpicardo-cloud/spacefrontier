import { describe, expect, it } from "vitest";
import { ARRIVAL_DURATION, arrivalBeat } from "../game/ArrivalTimeline";

describe("opening cinematic", () => {
  it.each(["moon", "mars"] as const)(
    "takes the %s expedition through approach, failure, descent, impact and recovery",
    (destination) => {
      expect(
        [0, 2, 6, 13, 16].map((t) => arrivalBeat(t, destination).chapter),
      ).toEqual([
        "01 / APPROACH",
        "02 / SYSTEM FAILURE",
        "03 / EMERGENCY DESCENT",
        "04 / IMPACT",
        "05 / SIGNAL REACQUIRED",
      ]);
      expect(arrivalBeat(ARRIVAL_DURATION, destination).text).toContain(
        "Reach the outpost",
      );
    },
  );
  it("uses a thruster landing on the Moon and atmospheric entry on Mars", () => {
    expect(arrivalBeat(8, "moon").text).toContain("No atmosphere");
    expect(arrivalBeat(8, "mars").text).toContain("Entry trajectory");
  });
});

