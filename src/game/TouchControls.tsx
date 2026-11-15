import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { joystickAxes, type TouchKey } from "./TouchInput";
import type { ResourceKind } from "./Resources";

export function HoldControl({ children, onHold }: {
  children: ReactNode;
  onHold: (held: boolean) => void;
}) {
  const pointer = useRef<number | null>(null);
  const held = useRef(false);
  const callback = useRef(onHold);
  callback.current = onHold;
  useEffect(() => () => {
    if (held.current) callback.current(false);
  }, []);
  const update = (active: boolean) => {
    held.current = active;
    onHold(active);
  };
  const release = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    update(false);
  };

  return <button type="button" className="touch-hold"
    onPointerDown={(event) => {
      if (event.button !== 0 || pointer.current !== null) return;
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      update(true);
    }}
    onPointerUp={release}
    onPointerCancel={release}
    onLostPointerCapture={release}
    onKeyDown={(event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) update(true);
    }}
    onKeyUp={(event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      update(false);
    }}
    onBlur={() => {
      if (pointer.current === null) update(false);
    }}
  >{children}</button>;
}

export function TouchMovement({ driving, onMove, onKey, onClear }: {
  driving: boolean;
  onMove: (x: number, y: number) => void;
  onKey: (key: TouchKey, held: boolean) => void;
  onClear: () => void;
}) {
  const pointer = useRef<number | null>(null);
  const stick = useRef<HTMLSpanElement>(null);
  const clear = useRef(onClear);
  clear.current = onClear;

  useEffect(() => {
    const reset = () => {
      pointer.current = null;
      stick.current?.style.removeProperty("transform");
      clear.current();
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      reset();
    };
  }, []);

  const update = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width * 0.33;
    const { x, y } = joystickAxes(
      event.clientX - bounds.left - bounds.width / 2,
      event.clientY - bounds.top - bounds.height / 2,
      radius,
    );
    onMove(x, -y);
    if (stick.current) stick.current.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
  };
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    stick.current?.style.removeProperty("transform");
    onMove(0, 0);
  };

  return <div className="touch-movement">
    <div className="touch-joystick" role="group" aria-label={driving ? "Drive and steer" : "Move astronaut"}
      onPointerDown={(event) => {
        if (event.button !== 0 || pointer.current !== null) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) update(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <span className="touch-stick" ref={stick} aria-hidden="true" />
      <span className="touch-stick-label">{driving ? "Drive" : "Move"}</span>
    </div>
    <div className="touch-actions" key={driving ? "drive" : "walk"}>
      {!driving && <HoldControl onHold={(held) => onKey("Shift", held)}>Run</HoldControl>}
      <HoldControl onHold={(held) => onKey("Space", held)}>{driving ? "Brake" : "Jump"}</HoldControl>
    </div>
  </div>;
}

export function TouchGather({ kind, onKey, onCancel }: {
  kind: ResourceKind;
  onKey: (key: TouchKey, held: boolean) => void;
  onCancel: () => void;
}) {
  const control = (label: string, code: TouchKey) =>
    <HoldControl onHold={(held) => onKey(code, held)}>{label}</HoldControl>;
  return <div className="touch-gather">
    {kind === "ice" && control("Drill / pump", "KeyE")}
    {kind === "battery" && <>
      {control("Lower voltage", "KeyA")}
      {control("Raise voltage", "KeyD")}
      {control("Latch / unplug", "KeyE")}
    </>}
    {kind === "salvage" && <>
      {control("Lift", "KeyW")}
      {control("Slide out", "KeyD")}
      {control("Lower", "KeyS")}
    </>}
    <button type="button" onClick={onCancel}>Leave</button>
  </div>;
}
