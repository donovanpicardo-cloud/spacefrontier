/** A door must be shut before its paired door can open. */
export function airlockDoorOpen(
  t: number,
  entering: boolean,
  index: number,
  otherSlide: number,
) {
  const first = entering ? 0 : 1;
  return index === first ? t < 0.38 : t > 0.62 && otherSlide <= 0.08;
}

