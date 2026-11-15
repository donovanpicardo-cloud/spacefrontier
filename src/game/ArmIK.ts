import * as T from "three";
/** Two-bone reach in world space; rotations remain on the existing skinned rig. */
export function reachArm(
  upper: T.Object3D,
  lower: T.Object3D,
  hand: T.Object3D,
  target: T.Vector3,
  pole: T.Vector3,
) {
  const s = upper.getWorldPosition(new T.Vector3()),
    e = lower.getWorldPosition(new T.Vector3()),
    h = hand.getWorldPosition(new T.Vector3());
  const a = s.distanceTo(e),
    b = e.distanceTo(h);
  if (a < 0.001 || b < 0.001) return;
  const dir = target.clone().sub(s),
    length = T.MathUtils.clamp(
      dir.length(),
      Math.abs(a - b) + 0.001,
      a + b - 0.002,
    );
  dir.normalize();
  const bend = pole.clone().sub(s);
  bend.addScaledVector(dir, -bend.dot(dir));
  if (bend.lengthSq() < 0.0001) bend.set(0, -1, 0.1);
  bend.normalize();
  const along = (a * a + length * length - b * b) / (2 * length),
    height = Math.sqrt(Math.max(0, a * a - along * along));
  const elbow = s
      .clone()
      .addScaledVector(dir, along)
      .addScaledVector(bend, height),
    end = s.clone().addScaledVector(dir, length);
  function rotate(bone: T.Object3D, from: T.Vector3, to: T.Vector3) {
    const delta = new T.Quaternion().setFromUnitVectors(
      from.normalize(),
      to.normalize(),
    );
    const q = delta.multiply(bone.getWorldQuaternion(new T.Quaternion()));
    const parent =
      bone.parent?.getWorldQuaternion(new T.Quaternion()) || new T.Quaternion();
    bone.quaternion.copy(parent.invert().multiply(q));
    bone.updateWorldMatrix(false, true);
  }
  rotate(upper, e.clone().sub(s), elbow.clone().sub(s));
  const e2 = lower.getWorldPosition(new T.Vector3()),
    h2 = hand.getWorldPosition(new T.Vector3());
  rotate(lower, h2.sub(e2), end.sub(e2));
}

