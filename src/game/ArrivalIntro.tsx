import { useEffect, useRef, useState } from "react";
import type { Destination } from "../simulation/engine";
import { ArrivalScene } from "./ArrivalScene";
import { arrivalBeat } from "./ArrivalTimeline";

import "./arrival.css";

type Props = {
  onFilm: (quiet: boolean, show: () => void, finish: () => void) => void;
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
  const [phase, setPhase] = useState<
    "select" | "preparing" | "flight" | "landed"
  >("select");

  const [destination, setDestination] = useState<Destination>("moon");
  const [seconds, setSeconds] = useState(0);
  const beat = arrivalBeat(seconds, destination);
  useEffect(() => {
    if (phase !== "flight") return;
    const start = performance.now();
    const timer = window.setInterval(
      () => setSeconds((performance.now() - start) / 1000),
      100,
    );
    return () => clearInterval(timer);
  }, [phase]);
  const [fallback, setFallback] = useState(false);
  const [quiet, setQuiet] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const callbacks = useRef(props);
  callbacks.current = props;
  const finish = () => setPhase("landed");
  useEffect(() => {
    if (!mount.current) return;
    try {
      scene.current = new ArrivalScene(mount.current);
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
    const timer = window.setTimeout(
      () => callbacks.current.onStart(),
      quiet || props.reducedMotion ? 0 : 650,
    );
    return () => clearTimeout(timer);
  }, [phase, props.ready, quiet, props.reducedMotion]);
  const choose = (destination: Destination) => {
    setDestination(destination);
    props.onChoose(destination);
    setPhase("preparing");
  };
  useEffect(() => {
    if (phase !== "preparing" || !props.ready) return;
    callbacks.current.onFilm(
      quiet || props.reducedMotion,
      () => {
        scene.current?.dispose();
        scene.current = null;
        setPhase("flight");
      },
      finish,
    );
  }, [phase, props.ready, quiet, props.reducedMotion]);
  return (
    <section
      className={`arrival arrival-${phase}`}
      aria-label="Begin your expedition"
    >
      <div className="arrival-canvas" ref={mount} aria-hidden="true" />
      <div className="arrival-shade" />
      {(phase === "flight" || phase === "landed") && (
        <>
          <div
            className="arrival-letterbox arrival-letterbox-top"
            aria-hidden="true"
          />
          <div
            className="arrival-letterbox arrival-letterbox-bottom"
            aria-hidden="true"
          />
          <div className="arrival-flight-meta">
            <span>FRONTIER / {destination.toUpperCase()} ARRIVAL</span>
            <span>{beat.chapter}</span>
          </div>
          <div className="arrival-film-caption" role="status">
            <span>{beat.title}</span>
            <p>{beat.text}</p>
          </div>
        </>
      )}
      {phase === "preparing" && (
        <div className="arrival-loading" role="status">
          <span className="arrival-kicker">FRONTIER / FLIGHT SYSTEMS</span>
          <h2>Preparing your descent.</h2>
          <p>Loading the surface and getting your astronaut ready…</p>
        </div>
      )}
      {phase === "select" ? (
        <>
          <div className="arrival-heading">
            <span className="arrival-kicker">Frontier / Surface studies</span>
            <h1>Choose your world.</h1>
          </div>
          <div className="arrival-choices">
            {(["moon", "mars"] as const).map((world, index) => (
              <button
                key={world}
                className={"arrival-world arrival-world-" + world}
                aria-label={"Visit " + (world === "moon" ? "the Moon" : "Mars")}
                onClick={() => choose(world)}
              >
                <span className="arrival-world-visual" aria-hidden="true">
                  {fallback && <span className={"arrival-backup " + world} />}
                </span>
                <span className="arrival-kicker">
                  0{index + 1} /{" "}
                  {world === "moon"
                    ? "Earth’s satellite"
                    : "Terrestrial planet"}
                </span>
                <strong>
                  {world === "moon" ? "The Moon" : "Mars"}{" "}
                  <span aria-hidden="true">↗</span>
                </strong>
                <span className="arrival-world-description">
                  Surface gravity · {world === "moon" ? "1.62" : "3.71"} m/s²
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
            <span>Planetary atlas / 01–02</span>
            {props.saved && (
              <button onClick={props.onContinue}>
                Continue saved mission <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
