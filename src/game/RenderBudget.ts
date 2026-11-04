export function renderRatio(
  quality: string,
  width: number,
  height: number,
  dpr: number,
  scale = 1,
) {
  const maximum =
    quality === "Ultra"
      ? 1.7
      : quality === "High"
        ? 1.25
        : quality === "Low"
          ? 0.75
          : 1;
  const pixels =
    quality === "Low"
      ? 550_000
      : quality === "School computer"
        ? 1_000_000
        : quality === "Medium"
          ? 1_500_000
          : quality === "High"
            ? 2_500_000
            : 4_000_000;
  return (
    Math.max(
      0.1,
      Math.min(dpr, maximum, Math.sqrt(pixels / Math.max(1, width * height))),
    ) * scale
  );
}
export class RenderBudget {
  scale = 1;
  samples = 0;
  cost = 0;
  stable = 0;
  observe(milliseconds: number) {
    this.cost += Math.min(1000, milliseconds);
    if (++this.samples < 90) return false;
    const average = this.cost / this.samples;
    this.samples = this.cost = 0;
    if (average > 24 && this.scale > 0.6) {
      this.scale = Math.max(0.6, this.scale - 0.1);
      this.stable = 0;
      return true;
    }
    // The school preset is paced at 60 Hz, even when the GPU has headroom.
    if (average < 18 && this.scale < 1 && ++this.stable >= 5) {
      this.scale = Math.min(1, this.scale + 0.1);
      this.stable = 0;
      return true;
    }
    if (average >= 18) this.stable = 0;
    return false;
  }
}
