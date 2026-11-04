import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Destination } from "../simulation/engine";

const site = { x: 0, z: 7 };
export const survivorPosition = [2.8, 0.12, 12];
const impact = 16;
const end = 19;

export class CrashLanding {
  readonly root = new T.Group();
  readonly ready: Promise<void>;
  private restY = 0;
  private elapsed = end;
  private finished?: () => void;
  private disposed = false;
  private dust: T.Points;

  constructor(
    scene: T.Scene,
    destination: Destination,
    private ground: (x: number, z: number) => number,
    register: (box: T.Box3) => void,
  ) {
    this.root.visible = false;
    scene.add(this.root);
    const points = new Float32Array(180 * 3);
    for (let i = 0; i < points.length; i += 3) {
      const angle = Math.random() * Math.PI * 2,
        radius = Math.random();
      points[i] = Math.cos(angle) * radius;
      points[i + 1] = Math.sin(radius * Math.PI) * Math.random();
      points[i + 2] = Math.sin(angle) * radius;
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(points, 3));
    this.dust = new T.Points(
      geometry,
      new T.PointsMaterial({
        color: destination === "moon" ? 0xb7b7b5 : 0xbf886c,
        size: 0.09,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.dust.visible = false;
    scene.add(this.dust);
    const file = destination === "moon" ? "apollo-lunar-module" : "insight";
    this.ready = new GLTFLoader()
      .loadAsync("/models/" + file + ".glb")
      .then((gltf) => gltf.scene as T.Object3D)
      .catch(
        () =>
          new T.Mesh(
            new T.ConeGeometry(1.8, 2.9, 24),
            new T.MeshStandardMaterial({ color: 0xa59d89, metalness: 0.5 }),
          ),
      )
      .then((model) => {
        if (this.disposed) {
          model.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.geometry.dispose();
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material]) {
                for (const v of Object.values(m))
                  if (v instanceof T.Texture) v.dispose();
                m.dispose();
              }
            }
          });
          return;
        }
        const box = new T.Box3().setFromObject(model, true);
        const size = box.getSize(new T.Vector3());
        const scale = 7 / Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(scale);
        model.position.sub(
          box.getCenter(new T.Vector3()).multiplyScalar(scale),
        );
        this.root.add(model);
        this.root.position.set(site.x, 0, site.z);
        this.root.rotation.set(0.08, -0.45, -0.16);
        this.root.updateMatrixWorld(true);
        // Seat the tilted mesh on the rendered terrain at its actual contact point.
        const vertex = new T.Vector3();
        let lift = -Infinity;
        model.traverse((o) => {
          if (!(o instanceof T.Mesh)) return;
          o.castShadow = o.receiveShadow = true;
          const positions = o.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            vertex
              .fromBufferAttribute(positions, i)
              .applyMatrix4(o.matrixWorld);
            lift = Math.max(lift, ground(vertex.x, vertex.z) - vertex.y);
          }
        });
        this.restY = lift + 0.005;
        this.root.position.y = this.restY;
        this.root.visible = true;
        register(new T.Box3().setFromObject(this.root, true));
      });
  }
  start(finished: () => void) {
    this.elapsed = 0;
    this.finished = finished;
  }
  frame(dt: number, camera: T.PerspectiveCamera) {
    this.elapsed = Math.min(end, this.elapsed + Math.min(dt, 0.15));
    const t = this.elapsed;
    const left = Math.max(0, 1 - t / impact);
    const flare = T.MathUtils.smoothstep(t, 10, 15);
    const rock = Math.sin(t * 3.2) * Math.min(1, t / 4) * (1 - flare);
    const x = site.x - 45 * left * left,
      z = site.z + 78 * left * left;
    const altitude = 85 * left ** 1.65 + 35 * left;
    const terrainRise = Math.max(
      0,
      this.ground(x, z) - this.ground(site.x, site.z),
    );
    this.root.position.set(x, this.restY + terrainRise + altitude, z);
    this.root.rotation.set(
      0.08 + left * 0.42,
      -0.45 + left * 0.38,
      -0.16 + rock * 0.17,
    );
    const settle = Math.max(0, t - impact);
    this.dust.visible = settle > 0 && settle < 2.7;
    this.dust.position.set(site.x, this.ground(site.x, site.z) + 0.08, site.z);
    this.dust.scale.set(1 + settle * 3, 0.22 + settle * 0.6, 1 + settle * 3);
    (this.dust.material as T.PointsMaterial).opacity = Math.max(
      0,
      0.8 - settle * 0.3,
    );
    const shake = Math.sin(settle * 38) * Math.exp(-settle * 6) * 0.32;
    camera.position
      .set(6 + left * 4 + shake, 2.3 + left * 4, 9 + left * 5)
      .add(this.root.position);
    camera.position.y = Math.max(
      camera.position.y,
      this.ground(camera.position.x, camera.position.z) + 1,
    );
    camera.lookAt(this.root.position);
    if (t >= end && this.finished) {
      const finish = this.finished;
      this.finished = undefined;
      finish();
    }
  }
  dispose() {
    this.disposed = true;
  }
}
