import * as T from "three";
import { InteriorKit } from "./InteriorDetail";
import { batchStatic } from "../environments/StaticBatch";
export const recoveryRoomContains = (
  p: { x: number; z: number },
  built: boolean,
) => built && p.x > 7 && p.x < 15.9 && p.z > -25.9 && p.z < -20.1;
export class RecoveryRoom {
  kit = new InteriorKit();
  gate: T.Mesh;
  lights: T.PointLight[] = [];
  boxes: T.Box3[] = [];
  gateBox: T.Box3;
  built = false;
  constructor(scene: T.Scene) {
    const k = this.kit;
    k.root.name = "Crew recovery room";
    k.root.userData.noCollision = true;
    scene.add(k.root);
    const wall = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
    ) => k.box(x, y, z, w, h, d, k.m.paint, true);
    wall(13, 0.045, -23, 6.2, 0.16, 6.2);
    wall(8.5, 0.045, -23, 3, 0.16, 2.4);
    wall(13, 3.35, -23, 6.3, 0.15, 6.3);
    wall(8.5, 2.85, -23, 3, 0.16, 2.6);
    wall(16, 1.7, -23, 0.18, 3.4, 6);
    wall(13, 1.7, -26, 6, 3.4, 0.18);
    wall(13, 1.7, -20, 6, 3.4, 0.18);
    wall(10, 1.7, -25.1, 0.18, 3.4, 1.8);
    wall(10, 1.7, -20.9, 0.18, 3.4, 1.8);
    wall(10, 3, -23, 0.18, 0.7, 2.4);
    wall(8.5, 1.4, -24.2, 3, 2.8, 0.14);
    wall(8.5, 1.4, -21.8, 3, 2.8, 0.14);
    for (const x of [7.3, 8.3, 9.3])
      for (const z of [-24.12, -21.88])
        k.box(x, 1.4, z, 0.075, 2.5, 0.06, k.m.navy);
    for (const z of [-25.8, -20.2]) {
      k.box(13, 0.2, z, 5.5, 0.11, 0.12, k.m.navy);
      k.box(13, 3.1, z, 5.5, 0.08, 0.08, k.m.metal);
      for (let x = 10.5; x < 16; x += 0.8)
        k.box(x, 1.65, z, 0.018, 2.8, 0.025, k.m.metal);
    }
    // Medical cot, articulated scanner and supply cabinets leave a broad clear aisle.
    k.box(14.35, 0.47, -24.5, 1.1, 0.65, 2.4, k.m.navy, true);
    k.box(14.35, 0.85, -24.5, 1.17, 0.22, 2.48, k.fabric);
    k.box(14.35, 1.02, -25.35, 0.88, 0.19, 0.55, k.m.paint);
    for (const z of [-24.9, -24])
      k.box(14.35, 0.98, z, 1.2, 0.035, 0.09, k.m.orange);
    k.tube(
      [
        [13.65, 0.75, -24.2],
        [13.65, 1.7, -24.2],
        [14.35, 2, -24.2],
        [15.05, 1.7, -24.2],
        [15.05, 0.75, -24.2],
      ],
      0.045,
    );
    k.box(14.35, 1.94, -24.2, 0.6, 0.12, 0.32, k.screen);
    k.cabinet(11.2, 0.63, -25.45, 1.5, 1.1, 0.7);
    k.monitor(11.2, 1.8, -25.53, 1.15);
    k.chair(11.2, -24.3);
    k.cabinet(15.35, 1.1, -20.5, 0.9, 1.9, 0.65);
    k.box(12.9, 0.55, -20.5, 2.2, 0.8, 0.68, k.m.navy, true);
    k.box(12.9, 1, -20.5, 2.2, 0.18, 0.75, k.fabric);
    k.label("CREW RECOVERY / MEDICAL", 13, 2.65, -25.88, 3, 0.35);
    k.label("REST HERE / HEALTH + SUIT AIR", 11.2, 2.4, -25.86, 1.9, 0.27);

    for (const [x, z] of [
      [11.4, -23],
      [14.5, -22],
      [8.5, -23],
    ]) {
      k.lamp(x, 2.75, z, 1.3);
      const l = new T.PointLight(0xc3e9e5, 22, 7, 2);
      l.position.set(x, 2.65, z);
      k.root.add(l);
      this.lights.push(l);
    }
    k.root.updateMatrixWorld(true);
    this.boxes = k.solids.map((m) => new T.Box3().setFromObject(m));
    batchStatic(k.root);
    k.root.visible = false;
    const gateKit = new InteriorKit();
    this.gate = gateKit.box(6.94, 1.25, -23, 0.2, 2.5, 2.4, gateKit.m.navy);
    gateKit.label(
      "BUILD RECOVERY ROOM",
      6.81,
      1.65,
      -23,
      1.9,
      0.26,
      -Math.PI / 2,
    );
    gateKit.root.userData.noCollision = true;
    scene.add(gateKit.root);
    this.gate.userData.gateRoot = gateKit.root;
    gateKit.root.updateMatrixWorld(true);
    this.gateBox = new T.Box3().setFromObject(this.gate);
  }
  sync(built: boolean) {
    this.built = built;
    this.kit.root.visible = built;
    this.gate.userData.gateRoot.visible = !built;
  }
  bounds() {
    return this.built ? this.boxes : [this.gateBox];
  }
  contains(p: { x: number; z: number }) {
    return recoveryRoomContains(p, this.built);
  }
}
