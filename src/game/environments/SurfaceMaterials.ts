import * as T from "three";
import type { Destination } from "../../simulation/engine";
import { paintedTerrain } from "./PainterlyMaterials";

// Retained entry point: both worlds now use the same illustrated material language.
export function photographedSurface(material: T.MeshStandardMaterial, destination: Destination, repeat: number, rock = false) {
  paintedTerrain(material, destination === "mars", repeat, rock);
}
