import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { CollisionWorld } from "../CollisionWorld";
import { releaseModel } from "./NasaVehicle";
export function collectAnnexFootprint(
  root: T.Object3D,
  physics: CollisionWorld,
) {
  root.updateMatrixWorld(true);
  const total = new T.Box3().setFromObject(root),
    size = 0.4,
    cells = new Map<string, number>();
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const p = o.geometry.attributes.position,
      index = o.geometry.index;
    for (let i = 0; i < (index ? index.count : p.count); i += 3) {
      const vertices = [0, 1, 2].map((j) =>
        new T.Vector3()
          .fromBufferAttribute(p, index ? index.getX(i + j) : i + j)
          .applyMatrix4(o.matrixWorld),
      );
      const bounds = new T.Box3().setFromPoints(vertices),
        tri = new T.Triangle(
          ...(vertices.map((v) => new T.Vector3(v.x, 0, v.z)) as [
            T.Vector3,
            T.Vector3,
            T.Vector3,
          ]),
        );
      for (
        let x = Math.floor(bounds.min.x / size);
        x <= Math.floor(bounds.max.x / size);
        x++
      )
        for (
          let z = Math.floor(bounds.min.z / size);
          z <= Math.floor(bounds.max.z / size);
          z++
        ) {
          const box = new T.Box3(
            new T.Vector3(x * size, -0.01, z * size),
            new T.Vector3((x + 1) * size, 0.01, (z + 1) * size),
          );
          if (box.intersectsTriangle(tri))
            cells.set(
              x + "," + z,
              Math.max(cells.get(x + "," + z) ?? total.min.y, bounds.max.y),
            );
        }
    }
  });
  for (const [key, top] of cells) {
    const [x, z] = key.split(",").map(Number),
      box = new T.Box3(
        new T.Vector3(x * size, total.min.y, z * size),
        new T.Vector3((x + 1) * size, top, (z + 1) * size),
      );
    physics.labels.set(box, "Habitat annex");
    physics.add(box);
  }
}
export function loadHabitatAnnex(
  scene: T.Scene,
  physics: CollisionWorld,
  disposed: () => boolean,
  colliders: T.Mesh[],
) {
  if (typeof window === "undefined") return;
  new GLTFLoader().load(
    "/models/nasa-hdu.glb",
    (gltf) => {
      if (disposed()) {
        releaseModel(gltf.scene);
        return;
      }
      const model = gltf.scene,
        bounds = new T.Box3().setFromObject(model),
        center = bounds.getCenter(new T.Vector3()),
        scale = 6 / bounds.getSize(new T.Vector3()).y;
      model.scale.multiplyScalar(scale);
      model.position.set(
        -center.x * scale,
        -bounds.min.y * scale,
        -center.z * scale,
      );
      const root = new T.Group();
      root.position.set(14, 0, -26);
      root.rotation.y = Math.PI;
      root.add(model);
      scene.add(root);
      root.updateMatrixWorld(true);
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = o.receiveShadow = true;
          colliders.push(o);
        }
      });
      collectAnnexFootprint(root, physics);
    },
    undefined,
    () => {},
  );
}
