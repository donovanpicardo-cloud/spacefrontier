import * as T from "three";
import { modelClarity } from "../ModelClarity";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { jumpPhase } from "../Jump";
import { reachArm } from "../ArmIK";

/** Locally hosted Grab3D CC0 spacesuit, simplified for the browser. */
export class OnlineAstronaut {
  root = new T.Group();
  mixer: T.AnimationMixer | null = null;
  actions = new Map<string, T.AnimationAction>();
  current = "";
  loaded = false;
  disposed = false;
  constructor(onStatus: (s: "loading" | "ready" | "error") => void) {
    onStatus("loading");
    new GLTFLoader().load(
      "/models/astronaut.glb",
      (gltf) => {
        if (this.disposed) {
          this.free(gltf.scene);
          return;
        }
        const model = gltf.scene;
        modelClarity(model);
        this.mixer = new T.AnimationMixer(model);
        for (const clip of gltf.animations) {
          const raw = clip.name.split("|").pop()!;
          const name = raw.charAt(0).toUpperCase() + raw.slice(1);
          // No root-motion translation: movement belongs to the game controller.
          for (const track of clip.tracks)
            if (/Hips.position/.test(track.name)) {
              for (let i = 0; i < track.values.length; i += 3) {
                track.values[i] = track.values[0];
                track.values[i + 2] = track.values[2];
              }
            }
          this.actions.set(name, this.mixer.clipAction(clip));
        }
        // Author gentle idle, jump, landing and servicing poses on the downloaded skeleton.
        // Average opposing walk phases for a neutral stance instead of the source A-pose.
        const walk = this.actions.get("Walk");
        const bones: T.Bone[] = [];
        model.traverse((o) => {
          if (o instanceof T.Bone) bones.push(o);
        });
        let neutral = bones.map((b) => ({
          q: b.quaternion.clone(),
          p: b.position.clone(),
        }));
        if (walk) {
          walk.play();
          this.mixer.setTime(0);
          neutral = bones.map((b) => ({
            q: b.quaternion.clone(),
            p: b.position.clone(),
          }));
          this.mixer.setTime(walk.getClip().duration / 2);
          bones.forEach((b, i) => {
            neutral[i].q.slerp(b.quaternion, 0.5);
            neutral[i].p.lerp(b.position, 0.5);
          });
          walk.stop();
        }
        for (const name of [
          "Idle",
          "Jump_Takeoff",
          "Jump_Rise",
          "Jump_Fall",
          "Jump_Land",
          "Repair",
          "Drive",
        ]) {
          const tracks: T.KeyframeTrack[] = [];
          bones.forEach((b, i) => {
            const q = neutral[i].q.clone(),
              pos = neutral[i].p.clone();
            if (name === "Drive") {
              if (/UpLeg/.test(b.name))
                q.multiply(
                  new T.Quaternion().setFromAxisAngle(
                    new T.Vector3(1, 0, 0),
                    -1.25,
                  ),
                );
              if (/^(LeftLeg|RightLeg)$/.test(b.name))
                q.multiply(
                  new T.Quaternion().setFromAxisAngle(
                    new T.Vector3(1, 0, 0),
                    1.3,
                  ),
                );
              if (/^(LeftArm|RightArm)$/.test(b.name))
                q.multiply(
                  new T.Quaternion().setFromEuler(
                    new T.Euler(-0.65, 0, b.name === "LeftArm" ? 0.2 : -0.2),
                  ),
                );
              if (/ForeArm/.test(b.name))
                q.multiply(
                  new T.Quaternion().setFromAxisAngle(
                    new T.Vector3(1, 0, 0),
                    -0.65,
                  ),
                );
              if (b.name === "Hips") pos.y -= 0.3;
            }
            if (name.startsWith("Jump_") && /UpLeg/.test(b.name))
              q.multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(1, 0, 0),
                  name === "Jump_Rise"
                    ? b.name === "LeftUpLeg"
                      ? -0.75
                      : -0.4
                    : name === "Jump_Fall"
                      ? -0.15
                      : -0.5,
                ),
              );
            if (name.startsWith("Jump_") && /^(LeftLeg|RightLeg)$/.test(b.name))
              q.multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(1, 0, 0),
                  name === "Jump_Rise"
                    ? 0.85
                    : name === "Jump_Fall"
                      ? 0.3
                      : 0.8,
                ),
              );
            if (name.startsWith("Jump_") && /^(LeftArm|RightArm)$/.test(b.name))
              q.multiply(
                new T.Quaternion().setFromEuler(
                  new T.Euler(-0.45, 0, b.name === "LeftArm" ? 0.28 : -0.28),
                ),
              );
            if (name.startsWith("Jump_") && /ForeArm/.test(b.name))
              q.multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(1, 0, 0),
                  -0.5,
                ),
              );
            if (name === "Repair" && /^(LeftArm|RightArm)$/.test(b.name))
              q.multiply(
                new T.Quaternion().setFromEuler(
                  new T.Euler(-0.8, 0, b.name === "LeftArm" ? 0.25 : -0.25),
                ),
              );
            if (name === "Repair" && /ForeArm/.test(b.name))
              q.multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(1, 0, 0),
                  -0.55,
                ),
              );
            const q2 = q.clone();
            if (name === "Repair" && /ForeArm/.test(b.name))
              q2.multiply(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(0, 1, 0),
                  0.14,
                ),
              );
            tracks.push(
              new T.QuaternionKeyframeTrack(
                b.name + ".quaternion",
                [0, 0.8, 1.6],
                [...q.toArray(), ...q2.toArray(), ...q.toArray()],
              ),
            );
            tracks.push(
              new T.VectorKeyframeTrack(
                b.name + ".position",
                [0, 1.6],
                [...pos.toArray(), ...pos.toArray()],
              ),
            );
          });
          this.actions.set(
            name,
            this.mixer.clipAction(new T.AnimationClip(name, 1.6, tracks)),
          );
        }
        this.play("Idle");
        this.mixer.update(0);
        model.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(model, true);
        const scale = 2.05 / Math.max(0.1, bounds.max.y - bounds.min.y);
        model.scale.multiplyScalar(scale);
        model.position.y -= bounds.min.y * scale;
        // Source faces +Z; the FRONTIER controller faces -Z.
        model.rotation.y = Math.PI;
        model.traverse((o) => {
          if (!(o instanceof T.Mesh)) return;
          o.castShadow = o.receiveShadow = true;
          o.frustumCulled = false;
          if (/pistol|weapon/i.test(o.name)) o.visible = false;
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (m instanceof T.MeshStandardMaterial) {
              if (!m.roughnessMap) m.roughness = 0.66;
              m.envMapIntensity = 0.7;
            }
          }
        });
        this.root.add(model);
        this.loaded = true;
        onStatus("ready");
      },
      undefined,
      () => {
        if (!this.disposed) onStatus("error");
      },
    );
  }
  play(name: string) {
    if (name === this.current) return;
    const action = this.actions.get(name) || this.actions.get("Idle");
    if (!action) return;
    const previous = this.actions.get(this.current);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous)
      action.crossFadeFrom(
        previous,
        name.startsWith("Jump_") ? 0.08 : 0.18,
        false,
      );
    this.current = name;
  }
  update(
    dt: number,
    speed: number,
    grounded: boolean,
    landing: number,
    repair: boolean,
    verticalSpeed = 0,
    takeoff = 0,
    driving = false,
  ) {
    if (!this.loaded) return;
    this.play(
      driving
        ? "Drive"
        : jumpPhase(grounded, verticalSpeed, landing, takeoff) ||
            (repair
              ? "Repair"
              : speed > 3
                ? "Run"
                : speed > 0.15
                  ? "Walk"
                  : "Idle"),
    );
    const action = this.actions.get(this.current);
    if (action && (this.current === "Run" || this.current === "Walk"))
      action.timeScale = T.MathUtils.clamp(
        speed / (this.current === "Run" ? 4.5 : 2.1),
        0.3,
        1.3,
      );
    this.mixer?.update(dt);
  }
  reachHands(right: T.Vector3, left: T.Vector3) {
    const model = this.root.children[0];
    if (!this.loaded || !model) return;
    this.root.updateWorldMatrix(true, true);
    for (const side of ["Left", "Right"] as const) {
      const upper = model.getObjectByName(side + "Arm"),
        lower = model.getObjectByName(side + "ForeArm"),
        hand = model.getObjectByName(side + "Hand");
      if (!upper || !lower || !hand) continue;
      const pole = upper
        .getWorldPosition(new T.Vector3())
        .add(
          new T.Vector3(
            side === "Left" ? -0.6 : 0.6,
            -0.4,
            0.15,
          ).applyQuaternion(
            this.root.parent!.getWorldQuaternion(new T.Quaternion()),
          ),
        );
      reachArm(upper, lower, hand, side === "Left" ? left : right, pole);
    }
  }
  free(root: T.Object3D) {
    root.traverse((o) => {
      if (o instanceof T.SkinnedMesh) o.skeleton.dispose();
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const t of Object.values(m))
            if (t instanceof T.Texture) t.dispose();
          m.dispose();
        }
      }
    });
  }
  dispose() {
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.root.children[0]) this.mixer?.uncacheRoot(this.root.children[0]);
    // World disposes attached geometry and material; skeleton textures need their own cleanup.
    this.root.traverse((o) => {
      if (o instanceof T.SkinnedMesh) o.skeleton.dispose();
    });
  }
}
