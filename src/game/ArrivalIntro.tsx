import { useEffect, useRef, useState } from "react";
import type { Destination } from "../simulation/engine";
import { ArrivalScene } from "./ArrivalScene";
import { arrivalBeat, ARRIVAL_DURATION } from "./ArrivalTimeline";
import "./arrival.css";

type Props = {
  destination: Destination;
  ready: boolean;
  saved: boolean;
  reducedMotion: boolean;
  onChoose: (destination: Destination) => void;
  onStart: () => void;
  onContinue: () => void;
};
export function ArrivalIntro(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const scene = useRef<ArrivalScene | null>(null);
  const [phase, setPhase] = useState<"select" | "flight" | "landed">("select");
  const [elapsed, setElapsed] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [quiet, setQuiet] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const callbacks = useRef(props);
  callbacks.current = props;
  const finish = () => {
    setPhase("landed");

  };
  useEffect(() => {
    if (!mount.current) return;
    try {
      scene.current = new ArrivalScene(mount.current,
        seconds => setElapsed(Math.floor(seconds * 4) / 4), finish);
    } catch {
      setFallback(true);
    }
    return () => scene.current?.dispose();
  }, []);
  useEffect(() => {
    if (scene.current) scene.current.reduced = quiet || props.reducedMotion;
  }, [quiet, props.reducedMotion]);
  useEffect(() => {
    if (phase !== "landed" || !props.ready) return;
    const timer = window.setTimeout(() => callbacks.current.onStart(), quiet || props.reducedMotion ? 0 : 650);
    return () => clearTimeout(timer);
  }, [phase, props.ready, quiet, props.reducedMotion]);
  const choose = (destination: Destination) => {
    props.onChoose(destination);
    setPhase("flight");
    if (scene.current) scene.current.choose(destination, quiet || props.reducedMotion);
    else finish();
  };
  const beat = arrivalBeat(elapsed, props.destination);
  return (
    <section
      className={`arrival arrival-${phase}`}
      aria-label="Begin your expedition"
    >
      <div className="arrival-canvas" ref={mount} aria-hidden="true" />
      <div className="arrival-shade" />
      {phase === "select" ? (
        <>
          <div className="arrival-heading">
            <span className="arrival-kicker">Frontier / Surface studies</span>
            <h1>Choose your world.</h1>
          </div>
          <div className="arrival-choices">
            {(["moon", "mars"] as const).map((world, index) => (
              <button key={world} className={"arrival-world arrival-world-" + world}
                aria-label={"Visit " + (world === "moon" ? "the Moon" : "Mars")}
                onClick={() => choose(world)}>
                <span className="arrival-world-visual" aria-hidden="true">
                  {fallback && <span className={"arrival-backup " + world} />}
                </span>
                <span className="arrival-kicker">0{index + 1} / {world === "moon" ? "Earth’s satellite" : "Terrestrial planet"}</span>
                <strong>{world === "moon" ? "The Moon" : "Mars"} <span aria-hidden="true">↗</span></strong>
                <span className="arrival-world-description">Surface gravity · {world === "moon" ? "1.62" : "3.71"} m/s²</span>
              </button>
            ))}
          </div>
          <div className="arrival-bottom">
            <label>
              <input
                type="checkbox"
                checked={quiet || props.reducedMotion}
                disabled={props.reducedMotion}
                onChange={(event) => setQuiet(event.target.checked)}
              />{" "}
              Reduced motion
            </label>
            <span>Planetary atlas / 01–02</span>
            {props.saved && (
              <button onClick={props.onContinue}>
                Continue saved mission <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="arrival-letterbox arrival-letterbox-top" />
          <div className="arrival-letterbox arrival-letterbox-bottom" />
          <div className="arrival-flight-meta">
            <span>
              FRONTIER / {props.destination === "moon" ? "LUNAR" : "MARS"}{" "}
              EXPEDITION
            </span>
            <span>
              {phase === "landed"
                ? "BEACON ONLINE"
                : elapsed >= 6
                  ? "⚠ EMERGENCY"
                  : "APPROACH VECTOR LOCKED"}
            </span>
          </div>
          {phase === "flight" && (
            <button
              className="arrival-skip"
              onClick={() => scene.current?.finish()}
            >
              Skip cinematic →
            </button>
          )}
          <div
            className="arrival-captions"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="arrival-kicker">{beat.chapter}</span>
            <h2>{beat.title}</h2>
            <p>{beat.text}</p>
            {phase === "landed" && !props.ready && <small>Preparing surface…</small>}
          </div>
          <div
            className="arrival-progress"
            role="progressbar"
            aria-label="Arrival sequence"
            aria-valuemin={0}
            aria-valuemax={24}
            aria-valuenow={Math.min(24, Math.floor(elapsed))}
          >
            <span
              style={{
                width: `${Math.min(1, elapsed / ARRIVAL_DURATION) * 100}%`,
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
