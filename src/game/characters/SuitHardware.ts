import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { engineeringMap } from "../environments/EngineeringFinish";
import { batchStatic } from "../environments/StaticBatch";

/** Rigid life support hardware follows the torso while the soft suit deforms. */
export function fitLifeSupportPack(suit: T.Object3D) {
  const spine = suit.getObjectByName("Spine");
  if (!(spine instanceof T.Bone)) return;
  const pack = new T.Group();
  pack.name = "Life support assembly";
  pack.position.set(0, 1.43, -.345);
  const ceramic = new T.MeshStandardMaterial({ color: 0xd7e0e5, map: engineeringMap(), roughness: .53, metalness: .2 });
  const gasket = new T.MeshStandardMaterial({ color: 0x393630, roughness: .97 });
  const trim = new T.MeshStandardMaterial({ color: 0x9aaab6, roughness: .32, metalness: .8 });
  const ochre = new T.MeshStandardMaterial({ color: 0xad793f, roughness: .94 });
  const add = (geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    pack.add(mesh);
    return mesh;
  };
  const cover = (w: number, h: number, depth: number, radius: number, material: T.Material, x: number, y: number, z: number) =>
    add(new RoundedBoxGeometry(w, h, depth, 4, radius), material, x, y, z);
  cover(.41, .435, .146, .059, gasket, 0, 0, .041);
  cover(.389, .406, .16, .062, ceramic, 0, .018, -.019);
  cover(.278, .27, .044, .02, trim, 0, .026, -.094);
  cover(.255, .244, .039, .017, ceramic, 0, .028, -.112);
  for (const side of [-1, 1]) {
    add(new T.CapsuleGeometry(.041, .204, 10, 24), trim, side * .182, -.014, -.049);
    add(new T.CylinderGeometry(.043, .043, .047, 20), ochre, side * .182, -.061, -.049);
    cover(.042, .036, .021, .008, gasket, side * .105, .112, -.135);
    for (const y of [-.086, .136]) {
      const bolt = add(new T.CylinderGeometry(.01, .01, .012, 8), gasket, side * .108, y, -.136);
      bolt.rotation.x = Math.PI / 2;
    }
    const hose = new T.CatmullRomCurve3([
      new T.Vector3(side * .157, -.135, -.075),
      new T.Vector3(side * .217, -.181, -.04),
      new T.Vector3(side * .22, -.16, .067),
      new T.Vector3(side * .173, -.105, .13),
    ]);
    add(new T.TubeGeometry(hose, 20, .015, 10, false), gasket, 0, 0, 0);
  }
  for (let row = 0; row < 6; row++)
    cover(.112, .008, .008, .003, gasket, 0, -.052 + row * .015, -.135);
  cover(.18, .031, .018, .007, ochre, 0, -.12, -.11);
  batchStatic(pack);
  suit.add(pack);
  spine.attach(pack);
}
