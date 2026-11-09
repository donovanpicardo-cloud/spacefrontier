import * as T from "three";
import { modelClarity } from "./ModelClarity";
import { batchStatic } from "./environments/StaticBatch";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "meshoptimizer/decoder";
import type { Destination } from "../simulation/engine";
import { ARRIVAL_DURATION, ARRIVAL_IMPACT } from "./ArrivalTimeline";
import { crashSite } from "./CrashSite";

export { survivorPosition } from "./CrashSite";
const impact = ARRIVAL_IMPACT;
const end = ARRIVAL_DURATION;
const wreckAngle = new T.Euler(0.38, -0.85, -1.08);

type Fragment = {
  mesh: T.Group;
  socket: T.Vector3;
  from: T.Vector3;
  to: T.Vector3;
  spin: T.Vector3;
  duration: number;
};

// Translate a tilted assembly until its lowest contact point touches the terrain.
function terrainLift(
  root: T.Object3D,
  ground: (x: number, z: number) => number,
) {
  root.updateWorldMatrix(true, true);
  const vertex = new T.Vector3();
  let lift = -Infinity;
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || o.userData.noContact) return;
    const positions = o.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(o.matrixWorld);
      lift = Math.max(lift, ground(vertex.x, vertex.z) - vertex.y);
    }
  });
  return lift + 0.005;
}

export class CrashLanding {
  readonly root = new T.Group();
  readonly ready: Promise<void>;
  private restY = 0;
  private site: ReturnType<typeof crashSite>;
  private strike: T.Vector3;
  private strikeY = 0;
  private fragments: Fragment[] = [];
  private separated = false;
  private impactRotation = new T.Quaternion().setFromEuler(wreckAngle);
  private elapsed = end;
  get time() { return this.elapsed; }
  private finished?: () => void;
  private disposed = false;
  private dust: T.Points;
  private sparks: T.Points;
  private exhaust = new T.Group();
  private flame: T.Mesh;
  private fragmentRest = new T.Quaternion().setFromAxisAngle(
    T.Object3D.DEFAULT_UP,
    1,
  );

  constructor(
    private scene: T.Scene,
    destination: Destination,
    private ground: (x: number, z: number) => number,
    register: (box: T.Box3, geometry?: T.BufferGeometry, matrix?: T.Matrix4) => void,
  ) {
    const site = this.site = crashSite(destination);
    const strike = this.strike = new T.Vector3(site.x - 1.4, 0, site.z + 1.6);
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
    const sparksGeometry = new T.BufferGeometry();
    sparksGeometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(72 * 3), 3),
    );
    this.sparks = new T.Points(
      sparksGeometry,
      new T.PointsMaterial({
        color: 0xffad55,
        size: 0.12,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.sparks.frustumCulled = false;
    this.sparks.visible = false;
    scene.add(this.sparks);
    this.flame = new T.Mesh(
      new T.ConeGeometry(0.5, 3, 12),
      new T.MeshBasicMaterial({
        color: 0x99dcff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.flame.position.y = -2;
    this.flame.userData.noContact = true;
    this.exhaust.add(this.flame);
    this.root.add(this.exhaust);
    this.exhaust.visible = false;
    const file = destination === "moon" ? "apollo-lunar-module" : "insight";
    this.ready = new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
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
        modelClarity(model);
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
        // InSight includes baked solar wings in addition to its articulated arrays.
        // Strip the baked copies so breaking the hinges actually opens the silhouette.
        const deck = model.getObjectByName("InSight_Deployed");
        for (const mesh of deck?.children ?? []) {
          if (!(mesh instanceof T.Mesh) || mesh.name.startsWith("panel_"))
            continue;
          const geometry = mesh.geometry,
            index = geometry.index;
          if (!index) continue;
          const position = geometry.attributes.position;
          const kept: number[] = [];
          for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i),
              b = index.getX(i + 1),
              c = index.getX(i + 2);
            const x =
              (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
            const y =
              (position.getY(a) + position.getY(b) + position.getY(c)) / 3;
            if (Math.abs(x) < 0.84 || y < 0.16 || y > 0.52) kept.push(a, b, c);
          }
          if (kept.length === index.count) continue;
          geometry.setIndex(kept);
          mesh.geometry = mergeVertices(geometry);
          geometry.dispose();
        }
        const box = new T.Box3().setFromObject(model, true);
        const size = box.getSize(new T.Vector3());
        const scale = 7 / Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(scale);
        model.position.sub(
          box.getCenter(new T.Vector3()).multiplyScalar(scale),
        );
        this.root.add(model);
        this.root.updateWorldMatrix(true, true);
        model.traverse((o) => {
          if (o instanceof T.Mesh) o.castShadow = o.receiveShadow = true;
        });
        // Keep each folding array or lunar strut assembly together when its joint fails.
        const assemblies =
          destination === "mars"
            ? ["panel_l_root", "panel_r_root", "arm_01"]
            : ["group73", "group74", "group51", "pCone6"];
        const paths = destination === "moon" ? [[-5, 2], [4, 4], [-4, -3], [0, 5]] : [
          [-5, 2],
          [5, -2],
          [-3, -5],
          [4, 3],
        ];
        assemblies.forEach((name, i) => {
          const parts: T.Object3D[] = [];
          model.traverse((o) => {
            if (
              o.name === name ||
              (name.startsWith("group") && o.name.startsWith(name))
            )
              parts.push(o);
          });
          if (!parts.length) return;
          const bounds = new T.Box3();
          for (const part of parts) bounds.expandByObject(part, true);
          const pivot = new T.Group();
          bounds.getCenter(pivot.position);
          this.root.add(pivot);
          for (const part of parts) pivot.attach(part);
          this.fragments.push({
            mesh: pivot,
            socket: pivot.position.clone(),
            from: new T.Vector3(),
            to: new T.Vector3(site.x + paths[i][0], 0, site.z + paths[i][1]),
            spin: new T.Vector3(2.4 + i, i % 2 ? -2 : 3, 1.8 - i),
            duration: 1.2 + 0.28 * i,
          });
        });
        this.root.rotation.copy(wreckAngle);
        this.root.position.copy(strike);
        this.strikeY = terrainLift(this.root, ground);
        this.root.position.y = this.strikeY;
        for (const piece of this.fragments) {
          piece.mesh.getWorldPosition(piece.from);
          scene.attach(piece.mesh);
          piece.mesh.position.copy(piece.to);
          this.rotateFragment(piece, 1);
          piece.to.y = terrainLift(piece.mesh, ground);
          piece.mesh.position.y = piece.to.y;
        }
        this.separated = true;
        this.root.position.set(site.x, 0, site.z);
        this.restY = terrainLift(this.root, ground);
        this.root.position.y = this.restY;
        this.root.visible = true;
        // Freeze collision at the final resting pose, not at the pre-lift transform.
        // Separate mesh bounds leave the empty space around struts and panels clear.
        this.root.updateMatrixWorld(true);
        this.root.traverse((object) => {
          if (!(object instanceof T.Mesh) || object.userData.noContact) return;
          object.geometry.computeBoundingBox();
          const collision = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
          register(collision, object.geometry, object.matrixWorld.clone());
        });
        // Preserve registered collision geometry and the independent breaking pivots;
        // merge only the rigid rendering inside each assembly for laptop GPUs.
        batchStatic(this.root);
        for (const piece of this.fragments) batchStatic(piece.mesh);
      });
  }
  private rotateFragment(piece: Fragment, progress: number) {
    piece.mesh.quaternion.copy(this.impactRotation);
    piece.mesh.rotateX(piece.spin.x * progress);
    piece.mesh.rotateY(piece.spin.y * progress);
    piece.mesh.rotateZ(piece.spin.z * progress);
    piece.mesh.quaternion.slerp(
      this.fragmentRest.setFromAxisAngle(T.Object3D.DEFAULT_UP, piece.spin.y),
      T.MathUtils.smoothstep(progress, 0.72, 1),
    );
  }
  start(finished: () => void) {
    for (const piece of this.fragments) {
      this.root.add(piece.mesh);
      piece.mesh.position.copy(piece.socket);
      piece.mesh.quaternion.identity();
    }
    this.separated = false;
    this.elapsed = 0;
    this.finished = finished;
  }
  frame(dt: number, camera: T.PerspectiveCamera) {
    this.elapsed = Math.min(end, this.elapsed + Math.min(dt, 0.15));
    const t = this.elapsed;
    const left = Math.max(0, 1 - t / impact);
    const settle = Math.max(0, t - impact);
    const failure = T.MathUtils.smoothstep(t, 2, 6);
    const vibration = failure * Math.min(1, left * 6);
    this.exhaust.visible = t < impact;
    this.flame.visible = t < 2 || (t < 6 && Math.sin(t * 31) > 0.5);
    this.flame.scale.set(1, 0.8 + Math.sin(t * 43) * 0.2, 1);
    this.sparks.visible = t > 2 && t < impact + 1.8;
    if (this.sparks.visible) {
      const positions = this.sparks.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const age = (t * 0.9 + i / positions.count) % 1;
        const angle = i * 2.399;
        const radius = age * (t < impact ? 2 : 6);
        positions.setXYZ(
          i,
          this.root.position.x + Math.cos(angle) * radius,
          this.root.position.y +
            (t < impact ? age * 7 : Math.sin(age * Math.PI) * 2),
          this.root.position.z + Math.sin(angle) * radius + age * 3,
        );
      }
      positions.needsUpdate = true;
    }
    if (t < impact) {
      const sway = Math.sin(t * 1.7) * failure * Math.min(1, left * 5);
      const strike = this.strike;
      const x = strike.x - 50 * left + 4 * sway;
      const z = strike.z + 78 * left;
      const groundRise = Math.max(
        0,
        this.ground(x, z) - this.ground(strike.x, strike.z),
      );
      this.root.position.set(
        x,
        this.strikeY + groundRise + 120 * (1 - (t / impact) ** 1.55),
        z,
      );
      this.root.rotation.set(
        wreckAngle.x * failure +
          sway * 0.59 +
          Math.sin(t * 37) * vibration * 0.09,
        wreckAngle.y + 3.6 * left + sway * 0.85,
        wreckAngle.z * failure +
          2 * Math.PI * T.MathUtils.smoothstep(t, 4, 11) +
          sway * 1.35 +
          Math.sin(t * 29) * vibration * 0.14,
      );
      for (let i = 0; i < this.fragments.length; i++) {
        const piece = this.fragments[i];
        piece.mesh.rotation.z = Math.sin(t * (23 + i * 3)) * failure * 0.18;
      }
    } else {
      if (!this.separated) {
        for (const piece of this.fragments) this.scene.add(piece.mesh);
        this.separated = true;
      }
      const skid = 1 - (1 - Math.min(1, settle / 0.85)) ** 2;
      this.root.rotation.copy(wreckAngle);
      this.root.position.set(
        T.MathUtils.lerp(this.strike.x, this.site.x, skid),
        T.MathUtils.lerp(this.strikeY, this.restY, skid) +
          0.32 * Math.sin(Math.PI * skid),
        T.MathUtils.lerp(this.strike.z, this.site.z, skid),
      );
      for (const piece of this.fragments) {
        const u = Math.min(1, settle / piece.duration);
        piece.mesh.position.lerpVectors(piece.from, piece.to, u);
        piece.mesh.position.y +=
          4 * u * (1 - u) * (1.2 + piece.duration * 0.55);
        this.rotateFragment(piece, u);
      }
    }
    this.dust.visible = settle > 0 && settle < 2.7;
    const { x, z } = this.site;
    this.dust.position.set(x, this.ground(x, z) + 0.08, z);
    this.dust.scale.set(1 + settle * 4, 0.35 + settle * 1.1, 1 + settle * 4);
    (this.dust.material as T.PointsMaterial).opacity = Math.max(
      0,
      0.8 - settle * 0.3,
    );
    const shake =
      t < impact
        ? Math.sin(t * 31) * vibration * 0.1
        : Math.sin(settle * 38) * Math.exp(-settle * 4) * 0.9;
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
