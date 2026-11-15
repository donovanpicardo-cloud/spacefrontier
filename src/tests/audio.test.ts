import { describe, expect, it } from "vitest";
import { AudioDirector, type AudioFrame } from "../game/AudioDirector";

const surface: AudioFrame = {
  mode: "surface",
  paused: false,
  destination: "moon",
  inside: false,
  speed: 0,
  grounded: true,
  driving: false,
  vehicleSpeed: 0,
  working: false,
  airlock: false,
  storm: false,
  oxygen: 100,
  elapsed: 0,
};
describe("gameplay-driven sound", () => {
  it("paces footsteps by distance independently of display refresh rate", () => {
    const counts = [30, 60, 144].map((hz) => {
      const director = new AudioDirector();
      let steps = 0;
      for (let i = 0; i < hz * 10; i++)
        steps += director
          .update({ ...surface, speed: 3.1 }, 1 / hz)
          .filter((c) => c === "step").length;
      return steps;
    });
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts[1]).toBeGreaterThanOrEqual(19);
  });
  it("does not make footsteps in vehicles, in midair, or paused", () => {
    for (const change of [
      { driving: true },
      { grounded: false },
      { paused: true },
    ]) {
      const director = new AudioDirector();
      for (let i = 0; i < 300; i++)
        expect(
          director.update({ ...surface, speed: 5, ...change }, 0.04),
        ).not.toContain("step");
    }
  });
  it("emits takeoff and landing once per actual ground transition", () => {
    const director = new AudioDirector();
    director.update(surface, 0.016);
    expect(director.update({ ...surface, grounded: false }, 0.016)).toEqual([
      "jump",
    ]);
    for (let i = 0; i < 50; i++)
      expect(director.update({ ...surface, grounded: false }, 0.016)).toEqual(
        [],
      );
    expect(director.update(surface, 0.016)).toEqual(["land"]);
    expect(director.update(surface, 0.016)).toEqual([]);
  });
  it("times the failure, impact, debris and signal to the crash and supports replay", () => {
    const director = new AudioDirector();
    const film = (elapsed: number) =>
      director.update({ ...surface, mode: "crash", elapsed }, 0.04);
    expect(film(0)).toEqual(["ignite"]);
    expect(film(2.1)).toEqual(["warning"]);
    expect(film(6.1)).toEqual(["warning"]);
    expect(film(12.9)).toEqual([]);
    expect(film(13.05)).toEqual(["impact"]);
    expect(film(13.1)).toEqual([]);
    expect(film(14)).toEqual(["debris"]);
    expect(film(16.1)).toEqual(["radio"]);
    expect(film(0)).toEqual(["ignite"]);
  });
  it("does not replay skipped cinematic beats after a pause", () => {
    const director = new AudioDirector();
    director.update({ ...surface, mode: "crash", elapsed: 12.9 }, 0.04);
    expect(
      director.update(
        { ...surface, mode: "crash", elapsed: 14, paused: true },
        0.04,
      ),
    ).toEqual([]);
    expect(
      director.update({ ...surface, mode: "crash", elapsed: 14.1 }, 0.04),
    ).toEqual([]);
  });
  it("does not burst old effects when audio unlocks late or a film is skipped", () => {
    const director = new AudioDirector();
    expect(
      director.update({ ...surface, mode: "crash", elapsed: 18 }, 0.04),
    ).toEqual([]);
    director.reset();
    expect(
      director.update({ ...surface, mode: "crash", elapsed: 9 }, 0.04),
    ).toEqual([]);
    expect(
      director.update({ ...surface, mode: "crash", elapsed: 13 }, 0.04),
    ).toEqual(["impact"]);
  });
  it("rate-limits low-air warnings and freezes the warning clock in menus", () => {
    const director = new AudioDirector();
    expect(director.update({ ...surface, oxygen: 12 }, 0.04)).toContain(
      "warning",
    );
    for (let i = 0; i < 500; i++)
      expect(
        director.update({ ...surface, oxygen: 12, paused: true }, 0.04),
      ).toEqual([]);
    expect(director.update({ ...surface, oxygen: 12 }, 0.04)).not.toContain(
      "warning",
    );
    let warnings = 0;
    for (let i = 0; i < 230; i++)
      warnings += director
        .update({ ...surface, oxygen: 12 }, 0.04)
        .filter((c) => c === "warning").length;
    expect(warnings).toBe(1);
  });
  it("plays the airlock cue on activation and launch cues at the real flight phases", () => {
    const director = new AudioDirector();
    expect(director.update({ ...surface, airlock: true }, 0.04)).toContain(
      "airlock",
    );
    expect(director.update({ ...surface, airlock: true }, 0.04)).not.toContain(
      "airlock",
    );
    const flight = (elapsed: number) =>
      director.update({ ...surface, mode: "rocket", elapsed }, 0.04);
    expect(flight(0)).toEqual(["radio"]);
    expect(flight(4)).toEqual(["ignite"]);
    expect(flight(13)).toEqual(["separate"]);
    expect(flight(36)).toEqual(["success"]);
  });
});

