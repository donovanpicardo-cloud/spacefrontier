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
  const [spread, setSpread] = useState<Destination>("mars");
  const lunar = spread === "moon";
  const [quiet, setQuiet] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const callbacks = useRef(props);
  callbacks.current = props;
  const finish = () => {
    setPhase("landed");
    callbacks.current.onLanded();
  };
  useEffect(() => () => scene.current?.dispose(), []);
  const choose = (destination: Destination) => {
    props.onChoose(destination);
    setPhase("flight");
    try {
      if (!mount.current) return finish();
      scene.current = new ArrivalScene(
        mount.current,
        (seconds) => setElapsed(Math.floor(seconds * 4) / 4),
        finish,
      );
      scene.current.choose(destination, quiet || props.reducedMotion);
    } catch {
      finish();
    }
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
          <div key={spread} className={`atlas-photo atlas-photo-${spread}`} aria-hidden="true" />
          <div className="atlas-spread">
            <div className="atlas-byline">Frontier <span>/ Surface studies</span></div>
            <div className="atlas-selector" aria-label="Choose a destination">
              {(["mars", "moon"] as const).map(world => (
                <button key={world} aria-pressed={spread === world} onClick={() => setSpread(world)}>
                  {world === "mars" ? "Mars" : "Moon"}
                </button>
              ))}
            </div>
            <h1 key={spread}>{lunar ? "Footprints outlast the people who made them." : "A dust storm can cover an entire planet."}</h1>
            <div className="atlas-visit">
              <p>{lunar ? "The Moon" : "Mars"}<small>{lunar ? "Earth’s natural satellite" : "Fourth planet from the Sun"}</small></p>
              <button aria-label={`Visit ${lunar ? "the Moon" : "Mars"}`} onClick={() => choose(spread)}>Visit <span aria-hidden="true">→</span></button>
            </div>
            <div className="atlas-record">
              <p>{lunar ? "Eugene Cernan beside the lunar rover. Apollo 17, 1972." : "Jezero crater, seen by Perseverance’s Mastcam-Z. 2021."}</p>
              <dl>
                <div><dt>Surface gravity</dt><dd>{lunar ? "1.62" : "3.71"} m/s²</dd></div>
                <div><dt>Atmosphere</dt><dd>{lunar ? "Trace exosphere" : "Mostly carbon dioxide"}</dd></div>
                <div><dt>Expedition</dt><dd>{lunar ? "Lunar outpost" : "Martian colony"}</dd></div>
              </dl>
            </div>
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
            <span>{lunar ? "Plate 02 / 02" : "Plate 01 / 02"}</span>
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
