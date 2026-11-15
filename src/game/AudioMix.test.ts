import { describe, expect, it } from "vitest";
import { audioLevel, motorMix } from "./AudioMix";

describe("audio mix", () => {
  it("bounds persisted levels and rejects non-finite values", () => {
    expect(audioLevel(-2)).toBe(0);
    expect(audioLevel(3)).toBe(1);
    expect(audioLevel(NaN, 0.25)).toBe(0.25);
    expect(audioLevel(Infinity)).toBe(0.65);
    expect(audioLevel(0)).toBe(0);
  });
  it("keeps a parked unoccupied buggy quiet and varies smoothly in reverse", () => {
    expect(motorMix(8, false).gain).toBe(0);
    expect(motorMix(-6, true)).toEqual(motorMix(6, true));
    expect(motorMix(0, true).gain).toBeGreaterThan(0);
    expect(motorMix(8, true).rate).toBeGreaterThan(motorMix(0, true).rate);
    expect(motorMix(1000, true)).toEqual(motorMix(8, true));
  });
});

