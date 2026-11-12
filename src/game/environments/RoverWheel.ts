import * as T from "three";


export function roverWheel(radius: number, width: number) {
  const root = new T.Group();
  const rubber = new T.MeshStandardMaterial({ color: 0x252c32, roughness: .92 });
  const alloy = new T.MeshStandardMaterial({ color: 0x9caab5, roughness: .32, metalness: .82 });
  const recess = new T.MeshStandardMaterial({ color: 0x303841, roughness: .9 });
  const profile = [
    [.56, -.48], [.79, -.51], [.9, -.47], [.97, -.36], [1, -.22],
    [1, .22], [.97, .36], [.9, .47], [.79, .51], [.56, .48], [.56, -.48],
  ].map(([r, x]) => new T.Vector2(r * radius, x * width));
  const tire = new T.Mesh(new T.LatheGeometry(profile, 48), rubber);
  tire.rotation.z = -Math.PI / 2;
  root.add(tire);
  for (const side of [-1, 1]) {
    const hub = new T.Mesh(new T.CylinderGeometry(.62 * radius, .62 * radius, .055, 40), alloy);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = side * width * .44;
    const inset = new T.Mesh(new T.CylinderGeometry(.41 * radius, .41 * radius, .035, 32), recess);
    inset.rotation.z = Math.PI / 2;
    inset.position.x = side * width * .54;
    const cap = new T.Mesh(new T.CylinderGeometry(.21 * radius, .25 * radius, .04, 24), alloy);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * width * .59;
    root.add(hub, inset, cap);
  }
  const tread = new T.InstancedMesh(new T.BoxGeometry(width * .34, radius * .047, radius * .114), rubber, 64);
  const stamp = new T.Object3D();
  for (let i = 0; i < tread.count; i++) {
    const side = i % 2 ? 1 : -1;
    const angle = (i + .27 * side) * Math.PI / 32;
    stamp.position.set(side * width * .206, radius * Math.cos(angle), radius * Math.sin(angle));
    stamp.rotation.set(angle, side * .24, 0);
    stamp.updateMatrix();
    tread.setMatrixAt(i, stamp.matrix);
  }
  root.add(tread);
  root.traverse(object => { if (object instanceof T.Mesh) object.castShadow = object.receiveShadow = true; });
  return root;
}

export function fenderGeometry(radius: number, width: number) {
  const points = [
    [radius - .026, -width / 2], [radius, -width / 2], [radius + .028, -width * .35],
    [radius + .034, width * .35], [radius, width / 2], [radius - .026, width / 2],
    [radius - .026, -width / 2],
  ].map(([r, x]) => new T.Vector2(r, x));
  return new T.LatheGeometry(points, 40, Math.PI + .39, Math.PI - .78).rotateZ(-Math.PI / 2);
}
