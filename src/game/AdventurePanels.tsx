import type { CSSProperties } from "react";
import type { Destination, Sim } from "../simulation/engine";
import {
  badges,
  projects,
  projectProblem,
  robotSites,
  sampleSites,
  type Adventure,
  type Upgrade,
} from "./Adventure";
export function AdventurePanels(p: {
  mode: "journal" | "outpost";
  data: Adventure;
  sim: Sim;
  destination: Destination;
  atFabricator: boolean;
  onBuild: (id: Upgrade) => void;
  onGuide: (id: string, name: string, text: string) => void;
}) {
  const a = p.data;
  if (p.mode === "outpost")
    return (
      <div className="expedition-panel">
        <div className="expedition-kicker">
          ENGINEERING / MAKE THIS WORLD HOME
        </div>
        <h2>Your work changes the outpost.</h2>
        <p>
          Recover useful equipment. Research better tools. Build something you
          can see and use.
        </p>
        <div className="expedition-reserves">
          <span>
            SPARE PARTS<strong>{p.sim.parts.toFixed(1)}</strong>
          </span>
          <span>
            POWER<strong>{p.sim.battery.toFixed(0)}%</strong>
          </span>
          <span>
            WATER<strong>{p.sim.water.toFixed(0)}%</strong>
          </span>
          <span>
            RESEARCH<strong>{a.research}</strong>
          </span>
        </div>
        {!p.atFabricator && (
          <button
            className="primary"
            onClick={() =>
              p.onGuide(
                "fabricator",
                "Outpost fabricator",
                "Follow the trail inside. Press E at the fabricator to build a project.",
              )
            }
          >
            Guide me to the fabricator →
          </button>
        )}
        <div className="project-grid">
          {projects.map((project) => {
            const built = a.upgrades.includes(project.id),
              problem = projectProblem(a, p.sim, project.id);
            return (
              <article
                className={"project-card " + (built ? "built" : "")}
                key={project.id}
              >
                <div
                  className={"project-art project-" + project.id}
                  aria-hidden="true"
                >
                  <div className="project-stage" />
                  {project.id === "solar" ? (
                    <>
                      <i />
                      <i />
                      <i />
                      <i />
                      <div className="solar-wing">
                        {Array.from({ length: 24 }, (_, i) => (
                          <b key={i} />
                        ))}
                      </div>
                    </>
                  ) : project.id === "recycler" ? (
                    <>
                      <div className="recovery-tank" />
                      <div className="recovery-tank second" />
                      <i className="recovery-pipe" />
                    </>
                  ) : project.id === "medbay" ? (
                    <div className="room-project-preview">
                      <span>+</span>
                      <strong>CREW RECOVERY</strong>
                      <small>WALK-IN MEDICAL ROOM</small>
                    </div>
                  ) : (
                    <>
                      <div className="workbench" />
                      <div className="gantry" />
                      <span className="workshop-spark">✦</span>
                    </>
                  )}
                </div>
                <div className="project-meta">
                  <span>
                    {built ? "● BUILT & OPERATING" : "OUTPOST PROJECT"}
                  </span>
                  <h3>{project.name}</h3>
                  <p>{project.subtitle}</p>
                  <small>
                    {project.parts} parts · {project.power}% power
                    {project.water ? ` · ${project.water}% water` : ""}
                    {project.research ? ` · ${project.research} research` : ""}
                  </small>
                  <button
                    className={built ? "secondary" : "primary"}
                    disabled={!!problem || !p.atFabricator}
                    onClick={() => p.onBuild(project.id)}
                  >
                    {built
                      ? "Project complete"
                      : problem ||
                        (!p.atFabricator
                          ? "Build at fabricator"
                          : "Build this project →")}
                  </button>
                  {built && project.id === "medbay" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        p.onGuide(
                          "medbay",
                          "Crew recovery room",
                          "Follow the trail through the east doorway. Rest inside to restore health and suit air.",
                        )
                      }
                    >
                      Visit recovery room →
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <div className="resource-purpose">
          <strong>Every supply has a job.</strong>
          <p>
            <b>Ice / water</b> feeds oxygen production, plants, and the recovery
            module. <b>Spare parts</b> repair equipment and robots, build
            projects, and support backup power. <b>Battery packs</b> power the
            habitat, robot repairs, and construction. <b>Samples</b> earn
            research for the workshop and recovery room. <b>Harvested food</b>{" "}
            keeps your crew healthy.
          </p>
        </div>
      </div>
    );
  return (
    <div className="expedition-panel">
      <div className="expedition-kicker">
        FIELD NOTES / {p.destination === "moon" ? "LUNA" : "ARES"}
      </div>
      <h2>A world worth discovering.</h2>
      <p>
        Your samples, rescues, and engineering work tell the story of this
        outpost.
      </p>
      <div className="journal-totals">
        <span>
          <strong>
            {a.samples.length}
            <small>/ 4</small>
          </strong>{" "}
          SAMPLES
        </span>
        <span>
          <strong>
            {a.rescued.length}
            <small>/ 2</small>
          </strong>{" "}
          ROBOTS HOME
        </span>
        <span>
          <strong>{a.research}</strong> RESEARCH AVAILABLE
        </span>
      </div>
      <div className="expedition-section-title">
        <h3>Robot rescue crew</h3>
        <span>REPAIR → HITCH → RETURN</span>
      </div>
      <div className="rescue-cards">
        {robotSites(p.destination).map((robot, i) => {
          const rescued = a.rescued.includes(robot.id),
            ready = a.readyRobots.includes(robot.id),
            towing = a.towing === robot.id;
          return (
            <article
              key={robot.id}
              className={"rescue-card " + (rescued ? "complete" : "")}
            >
              <div className="robot-portrait" aria-hidden="true">
                <b>{i ? "03" : "07"}</b>
                <i />
                <i />
                <span>••</span>
              </div>
              <div>
                <small>
                  {rescued
                    ? "HOME & SAFE"
                    : towing
                      ? "TOW CABLE ATTACHED"
                      : ready
                        ? "READY FOR THE BUGGY"
                        : "RECOVERY SIGNAL"}
                </small>
                <h3>{robot.name}</h3>
                <p>
                  {rescued
                    ? "Returned safely to the recovery pad."
                    : towing
                      ? "Drive to the blue recovery pad and brake to deliver."
                      : ready
                        ? "Bring the buggy close. Press E to attach the tow cable."
                        : "Bring 1 spare part and 8% power. Wrap the tread around both wheels and tighten it."}
                </p>
                <button
                  className="secondary"
                  disabled={rescued}
                  onClick={() =>
                    p.onGuide(
                      towing ? "recovery" : "robot:" + robot.id,
                      towing ? "Robot recovery pad" : robot.name,
                      towing
                        ? "Drive to the blue pad and stop to deliver."
                        : ready
                          ? "Bring your buggy close and press E to attach the tow cable."
                          : "Follow the signal. Refit the broken track, then bring your buggy close to hitch it.",
                    )
                  }
                >
                  {rescued
                    ? "Rescue complete"
                    : towing
                      ? "Guide me home →"
                      : "Track this rescue →"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="expedition-section-title">
        <h3>Sample collection</h3>
        <span>+1 RESEARCH PER DISCOVERY</span>
      </div>
      <div className="sample-grid">
        {sampleSites(p.destination).map((sample, i) => {
          const found = a.samples.includes(sample.id);
          return (
            <article
              className={"sample-card " + (found ? "recorded" : "")}
              style={
                {
                  "--sample-colour":
                    "#" + sample.colour.toString(16).padStart(6, "0"),
                } as CSSProperties
              }
              key={sample.id}
            >
              <div className="sample-display">
                <span className={"sample-gem sample-shape-" + i} />
                <small>FIELD SAMPLE {String(i + 1).padStart(2, "0")}</small>
              </div>
              <div className="sample-copy">
                <small>{found ? "● RECORDED" : "+1 RESEARCH"}</small>
                <h3>{sample.name}</h3>
                <p>{sample.description}</p>
                <button
                  className="secondary"
                  disabled={found}
                  onClick={() =>
                    p.onGuide(
                      "sample:" + sample.id,
                      sample.name,
                      "Follow the trail. Capture two scan pulses as they cross the striped zone.",
                    )
                  }
                >
                  {found ? "In your journal" : "Find this sample →"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="expedition-section-title">
        <h3>Explorer patches</h3>
        <span>EARNED THROUGH PLAY</span>
      </div>
      <div className="badge-grid">
        {badges(a).map((badge, i) => (
          <article
            key={badge.id}
            className={"explorer-badge " + (badge.earned ? "earned" : "")}
          >
            <div aria-hidden="true">{["◈", "✦", "⚙", "◎"][i]}</div>
            <strong>{badge.name}</strong>
            <small>{badge.earned ? "PATCH EARNED" : badge.detail}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
