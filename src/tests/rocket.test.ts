import { describe, it, expect, vi, afterEach } from "vitest";
import * as T from "three";
import {
  initialRocket,
  assembleRocket,
  launchProblem,
  validRocket,
  flightPhase,
  FLIGHT_DURATION,
  rocketPad,
} from "../game/Rocket";
import { RocketScene, rocketModel } from "../game/RocketScene";
import { initialSim } from "../simulation/engine";
import { parseSave } from "../game/Save";
import { initialAdventure } from "../game/Adventure";
import { hasResourceSpace, resourceSites } from "../game/Resources";
import { CollisionWorld } from "../game/CollisionWorld";
import { terrainHeight } from "../game/environments/Terrain";
afterEach(() => vi.restoreAllMocks());
describe("earned return journey", () => {
  it("spends resources exactly once per section, requires sample research, and rejects repeats", () => {
    let rocket = initialRocket(),
      sim = initialSim(),
      research = 1;
    for (let i = 0; i < 3; i++) {
      const result = assembleRocket(rocket, sim, research)!;
      expect(result).not.toBeNull();
      ({ rocket, sim, research } = result);
    }
    expect(rocket).toEqual({ stage: 3, arrived: false });
    expect(sim.parts).toBe(0);
    for (const d of ["moon", "mars"] as const) {
      const recovered = resourceSites(d)
        .filter((s) => s.kind === "salvage")
        .reduce((n, s) => n + s.amount, 0);
      // Initial stock + salvage + two rescues pays for all upgrades, missions, rocket and two extra services.
      expect(
        6 + recovered + 6 - (10 + 3 + 1 + 2 + 6 + 2),
      ).toBeGreaterThanOrEqual(1);
    }
    expect(hasResourceSpace({ ...initialSim(), parts: 19 }, "salvage", 6)).toBe(
      false,
    );
    expect(hasResourceSpace({ ...initialSim(), parts: 14 }, "salvage", 6)).toBe(
      true,
    );
    expect(sim.water).toBe(58);
    expect(sim.battery).toBe(40);
    expect(sim.oxygen).toBe(74);
    expect(sim.food).toBe(70);
    expect(research).toBe(0);
    expect(assembleRocket(rocket, sim, 0)).toBeNull();
    expect(
      assembleRocket({ stage: 2, arrived: false }, initialSim(), 0),
    ).toBeNull();
    expect(
      assembleRocket(initialRocket(), { ...initialSim(), parts: 1 }, 1),
    ).toBeNull();
    expect(launchProblem(rocket, [0, 1, 2, 3, 4], false, false, sim)).toBeNull();
    expect(launchProblem(rocket, [0, 1, 2, 3], false, false, sim)).toContain("five");
    expect(launchProblem(rocket, [0, 1, 2, 3, 4], true, false, sim)).toContain(
      "outside",
    );
    expect(launchProblem(rocket, [0, 1, 2, 3, 4], false, true, sim)).toContain(
      "buggy",
    );
  });
  it("blocks boarding with depleted health, suit air, or outpost oxygen", () => {
    const rocket = { stage: 3, arrived: false };
    const done = [0, 1, 2, 3, 4];
    const sim = initialSim();
    expect(launchProblem(rocket, done, false, false, { ...sim, health: 0 })).toContain("Crew health");
    expect(launchProblem(rocket, done, false, false, { ...sim, suit: 0 })).toContain("Suit air");
    expect(launchProblem(rocket, done, false, false, { ...sim, oxygen: 9 })).toContain("Outpost oxygen");
    expect(launchProblem(rocket, done, false, false, sim)).toBeNull();
  });
  it("reads old saves, preserves depleted sites and validates new rocket checkpoints", () => {
    const save = {
      version: 1,
      destination: "moon",
      sim: initialSim(),
      allocation: {
        oxygen: true,
        greenhouse: true,
        recycler: true,
        backup: false,
      },
      mission: 0,
      done: [],
      position: [0, 0.12, 4],
      inside: false,
      adventure: initialAdventure(),
      collectedResources: ["ice-near", "salvage-far"],
    };
    expect(parseSave(JSON.stringify(save))).not.toBeNull();
    for (const rocket of [
      { stage: 0, arrived: false },
      { stage: 2, arrived: false },
      { stage: 3, arrived: true },
    ])
      expect(parseSave(JSON.stringify({ ...save, rocket }))?.rocket).toEqual(
        rocket,
      );
    expect(
      parseSave(
        JSON.stringify({ ...save, rocket: { stage: 2, arrived: true } }),
      ),
    ).toBeNull();
    expect(validRocket({ stage: 4, arrived: false })).toBe(false);
  });
  it.each(["moon", "mars"] as const)(
    "runs a complete, pausable, bounded-geometry flight from %s",
    (destination) => {
      vi.spyOn(T.TextureLoader.prototype, "load").mockReturnValue(
        new T.Texture(),
      );
      const world = new T.Scene(),
        rocket = new RocketScene(world, destination, (x, z) =>
          terrainHeight(x, z, destination),
        );
      expect(rocket.start(() => {})).toBe(false);
      rocket.sync(3);
      const done = vi.fn(),
        render = vi.fn(),
        renderer = { render } as unknown as T.WebGLRenderer,
        camera = new T.PerspectiveCamera(52, 16 / 9, 0.08, 650);
      expect(rocket.start(done)).toBe(true);
      expect(rocket.start(done)).toBe(false);
      for (let i = 0; i < 60; i++)
        rocket.update(1 / 60, camera, renderer, true, true);
      expect(rocket.flight!.elapsed).toBe(0);
      const phases = new Set<string>();
      for (let i = 0; i < FLIGHT_DURATION * 60 + 2; i++) {
        rocket.update(1 / 60, camera, renderer, false, true);
        phases.add(rocket.flight!.phase);
        expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
      }
      expect([...phases]).toEqual([
        "countdown",
        "ascent",
        "transfer",
        "earth",
        "complete",
      ]);
      expect(done).toHaveBeenCalledTimes(1);
      expect(render.mock.calls.some(([s]) => s === world)).toBe(true);
      expect(render.mock.calls.some(([s]) => s === rocket.flight!.space)).toBe(
        true,
      );
      const earth = rocket.flight!.earth;
      expect(
        rocket.flight!.ship.root.position.distanceTo(earth.position),
      ).toBeGreaterThan(38);
      let triangles = 0,
        draws = 0;
      rocket.model.root.traverse((o) => {
        if (o instanceof T.Mesh) {
          triangles +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
          draws++;
        }
      });
      expect(triangles).toBeLessThan(16000);
      expect(draws).toBeLessThan(35);
      const physics = new CollisionWorld();
      rocket.bounds.forEach((b) => physics.add(b));
      expect(
        physics.clearFoot(
          new T.Vector3(rocketPad.x, rocket.pad.position.y + 0.12, rocketPad.z),
        ),
      ).toBe(false);
      expect(
        physics.clearFoot(
          new T.Vector3(
            rocketPad.x + 4.5,
            rocket.pad.position.y + 0.12,
            rocketPad.z,
          ),
        ),
      ).toBe(true);
      rocket.stop();
      expect(rocket.flight).toBeNull();
      expect(rocket.model.root.position.length()).toBe(0);
    },
  );
});

