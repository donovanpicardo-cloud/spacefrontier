export function renderRatio(
  quality: string,
  width: number,
  height: number,
  dpr: number,
  scale = 1,
) {
  const maximum =
    quality === "Ultra"
      ? 2
      : quality === "High"
        ? 1.5
        : quality === "Low"
          ? 0.75
          : 1;
  const pixels =
    quality === "Low"
      ? 550_000
      : quality === "School computer"
        ? 1_000_000
        : quality === "Medium"
          ? 2_100_000
          : quality === "High"
            ? 3_700_000
            : 6_000_000;
  const sampling = quality === "Ultra" ? Math.max(1.5, dpr)
    : quality === "High" ? Math.max(1.25, dpr) : dpr;
  return (
    Math.max(
      0.1,
      Math.min(sampling, maximum, Math.sqrt(pixels / Math.max(1, width * height))),
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

