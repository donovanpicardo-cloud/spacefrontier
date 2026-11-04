import type { ResourceKind } from "./Resources";
/** Resource-specific work: thermal drilling, manual generation, or spatial recovery. */
export class Extraction {
  stage = 0;
  elapsed = 0;
  heat = 0;
  overheated = false;
  drilled = 0;
  pumped = 0;
  voltage = 18;
  cell = 0;
  stable = 0;
  fault = "";
  get targetVoltage() { return [48, 76, 36][this.cell]; }
  crankAngle = 0;
  componentX = 0;
  componentY = 0.48;
  finished = false;
  released = false;
  unplugged = false;
  pending: string[] = [];
  constructor(public kind: ResourceKind) {}
  key(code: string) {
    if (!this.finished) this.pending.push(code);
  }
  get progress() {
    if (this.finished) return 1;
    if (this.kind === "ice")
      return this.stage === 0 ? this.drilled * 0.6 : 0.6 + this.pumped * 0.4;
    if (this.kind === "battery")
      return this.stage === 0
        ? ((this.cell + this.stable / 1.2) / 3) * 0.85
        : 0.85 + Math.min(1, this.elapsed / 0.7) * 0.15;
    return this.stage === 0
      ? Math.max(0, Math.min(1, (this.componentY - 0.48) / 0.54)) / 3
      : this.stage === 1
        ? 1 / 3 + this.componentX / 0.76 / 3
        : 2 / 3 + Math.max(0, Math.min(1, (1.15 - this.componentY) / 0.67)) / 3;
  }
  update(dt: number, turn: number, work: boolean, duration: number, lift = 0) {
    dt = Math.max(0, Math.min(dt, 0.1));
    const keys = this.pending.splice(0);
    if (this.finished) return false;
    this.elapsed += dt;
    if (!work) this.released = true;
    if (this.kind === "ice") {
      if (this.stage === 0) {
        if (!work) this.heat = Math.max(0, this.heat - dt * 0.42);
        if (this.overheated && this.heat < 0.25) this.overheated = false;
        if (work && !this.overheated) {
          this.heat = Math.min(1, this.heat + dt * 0.36);
          this.drilled = Math.min(1, this.drilled + dt / (duration * 2));
          if (this.heat >= 0.92) this.overheated = true;
          if (this.drilled >= 1) {
            this.stage = 1;
            this.released = false;
            this.elapsed = 0;
          }
        }
      } else if (this.released && work) {
        this.pumped = Math.min(1, this.pumped + dt / duration);
        if (this.pumped >= 1) this.finished = true;
      }
    } else if (this.kind === "battery") {
      if (this.stage === 0) {
        // Load varies as each cell charges; the operator trims the regulator.
        const drain = 7 + 4 * Math.sin(this.elapsed * 2.2 + this.cell);
        this.voltage = Math.max(0, Math.min(100, this.voltage + (turn * 40 - drain) * dt));
        this.crankAngle += turn * dt * 4;
        if (Math.abs(this.voltage - this.targetVoltage) <= 6)
          this.stable = Math.min(1.2, this.stable + dt);
        else this.stable = 0;
        if (keys.includes("KeyE")) {
          if (this.stable >= 1.2) {
            this.cell++;
            this.stable = 0;
            this.fault = "";
            if (this.cell === 3) {
              this.stage = 1;
              this.elapsed = 0;
            }
          } else {
            this.stable = 0;
            this.fault = "Relay tripped. ";
          }
        }
      } else {
        if (keys.includes("KeyE")) this.unplugged = true;
        if (!this.unplugged) this.elapsed = 0;
        else if (this.elapsed >= 0.7) this.finished = true;
      }
    } else {
      this.componentY = Math.max(
        0.43,
        Math.min(1.15, this.componentY + lift * dt * 0.5),
      );
      // A real retaining lip blocks sideways extraction until the component clears it.
      if (this.componentY >= 1.02)
        this.componentX = Math.max(
          0,
          Math.min(0.76, this.componentX + turn * dt * 0.6),
        );
      if (this.componentX < 0.64 && this.componentX > 0.08)
        this.componentY = Math.max(1.02, this.componentY);
      this.stage =
        this.componentX >= 0.64 ? 2 : this.componentY >= 1.02 ? 1 : 0;
      if (this.componentX >= 0.7 && this.componentY <= 0.48)
        this.finished = true;
    }
    return this.finished;
  }
  instruction() {
    if (this.kind === "ice")
      return this.stage === 0
        ? this.overheated
          ? "Tool is hot! Release E until it cools. Your drilling progress is safe."
          : "Hold E to drill the buried seam. Release E when the tool turns orange to cool it."
        : "Ice exposed! Release E, then hold E to pump it through your purifier.";
    if (this.kind === "battery")
      return this.stage === 0
        ? `Cell ${this.cell + 1}/3 · ${Math.round(this.voltage)} V. ${this.stable >= 1.2 ? "Stable! Press E to latch this cell." : this.fault + "Hold " + (this.targetVoltage - 6) + "–" + (this.targetVoltage + 6) + " V for 1.2 s (" + this.stable.toFixed(1) + " s)."}`
        : "Pack charged! Press E to unplug and take the battery.";
    return this.stage === 0
      ? "Hold W to lift the circuit cartridge above the retaining rail."
      : this.stage === 1
        ? "Keep it raised. Hold D to slide the cartridge out to the green tray."
        : "Hold S to lower the cartridge onto the green recovery tray.";
  }
  get controls() {
    return this.kind === "ice"
      ? "E drill/pump · Release E to cool · Q leave"
      : this.kind === "battery"
        ? "D raise voltage · A lower · E latch / unplug · Q leave"
        : "W / S lift/lower · A / D slide · Q leave";
  }
}
