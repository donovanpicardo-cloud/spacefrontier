import { expect, it } from "vitest";
import * as T from "three";
import { pressureCollar, pressureVesselGeometry, vaultedHabitat } from "../game/environments/PressureArchitecture";

it("keeps pressure collars clear across the playable doorway", () => {
  const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  for (const [w,h,iw,ih] of [[2.72,4.94,2.22,4.36],[2.32,4.31,1.73,3.58],[1.88,3.76,1.41,3.01]]) {
    const mesh = new T.Mesh(new T.ExtrudeGeometry(pressureCollar(w,h,iw,ih), {depth:.82,bevelEnabled:false,curveSegments:32}),material);
    mesh.updateMatrixWorld();
    for (const x of [-1,0,1]) for (const y of [.1,1.5,2.5]) {
      const ray = new T.Raycaster(new T.Vector3(x,y,2),new T.Vector3(0,0,-1));
      expect(ray.intersectObject(mesh)).toHaveLength(0);
    }
  }
});

it("keeps new roof geometry above the cabin and within a practical triangle budget", () => {
  const root = new T.Group(), mat = new T.MeshStandardMaterial();
  vaultedHabitat(root,mat,mat,mat);
  const bounds = new T.Box3().setFromObject(root);
  expect(bounds.min.y).toBeGreaterThan(4.39);
  expect(bounds.max.y).toBeLessThan(5.9);
  let triangles=0;
  root.traverse(o=>{if(o instanceof T.Mesh) triangles+=(o.geometry.index?.count ?? o.geometry.attributes.position.count)/3;});
  expect(triangles).toBeLessThan(18000);
  const vessel=pressureVesselGeometry(); vessel.computeBoundingBox();
  expect(vessel.boundingBox!.min.y).toBeGreaterThanOrEqual(-2.36);
  expect(vessel.boundingBox!.max.y).toBeLessThanOrEqual(2.36);
  expect(Array.from(vessel.attributes.position.array).every(Number.isFinite)).toBe(true);
});

