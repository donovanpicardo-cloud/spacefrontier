import { rocketPad } from "./Rocket";
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
  const sites = p.sites.filter(site => !site.id.endsWith("-frontier") ||
    p.collected.has(site.id) || Math.hypot(site.x - p.player[0], site.z - p.player[2]) <= 150);
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
            disabled={p.collected.has(s.id)}
            className={`survey-site ${s.kind} ${p.collected.has(s.id) ? "used" : ""}`}
            style={point(s.x, s.z)}
            onClick={() => p.onSelect(s)}
            aria-label={`${s.name}, ${p.collected.has(s.id) ? "used" : s.kind === "ice" ? "water available" : s.kind === "battery" ? "battery available" : "salvage available"}`}
          >
            {s.kind === "ice" ? (
              <Droplets size={17} />
            ) : s.kind === "battery" ? (
              <Zap size={17} />
            ) : (
              <Wrench size={17} />
            )}
            <span>
              {p.collected.has(s.id)
                ? "USED"
                : s.kind === "ice"
                  ? "WATER"
                  : s.kind === "battery"
                    ? "BATTERY"
                    : "PARTS"}
            </span>
          </button>
        ))}
        <div className="survey-player" style={point(p.player[0], p.player[2])}>
          ▲ YOU
        </div>
      </div>
      <p className="science-note">
        Water is buried at drilling rigs. Batteries must be charged at field
        generators. Select a marker for a trail. Used sites are grey. The map
        expands with your travels. Drive beyond the base survey to pick up remote stations within 150 m.
      </p>
      <div className="survey-list">
        {sites.map((s) => (
          <button
            key={s.id}
            className="secondary"
            disabled={p.collected.has(s.id)}
            onClick={() => p.onSelect(s)}
          >
            <strong>{s.name}</strong>
            <small>
              {p.collected.has(s.id)
                ? "Recovered — empty"
                : `${Math.round(Math.hypot(s.x - p.player[0], s.z - p.player[2]))} m · ${s.amount}${s.kind === "salvage" ? " spare parts" : s.kind === "ice" ? "% water" : "% battery"}`}
            </small>
          </button>
        ))}
      </div>
    </>
  );
}
