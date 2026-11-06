export type AudioCue =
  | "step"
  | "jump"
  | "land"
  | "click"
  | "success"
  | "radio"
  | "airlock"
  | "warning"
  | "impact"
  | "debris"
  | "ignite"
  | "separate";
export type AudioFrame = {
  mode: "menu" | "surface" | "crash" | "rocket";
  paused: boolean;
  destination: "moon" | "mars";
  inside: boolean;
  speed: number;
  grounded: boolean;
  driving: boolean;
  vehicleSpeed: number;
  working: boolean;
  airlock: boolean;
  storm: boolean;
  oxygen: number;
  elapsed: number;
};

/** Audio follows simulation state; it never advances or changes gameplay. */
export class AudioDirector {
  private previous: AudioFrame | null = null;
  private stride = 0;
  private warningAt = 0;
  private clock = 0;
  update(frame: AudioFrame, dt: number): AudioCue[] {
    const cues: AudioCue[] = [];
    const previous = this.previous;
    this.previous = { ...frame };
    if (frame.paused) return cues;
    dt = Math.max(0, Math.min(0.15, dt));
    this.clock += dt;
    if (frame.mode === "surface") {
      if (previous?.mode === "surface" && !previous.paused && !frame.driving) {
        if (previous.grounded && !frame.grounded) cues.push("jump");
        if (!previous.grounded && frame.grounded) cues.push("land");
      }
      if (!frame.driving && frame.grounded && frame.speed > 0.2) {
        this.stride += Math.min(7, frame.speed) * dt;
        if (this.stride >= 1.55) {
          this.stride %= 1.55;
          cues.push("step");
        }
      } else this.stride = 0;
      if (frame.airlock && !previous?.airlock) cues.push("airlock");
      if (frame.oxygen < 22 && this.clock >= this.warningAt) {
        cues.push("warning");
        this.warningAt = this.clock + 9;
      }
    } else this.stride = 0;
    const from =
      previous?.mode === frame.mode && previous.elapsed <= frame.elapsed
        ? previous.elapsed
        : frame.elapsed <= dt + 0.05
          ? -0.001
          : frame.elapsed;
    // Only emit crossed beats; a paused or skipped film cannot queue old sounds.
    if (frame.mode === "crash") {
      for (const [time, cue] of [
        [0, "ignite"],
        [2, "warning"],
        [6, "warning"],
        [13, "impact"],
        [13.65, "debris"],
        [16, "radio"],
      ] as const)
        if (from < time && frame.elapsed >= time) cues.push(cue);
    }
    if (frame.mode === "rocket") {
      for (const [time, cue] of [
        [0, "radio"],
        [4, "ignite"],
        [13, "separate"],
        [36, "success"],
      ] as const)
        if (from < time && frame.elapsed >= time) cues.push(cue);
    }
    return cues;
  }
  reset() {
    this.previous = null;
    this.stride = 0;
    this.warningAt = 0;
    this.clock = 0;
  }
}
