/** Resource ticks follow the same elapsed time as movement and hands-on tasks. */
export class SimulationClock {
  private previous = 0;
  private remainder = 0;
  reset(elapsed = 0) { this.previous = elapsed; this.remainder = 0; }
  poll(elapsed: number, running: boolean, speed: number) {
    const delta = Math.max(0, elapsed - this.previous);
    this.previous = elapsed;
    if (!running) { this.remainder = 0; return 0; }
    this.remainder += delta * speed;
    const ticks = Math.floor(this.remainder + 1e-8);
    this.remainder = Math.max(0, this.remainder - ticks);
    return ticks;
  }
}

