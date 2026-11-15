import type { Sim } from "../simulation/engine";
import { rocketStages, rocketProblem, type RocketProgress } from "./Rocket";
export function RocketPanel(p: {
  rocket: RocketProgress;
  sim: Sim;
  research: number;
  atFabricator: boolean;
  atPad: boolean;
  launchProblem: string | null;
  onBuild: () => void;
  onLaunch: () => void;
  onGuide: (id: string) => void;
  onSupplies: (kind: "salvage" | "battery" | "ice") => void;
  onSample: () => void;
  navigationReady: boolean;
}) {
  const next = rocketStages[p.rocket.stage];
  const resources = [
    { key: "parts", label: "Spare parts", have: p.sim.parts, unit: "", action: "Mark spare parts", mark: () => p.onSupplies("salvage") },
    { key: "battery", label: "Power", have: p.sim.battery, unit: "%", action: "Mark a power station", mark: () => p.onSupplies("battery") },
    { key: "water", label: "Water", have: p.sim.water, unit: "%", action: "Mark a water deposit", mark: () => p.onSupplies("ice") },
    { key: "oxygen", label: "Oxygen", have: p.sim.oxygen, unit: "%", hint: "Use Tab to turn on oxygen production. It needs water and power." },
    { key: "food", label: "Food", have: p.sim.food, unit: "%", hint: "Grow crops and harvest them from Systems (Tab)." },
    { key: "research", label: "Research", have: p.research, unit: "", action: "Mark an unscanned rock sample", mark: p.onSample },
  ] as const;
  return (
    <div className="expedition-panel rocket-project">
      <div className="expedition-kicker">EARTHBOUND / YOUR JOURNEY HOME</div>
      <h2>Build your way back to Earth.</h2>
      <p>
        Build three sections at the workbench inside the habitat. Finish all
        five outpost missions, then go outside to the launch pad.
        You can build one section at a time and come back with more supplies.
      </p>
      <div
        className="rocket-blueprint"
        aria-label={`${p.rocket.stage} of 3 sections built`}
      >
        {[2, 1, 0].map((i) => (
          <div
            key={i}
            className={`rocket-section section-${i} ${p.rocket.stage > i ? "built" : ""}`}
          >
            <span>
              {p.rocket.stage > i ? "✓" : "○"} {rocketStages[i].name}
            </span>
          </div>
        ))}
      </div>
      {next ? (
        <article className="project-card">
          <h3>{next.name}</h3>
          <p>{next.description}</p>
          <ul className="rocket-checklist" aria-label="Rocket supply checklist">
            {resources.map(item => {
              const total = rocketStages.slice(p.rocket.stage).reduce((sum, stage) => sum + stage[item.key], 0);
              if (!total) return null;
              const cost = next[item.key];
              const available = Math.floor(item.have * 10) / 10;
              const missing = Math.ceil(Math.max(0, total - item.have) * 10) / 10;
              return <li key={item.key}>
                <strong>{item.label}</strong>
                <span>{available}{item.unit} available · {cost ? `${cost}${item.unit} for this section` : "Needed later"}</span>
                <span>{missing ? `${missing}${item.unit} more for the remaining build` : "Enough for the remaining build"}</span>
                {missing > 0 && ("mark" in item
                  ? <button className="secondary" disabled={!p.navigationReady} onClick={item.mark}>{item.action}</button>
                  : <small>{item.hint}</small>)}
              </li>;
            })}
          </ul>
          <button
            className="primary"
            disabled={
              !p.atFabricator || !!rocketProblem(p.rocket, p.sim, p.research)
            }
            onClick={p.onBuild}
          >
            {!p.atFabricator
              ? "Build at the habitat fabricator"
              : rocketProblem(p.rocket, p.sim, p.research) ||
                `Build section ${p.rocket.stage + 1} of 3`}
          </button>
          {!p.atFabricator && (
            <button
              className="secondary"
              onClick={() => p.onGuide("fabricator")}
            >
              Show the way to the fabricator
            </button>
          )}
        </article>
      ) : (
        <article className="project-card">
          <h3>Your rocket is ready!</h3>
          <p>
            The flight frame, engine and crew capsule are waiting outside. Your
            supplies are already packed.
          </p>
          <button
            className="primary"
            disabled={!p.atPad || !!p.launchProblem}
            onClick={p.onLaunch}
          >
            {p.launchProblem ||
              (!p.atPad
                ? "Board at the launch pad"
                : "Board rocket & launch to Earth")}
          </button>
          <button className="secondary" onClick={() => p.onGuide("rocket")}>
            Show the way to the launch pad
          </button>
        </article>
      )}
      <p className="science-note">
        A fictional return spacecraft and fuel processor. The flight is a
        time-compressed story sequence, not a real mission trajectory. Earth
        imagery: NASA Earth Observatory, Blue Marble.
      </p>
    </div>
  );
}

