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
  onLanded: () => void;
  onStart: () => void;
  onContinue: () => void;
  onBriefing: () => void;
};
export function ArrivalIntro(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const scene = useRef<ArrivalScene | null>(null);
  const [phase, setPhase] = useState<"select" | "flight" | "landed">("select");
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const [quiet, setQuiet] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const callbacks = useRef(props);
  callbacks.current = props;
  const finish = () => {
    setPhase("landed");
    callbacks.current.onLanded();
  };
  useEffect(() => {
    if (!mount.current) return;
    try {
      const view = new ArrivalScene(
        mount.current,
        (seconds) => setElapsed(Math.floor(seconds * 4) / 4),
        finish,
      );
      scene.current = view;
      view.reduced = quiet || callbacks.current.reducedMotion;
      return () => {
        view.dispose();
        scene.current = null;
      };
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    if (scene.current) {
      scene.current.reduced = quiet || props.reducedMotion;
      if (scene.current.reduced && scene.current.destination)
        scene.current.finish();
    }
  }, [quiet, props.reducedMotion]);
  const choose = (destination: Destination) => {
    props.onChoose(destination);
    setPhase("flight");
    if (scene.current)
      scene.current.choose(destination, quiet || props.reducedMotion);
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
            <span className="arrival-kicker">
              THE FRONTIER EXPEDITIONS / 01
            </span>
            <h1>The surface atlas.</h1>
            <p>Choose a world to begin your expedition.</p>
          </div>
          <div className="arrival-choices">
            {(["moon", "mars"] as const).map((destination, index) => (
              <button
                key={destination}
                className={`arrival-world arrival-world-${destination}`}
                onClick={() => choose(destination)}
                aria-label={`Explore ${destination === "moon" ? "the Moon" : "Mars"}`}
              >
                <span className="arrival-world-visual" aria-hidden="true">
                  {failed && (
                    <span className={`arrival-backup ${destination}`} />
                  )}
                </span>
                <span className="arrival-kicker">
                  0{index + 1} /{" "}
                  {destination === "moon"
                    ? "OUR CELESTIAL NEIGHBOUR"
                    : "THE RED PLANET"}
                </span>
                <strong>
                  {destination === "moon" ? "The Moon" : "Mars"}
                  <span aria-hidden="true">↗</span>
                </strong>
                <span className="arrival-world-description">
                  {destination === "moon"
                    ? "Surface gravity　1.62 m/s²"
                    : "Surface gravity　3.71 m/s²"}
                </span>
                <span className="arrival-world-cta">
                  Visit surface <span aria-hidden="true">→</span>
                </span>
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
            <span>A SHORT CINEMATIC BEGINS YOUR EXPEDITION</span>
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
            {phase === "landed" && (
              <>
                <p className="arrival-recovery">
                  You survived the landing. Find shelter, restore the outpost,
                  and build your way home.
                </p>
                <button
                  className="arrival-enter"
                  onClick={props.onStart}
                  disabled={!props.ready}
                >
                  {props.ready
                    ? "Begin surface mission →"
                    : "Preparing your surface mission…"}
                </button>
                <button className="arrival-options" onClick={props.onBriefing}>
                  Mission options & controls
                </button>
              </>
            )}
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
