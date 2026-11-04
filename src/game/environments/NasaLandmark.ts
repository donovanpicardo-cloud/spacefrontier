import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { CollisionWorld } from "../CollisionWorld";
import { batchStatic } from "./StaticBatch";
export function loadNasaLander(
  placeholder: T.Group,
  physics: CollisionWorld,
  disposed: () => boolean,
) {
  new GLTFLoader().load(
    "/models/apollo-lunar-module.glb",
    (gltf) => {
      const model = gltf.scene;
      if (disposed()) {
        model.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              for (const v of Object.values(m))
                if (v instanceof T.Texture) v.dispose();
              m.dispose();
            });
          }
        });
        return;
      }
      const box = new T.Box3().setFromObject(model),
        size = box.getSize(new T.Vector3()),
        center = box.getCenter(new T.Vector3());
      const scale = Math.min(6 / size.y, 8 / Math.max(size.x, size.z));
      model.scale.multiplyScalar(scale);
      model.position.set(
        -center.x * scale,
        -box.min.y * scale,
        -center.z * scale,
      );
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = o.receiveShadow = true;
        }
      });
      placeholder.children.forEach((o) => (o.visible = false));
      placeholder.add(model);
      placeholder.userData.noCollision = false;
      placeholder.userData.noBatch = false;
      // Collect only this newly loaded landmark, never the moving vehicles/robots.
      const parent = placeholder.parent!,
        temp = new T.Scene();
      temp.add(placeholder);
      physics.collect(temp, []);
      parent.add(placeholder);
      batchStatic(placeholder);
    },
    undefined,
    () => {
      if (disposed()) return;
      placeholder.userData.noCollision = false;
      placeholder.userData.noBatch = false;
      const parent = placeholder.parent!,
        temp = new T.Scene();
      temp.add(placeholder);
      physics.collect(temp, []);
      parent.add(placeholder);
      batchStatic(placeholder);
    },
  );
}
