import { expect, it } from "vitest";
import { WorldResources } from "../game/WorldResources";
import { Extraction } from "../game/Extraction";
it("uses the opening E only to enter the rig; later E presses still operate its relay", () => {
  const resources = Object.create(WorldResources.prototype) as WorldResources;
  resources.extraction = new Extraction("battery");
  resources.key("KeyE");
  resources.extraction.update(0.1,0,false,3);
  expect(resources.extraction.fault).toBe("");
  resources.key("KeyE");
  resources.extraction.update(0.1,0,false,3);
  expect(resources.extraction.fault).toBe("Relay tripped. ");
});
