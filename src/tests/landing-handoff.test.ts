import { expect, it } from "vitest";
import { World } from "../game/World";

it.each([false, true])("renders the cinematic before revealing it (reduced motion: %s)", async (quiet) => {
  const events: string[] = [];
  let finished = () => {};
  const w = Object.assign(Object.create(World.prototype), {
    disposed: false,
    resources: { labels: new Map() }, adventure: { labels: [] },
    player: { root: { visible: true } }, contactShadow: { visible: true },
    camera: {},
    wreck: {
      ready: Promise.resolve(),
      start: (callback: () => void) => { finished = callback; events.push("start"); },
      frame: () => events.push("camera"),
      skip: () => { events.push("skip"); finished(); },
    },
    renderScene: () => events.push("render"),
  }) as World;
  await w.filmLanding(quiet, () => events.push("show"), () => events.push("finish"));
  expect(events).toEqual(quiet ? ["start","camera","render","show","skip","finish"] : ["start","camera","render","show"]);
  expect(w.player.root.visible).toBe(false);
});

