import { describe, expect, it } from "vitest";
import { SimulationClock } from "../game/SimulationClock";
describe("resource and gameplay time", () => {
  it("does not charge wall time lost to slow rendering", () => {
    const c = new SimulationClock();
    // Ten wall-clock seconds at two FPS advance gameplay by only 0.8 seconds.
    for (let frame = 1; frame <= 20; frame++) expect(c.poll(frame * 0.04, true, 1)).toBe(0);
    expect(c.poll(1.04, true, 1)).toBe(1);
  });
  it("discards tutorial/paused time and restarts without a backlog", () => {
    const c = new SimulationClock();
    expect(c.poll(0.8, true, 1)).toBe(0);
    expect(c.poll(12, false, 1)).toBe(0);
    expect(c.poll(12.4, true, 1)).toBe(0);
    expect(c.poll(13.1, true, 1)).toBe(1);
    c.reset();
    expect(c.poll(0.2, true, 1)).toBe(0);
  });
  it("preserves the selected simulation speed and fractional ticks", () => {
    const c = new SimulationClock();
    expect(c.poll(0.2, true, 4)).toBe(0);
    expect(c.poll(0.6, true, 4)).toBe(2);
    expect(c.poll(0.75, true, 4)).toBe(1);
  });
});

