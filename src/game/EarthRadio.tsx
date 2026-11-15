import { useEffect, useRef, useState } from "react";
import { gameAudio } from "./GameAudio";
import type { Allocation, Destination, Sim } from "../simulation/engine";
export const radioDelay = (d: Destination) => (d === "moon" ? 3 : 24);
export function useEarthRadio(time: number, destination: Destination) {
  const [sent, setSent] = useState<number | null>(null);
  const [used, setUsed] = useState(false);
  useEffect(() => {
    if (sent !== null && time < sent) {
      setSent(null);
      setUsed(false);
    }
  }, [time, sent]);
  const left =
    sent === null ? 0 : Math.max(0, sent + radioDelay(destination) - time);
  const heard = useRef<number | null>(null);
  useEffect(() => {
    if (sent !== null && left === 0 && !used && heard.current !== sent) {
      heard.current = sent;
      gameAudio.cue("radio");
    }
    if (sent === null) heard.current = null;
  }, [sent, left, used]);

  return {
    sent,
    setSent,
    used,
    setUsed,
    left,
    restore: (value?: { sent: number | null; used: boolean }) => {
      setSent(value?.sent ?? null);
      setUsed(value?.used ?? false);
    },
    reset: () => {
      setSent(null);
      setUsed(false);
    },
  };
}
export function EarthRadio(p: {
  sim: Sim;
  destination: Destination;
  state: ReturnType<typeof useEarthRadio>;
  charge: () => void;
  resume: () => void;
  apply: (a: Partial<Allocation>) => void;
}) {
  const { sent, setSent, used, setUsed, left } = p.state;
  return (
    <section className="radio-card">
      <span className="eyebrow">DEEP SPACE RADIO</span>
      <h3>Ask Earth, or decide yourself?</h3>
      <p>
        Radio uses 5% power. Your outpost keeps using air, water and power while
        the reply travels. You can change the switches yourself now.
      </p>
      <p className="science-note">
        {p.destination === "moon"
          ? "Moon signals take about 1.3 seconds each way. This reply takes 3 game seconds."
          : "Mars signals can take over 20 minutes each way. Our 24-second reply is deliberately shortened for play."}{" "}
        Replies arrive while you play; menus pause the clock.
      </p>
      {sent === null || used ? (
        <button
          disabled={
            p.sim.battery < 5 || (used && p.sim.time < (sent ?? 0) + 60)
          }
          onClick={() => {
            gameAudio.cue("radio");
            p.charge();
            setSent(p.sim.time);
            setUsed(false);
            p.resume();
          }}
        >
          Radio Earth · 5% power
        </button>
      ) : left > 0 ? (
        <button onClick={p.resume}>
          Waiting {left}s · Return to the outpost
        </button>
      ) : (
        <>
          <p>
            <strong>Earth says:</strong>{" "}
            {p.sim.storm || p.sim.battery < 35
              ? "Save power: pause grow lights and keep air and water recovery on. Plants will stop growing."
              : "Your reserves can support growing food. Grow lights use more power; watch your battery."}
          </p>
          <button
            onClick={() => {
              p.apply({
                oxygen: true,
                recycler: true,
                greenhouse: !(p.sim.storm || p.sim.battery < 35),
              });
              setUsed(true);
            }}
          >
            Use this plan
          </button>
          <button onClick={() => setUsed(true)}>Keep my own plan</button>
        </>
      )}
      <a
        href="https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf"
        target="_blank"
        rel="noreferrer"
      >
        NASA: communication delays
      </a>
    </section>
  );
}

