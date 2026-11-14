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
}) {
  const next = rocketStages[p.rocket.stage];
  const supply = next && (p.sim.parts < next.parts ? "salvage" : p.sim.battery < next.battery ? "battery" : p.sim.water < next.water ? "ice" : null);
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
      <div className="expedition-reserves">
        <span>
          PARTS<strong>{Math.floor(p.sim.parts * 10) / 10}</strong>
        </span>
        <span>
          POWER<strong>{Math.floor(p.sim.battery)}%</strong>
        </span>
        <span>
          WATER<strong>{Math.floor(p.sim.water)}%</strong>
        </span>
        <span>
          RESEARCH<strong>{p.research}</strong>
        </span>
      </div>
      {next ? (
        <article className="project-card">
          <h3>{next.name}</h3>
          <p>{next.description}</p>
          <p className="rocket-cost">
            {next.parts} parts · {next.battery}% power
            {next.water ? ` · ${next.water}% water` : ""}
            {next.oxygen ? ` · ${next.oxygen}% oxygen` : ""}
            {next.food ? ` · ${next.food}% food` : ""}
            {next.research ? " · 1 research" : ""}
          </p>
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
          {supply && (
            <button className="secondary" onClick={() => p.onSupplies(supply)}>
              {supply === "salvage" ? "Show me where to find spare parts" : supply === "battery" ? "Show me a power station" : "Show me a water deposit"}
            </button>
          )}
          {next.research > p.research && (
            <p>Press J to open your journal. Pick a rock sample to mark it, then press E near the sample to scan it.</p>
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
