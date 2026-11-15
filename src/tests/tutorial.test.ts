import { describe, expect, it } from "vitest";
import {
  initialTutorial,
  tutorialReducer,
  tutorialSteps,
  simulationRuns,
  tutorialTarget,
} from "../game/Tutorial";
import { parseSave, type Save } from "../game/Save";
import { initialSim, tick } from "../simulation/engine";
import { navigationTarget } from "../game/Navigation";

const save: Save = {
  version: 1,
  destination: "moon",
  sim: initialSim(),
  allocation: { oxygen: true, greenhouse: true, recycler: true, backup: false },
  mission: 0,
  done: [],
  position: [0, 0.12, 4],
  inside: false,
};
describe("a first astronaut lesson", () => {
  it("requires real actions in order, including enough walking and orbiting", () => {
    let state = initialTutorial;
    state = tutorialReducer(state, { type: "airlock" });
    expect(state.index).toBe(0);
    state = tutorialReducer(state, { type: "move", amount: 0.9 });
    expect(state.index).toBe(0);
    state = tutorialReducer(state, { type: "move", amount: 1.2 });
    expect(tutorialSteps[state.index].id).toBe("look");
    state = tutorialReducer(state, { type: "look", amount: 70 });
    state = tutorialReducer(state, { type: "jump" });
    expect(state.index).toBe(1);
    state = tutorialReducer(state, { type: "look", amount: 45 });
    for (const type of [
      "reset",
      "jump",
      "marker",
      "repair",
      "airlock",
      "objective",
      "help",
      "oxygen",
    ] as const)
      state = tutorialReducer(state, { type });
    expect(tutorialSteps[state.index].id).toBe("finish");
    expect(tutorialReducer(state, { type: "finish" })).toEqual(state);
    expect(tutorialReducer(state, { type: "reset-session" })).toEqual(
      initialTutorial,
    );
  });
  it("never consumes resources during practice, even with a repair open", () => {
    for (const panel of [null, "repair", "pause", "settings"]) {
      let sim = initialSim();
      for (let i = 0; i < 600; i++)
        if (simulationRuns(true, panel, true))
          sim = tick(sim, save.allocation, "moon", false);
      expect(sim).toEqual(initialSim());
    }
    expect(simulationRuns(true, null, false)).toBe(true);
    expect(simulationRuns(true, "repair", false)).toBe(true);
    expect(simulationRuns(true, "pause", false)).toBe(false);
    expect(simulationRuns(true, null, false, false)).toBe(false);
    expect(simulationRuns(true, "repair", false, false)).toBe(false);
  });
  it("only points at equipment needed for the current practice step", () => {
    expect(tutorialTarget("jump")).toBeNull();
    expect(tutorialTarget("marker")).toBe("solar");
    expect(tutorialTarget("repair")).toBe("solar");
    expect(tutorialTarget("airlock")).toBe("airlock");
  });
});
describe("mission recovery", () => {
  it("routes habitat travel through the clear aisle and uses the airlock for exterior targets", () => {
    const greenhouse = { id: "greenhouse", x: -3, z: -22 };
    expect(navigationTarget({ x: -6, z: -14 }, true, greenhouse)).toEqual({
      x: 0,
      z: -14,
      phase: "aisle",
    });
    expect(navigationTarget({ x: 0, z: -14 }, true, greenhouse)).toEqual({
      x: 0,
      z: -22,
      phase: "hall",
    });
    expect(navigationTarget({ x: 0, z: -22 }, true, greenhouse)).toEqual({
      x: -3,
      z: -22,
      phase: "target",
    });
    expect(navigationTarget({ x: 15, z: -4 }, false, greenhouse)).toEqual({
      x: 0,
      z: -8.2,
      phase: "target",
    });
    expect(
      navigationTarget({ x: 0, z: -22 }, true, { id: "solar", x: 15, z: -4 }),
    ).toEqual({ x: 0, z: -13.4, phase: "hall" });
    expect(navigationTarget({ x: 0, z: -15 }, true, { id: "airlock", x: 0, z: -10 }))
      .toEqual({ x: 0, z: -13.4, phase: "target" });
  });
  it("accepts existing version-one saves without a difficulty field", () => {
    expect(parseSave(JSON.stringify(save))).toEqual(save);
    const junior = {
      ...save,
      mode: "junior",
      mission: 3,
      done: [0, 1, 2],
      inside: true,
      position: [3, 0.12, -26],
    };
    expect(parseSave(JSON.stringify(junior))).toEqual(junior);
  });
  it("rejects incomplete and malformed saves instead of crashing the game", () => {
    for (const value of [
      null,
      {},
      { ...save, mission: 99 },
      { ...save, position: [0, 0] },
      { ...save, sim: { time: 1 } },
      { ...save, allocation: {} },
      { ...save, done: ["wrong"] },
      { ...save, sim: { ...save.sim, health: -1 } },
      { ...save, sim: { ...save.sim, history: [[1]] } },
    ])
      expect(parseSave(JSON.stringify(value))).toBeNull();
    expect(parseSave("{bad")).toBeNull();
  });
});
