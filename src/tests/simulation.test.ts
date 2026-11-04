import { describe, it, expect } from "vitest";
import {
  initialSim,
  tick,
  power,
  missions,
  type Allocation,
} from "../simulation/engine";
import { gravity } from "../data/science/sources";
const on: Allocation = {
  oxygen: true,
  greenhouse: true,
  recycler: true,
  backup: false,
};
describe("life-support conservation and power", () => {
  it("consumes oxygen and accumulates CO2 when scrubbers are off", () => {
    const s = initialSim();
    const n = tick(s, { ...on, oxygen: false }, "moon", false);
    expect(n.oxygen).toBeLessThan(s.oxygen);
    expect(n.co2).toBeGreaterThan(s.co2);
    expect(n.suit).toBeLessThan(s.suit);
    expect(s.time).toBe(0);
  });
  it("oxygen production costs water and electrical energy", () => {
    const s = initialSim();
    const enabled = tick(s, on, "moon", false);
    const disabled = tick(s, { ...on, oxygen: false }, "moon", false);
    expect(enabled.oxygen).toBeGreaterThan(disabled.oxygen);
    expect(enabled.water).toBeLessThan(disabled.water);
    expect(enabled.battery).toBeLessThan(disabled.battery);
  });
  it("cannot generate oxygen without water or energy", () => {
    for (const s of [
      { ...initialSim(), water: 0 },
      { ...initialSim(), battery: 0, storm: true },
    ])
      expect(tick(s, on, "mars", false).oxygen).toBeLessThan(s.oxygen);
  });
  it("water recovery reduces losses without creating unlimited water", () => {
    const s = initialSim();
    const a = tick(s, on, "moon", true),
      b = tick(s, { ...on, recycler: false }, "moon", true);
    expect(a.water).toBeGreaterThan(b.water);
    expect(a.water).toBeLessThan(s.water);
  });
  it("repairs increase generation and storms reduce it", () => {
    const s = initialSim();
    expect(
      power({ ...s, repaired: true }, on, "mars").generated,
    ).toBeGreaterThan(power(s, on, "mars").generated);
    expect(power({ ...s, storm: true }, on, "mars").generated).toBeLessThan(
      power(s, on, "mars").generated,
    );
  });
  it("crops require irrigation, water, power and lights", () => {
    const s = { ...initialSim(), irrigation: true };
    expect(tick(s, on, "moon", true).crop).toBeGreaterThan(s.crop);
    expect(tick(s, { ...on, greenhouse: false }, "moon", true).crop).toBe(
      s.crop,
    );
    expect(tick({ ...s, water: 0 }, on, "moon", true).crop).toBe(s.crop);
    expect(tick({ ...s, irrigation: false }, on, "moon", true).crop).toBe(
      s.crop,
    );
  });
  it("shelter reduces simulated exposure during an event", () => {
    const s = { ...initialSim(), storm: true };
    expect(
      tick({ ...s, shielded: true }, on, "moon", true).radiation,
    ).toBeLessThan(tick(s, on, "moon", false).radiation);
  });
  it("zero suit oxygen harms the crew and resources stay bounded", () => {
    let s = { ...initialSim(), suit: 0, water: 1, battery: 0, oxygen: 1 };
    for (let i = 0; i < 1500; i++)
      s = tick(
        s,
        { oxygen: false, greenhouse: false, recycler: false, backup: false },
        "moon",
        false,
      );
    expect(s.health).toBe(0);
    for (const k of ["oxygen", "water", "food", "battery", "suit"] as const) {
      expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s[k]).toBeLessThanOrEqual(100);
    }
    expect(s.history.length).toBeLessThanOrEqual(60);
  });
  it("predicts battery change with the exact gameplay power function", () => {
    const s = initialSim();
    const expected = power({ ...s, time: s.time + 1 }, on, "moon").net * 0.18;
    expect(tick(s, on, "moon", true).battery - s.battery).toBeCloseTo(expected);
  });
  it("is deterministic and survives save serialization", () => {
    const s = initialSim();
    expect(tick(s, on, "moon", false)).toEqual(
      tick(JSON.parse(JSON.stringify(s)), on, "moon", false),
    );
  });
  it("both campaigns have five objectives and distinct gravity", () => {
    expect(missions("moon")).toHaveLength(5);
    expect(missions("mars")).toHaveLength(5);
    expect(gravity.moon).toBeLessThan(gravity.mars);
  });
});
