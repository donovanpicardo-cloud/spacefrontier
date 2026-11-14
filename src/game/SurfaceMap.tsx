import { rocketPad } from "./Rocket";
import { useState } from "react";
import { Droplets, Zap, Wrench, Home, CarFront } from "lucide-react";
import type { ResourceSite } from "./Resources";
export function SurfaceMap(p: {
  sites: ResourceSite[];
  collected: Set<string>;
  player: number[];
  vehicle: { x: number; z: number };
  roomBuilt: boolean;
  onSelect: (site: ResourceSite) => void;
}) {
  const [kind, setKind] = useState<ResourceSite["kind"] | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const distance = (site: ResourceSite) =>
    Math.hypot(site.x - p.player[0], site.z - p.player[2]);
  const matches = p.sites
    .filter((site) => !p.collected.has(site.id) &&
      (kind === "all" || kind === site.kind) &&
      (!site.id.endsWith("-frontier") || distance(site) <= 150))
    .sort((a, b) => distance(a) - distance(b));
  const sites = expanded ? matches : matches.slice(0, 6);
  const span = Math.max(
    115,
    ...sites.flatMap((s) => [Math.abs(s.x) + 15, Math.abs(s.z) + 15]),
    Math.abs(p.player[0]) + 20,
    Math.abs(p.player[2]) + 20,
  );
  const point = (x: number, z: number) => ({
    left: `${50 + (x / span) * 42}%`,
    top: `${50 + (z / span) * 42}%`,
  });
  return (
    <>
      <label className="survey-filter">
        Supplies
        <select value={kind} onChange={(event) => {
          setKind(event.target.value as typeof kind);
          setExpanded(false);
        }}>
          <option value="all">All supplies</option>
          <option value="ice">Water</option>
          <option value="battery">Power</option>
          <option value="salvage">Parts</option>
        </select>
      </label>
      <p>Choose a site to mark a trail. More remote sites appear as you explore.</p>
      <div
        className="surface-map"
        aria-label="Surface survey map, north at the top"
      >
        <div className="map-grid" />
        <span className="survey-north">N ↑</span>
        <div className="survey-base" style={point(0, -22)}>
          <Home size={18} />
          <span>Habitat{p.roomBuilt ? " + recovery room" : ""}</span>
        </div>
        <div className="survey-rover" style={point(rocketPad.x, rocketPad.z)}>
          <span>△ ROCKET PAD</span>
        </div>
        <div className="survey-rover" style={point(p.vehicle.x, p.vehicle.z)}>
          <CarFront size={18} />
          <span>Buggy</span>
        </div>
        {sites.map((s) => (
          <button
            key={s.id}
            className={`survey-site ${s.kind}`}
            style={point(s.x, s.z)}
            onClick={() => p.onSelect(s)}
            aria-label={`Mark trail to ${s.name}`}
            title={s.name}
          >
            {s.kind === "ice" ? (
              <Droplets size={17} />
            ) : s.kind === "battery" ? (
              <Zap size={17} />
            ) : (
              <Wrench size={17} />
            )}
          </button>
        ))}
        <div className="survey-player" style={point(p.player[0], p.player[2])}>
          ▲ YOU
        </div>
      </div>
      {matches.length === 0 && <p>No available sites in this survey. Try another supply or explore farther.</p>}
      <div className="survey-list">
        {sites.map((s) => (
          <button
            key={s.id}
            className="secondary"
            onClick={() => p.onSelect(s)}
          >
            <strong>{s.name}</strong>
            <small>
              {`${Math.round(distance(s))} m · ${s.amount}${s.kind === "salvage" ? " spare parts" : s.kind === "ice" ? "% water" : "% battery"}`}
            </small>
          </button>
        ))}
      </div>
      {matches.length > 6 && (
        <button className="secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show nearest six" : `Show all ${matches.length} available sites`}
        </button>
      )}
    </>
  );
}
