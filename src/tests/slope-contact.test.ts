import { describe, expect, it } from 'vitest';
import { followsSlope, ballisticStep } from '../game/AstronautMotion';

describe('downhill boot contact', () => {
  it.each([30, 60, 120])('keeps a descending walk grounded at %s FPS', fps => {
    let y = 10;
    for (let frame = 0; frame < fps * 3; frame++) {
      const distance = 2.1 / fps;
      const floor = y - distance * 0.8;
      expect(followsSlope(true, 0, y - floor, distance)).toBe(true);
      y = floor;
    }
  });
  it('preserves jumps, airborne descent and falls from ledges', () => {
    expect(followsSlope(true, 2.3, .05, .1)).toBe(false);
    expect(followsSlope(false, -1, .05, .1)).toBe(false);
    expect(followsSlope(true, 0, 1, .1)).toBe(false);
    expect(ballisticStep(0, 1.62, 1 / 60).dy).toBeLessThan(0);
  });
});
