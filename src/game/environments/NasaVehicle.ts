import * as T from "three";
import { modelClarity } from "../ModelClarity";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export function releaseModel(root: T.Object3D) {
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const v of Object.values(m))
          if (v instanceof T.Texture) v.dispose();
        m.dispose();
      }
    }
  });
}
export function loadCrewRover(
  parent: T.Group,
  legacy: T.Object3D[],
  disposed: () => boolean,
  ready: (wheels: T.Group[]) => void,
) {
  if (typeof window === "undefined") return;
  new GLTFLoader().load(
    "/models/nasa-sev.glb",
    (gltf) => {
      if (disposed()) {
        releaseModel(gltf.scene);
        return;
      }
      gltf.scene.traverse((o) => {
        if (o instanceof T.Mesh) o.castShadow = o.receiveShadow = true;
      });
      legacy.forEach((o) => (o.visible = false));
      modelClarity(gltf.scene);
      parent.add(gltf.scene);
      const wheels = Array.from(
        { length: 6 },
        (_, i) => gltf.scene.getObjectByName("WheelPivot_" + i) as T.Group,
      );
      ready(wheels.filter(Boolean));
    },
    undefined,
    () => {
      /* The detailed local fallback remains driveable if this optional asset fails. */
    },
  );
}
