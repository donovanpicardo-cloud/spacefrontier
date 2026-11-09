import * as T from "three";
export function outpostDetail(scene: T.Scene, mars: boolean) {
  const root = new T.Group();
  scene.add(root);
  const metal = new T.MeshStandardMaterial({
    color: 0x293e47,
    metalness: 0.75,
    roughness: 0.36,
  });
  const gold = new T.MeshStandardMaterial({
    color: 0xe9a957,
    metalness: 0.65,
    roughness: 0.37,
  });
  const light = new T.MeshStandardMaterial({
    color: 0xc5f5e9,
    emissive: 0x96dac8,
    emissiveIntensity: 1.1,
  });
  const add = (
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    root.add(o);
    return o;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
  ) => add(new T.BoxGeometry(w, h, d), m, x, y, z);
  // Inset portholes, pressure-panel seams and readable exterior signage.
  for (const x of [-5.2, -3.25, 3.25, 5.2]) {
    add(new T.TorusGeometry(0.55, 0.07, 8, 32), metal, x, 2.45, -9.83);
    const glass = new T.MeshPhysicalMaterial({
      color: 0x20424e,
      metalness: 0.45,
      roughness: 0.12,
      clearcoat: 1,
      emissive: 0x375a60,
      emissiveIntensity: 0.16,
    });
    const porthole = add(new T.CircleGeometry(0.5, 32), glass, x, 2.45, -9.81);
    porthole.castShadow = false;
    box(x, 1.44, -9.84, 1.55, 0.025, 0.035, metal);
    for (const dx of [-0.72, 0.72])
      box(x + dx, 2.05, -9.86, 0.025, 2.3, 0.04, metal);
    box(x, 3.45, -9.78, 0.8, 0.035, 0.07, light);
  }
  const sign = document.createElement("canvas");
  sign.width = 1024;
  sign.height = 128;
  const ctx = sign.getContext("2d")!;
  ctx.fillStyle = "#142932";
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = "#f2d28b";
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FRONTIER  /  " + (mars ? "ARES" : "LUNA") + "  01", 512, 82);
  const tex = new T.CanvasTexture(sign);
  tex.colorSpace = T.SRGBColorSpace;
  add(
    new T.PlaneGeometry(5.2, 0.65),
    new T.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.22,
    }),
    0,
    3.68,
    -9.64,
  );
  // Cable to the array: functional equipment ties the buildings to their setting.
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(6.9, 0.18, -11),
    new T.Vector3(9, 0.18, -10),
    new T.Vector3(10, 0.18, -6),
    new T.Vector3(12, 0.18, -5),
  ]);
  root.add(new T.Mesh(new T.TubeGeometry(curve, 32, 0.045, 6, false), gold));
  return root;
}
