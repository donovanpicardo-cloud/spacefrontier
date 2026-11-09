/** Keep music behind useful suit and machinery feedback. */
export function audioLevel(value: number, fallback = 0.65) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
export function motorMix(speed: number, driving: boolean) {
  const load = Math.min(1, Math.abs(speed) / 8);
  return { gain: driving ? 0.023 + load * 0.072 : 0, rate: 0.68 + load * 0.58 };
}
