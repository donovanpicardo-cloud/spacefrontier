type KeyEvent = { code: string; shiftKey: boolean };

/** Reconcile modifiers after a load, focus change, or cleared input buffer. */
export function updateMovementInput(
  keys: Set<string>,
  event: KeyEvent,
  down: boolean,
) {
  if (down) keys.add(event.code);
  else keys.delete(event.code);
  if (event.shiftKey) keys.add("Shift");
  else {
    keys.delete("Shift");
    keys.delete("ShiftLeft");
    keys.delete("ShiftRight");
  }
}

export function sprintHeld(keys: ReadonlySet<string>) {
  return keys.has("Shift") || keys.has("ShiftLeft") || keys.has("ShiftRight");
}
