import * as T from "three";

/** Smooth dished bulkheads, not flat cylinder caps. Axis is local Y. */
export function pressureVesselGeometry() {
  const profile = [
    [0, -2.35], [.52, -2.32], [1.05, -2.22], [1.55, -2.02],
    [1.88, -1.75], [2.04, -1.4], [2.07, -1.1],
    [2.07, 1.1], [2.04, 1.4], [1.88, 1.75], [1.55, 2.02],
    [1.05, 2.22], [.52, 2.32], [0, 2.35],
  ].map(([r, y]) => new T.Vector2(r, y));
  const curve = new T.SplineCurve(profile);
  return new T.LatheGeometry(curve.getPoints(64), 64);
}

/** Open-bottom rounded pressure collar; the existing doorway remains clear. */
export function pressureCollar(width: number, height: number, holeW: number, holeH: number) {
  const s = new T.Shape();
  s.moveTo(-width, 0);
  s.lineTo(-width, height * .47);
  s.bezierCurveTo(-width, height * .82, -width * .66, height, 0, height);
  s.bezierCurveTo(width * .66, height, width, height * .82, width, height * .47);
  s.lineTo(width, 0);
  s.lineTo(holeW, 0);
  s.lineTo(holeW, holeH * .68);
  s.bezierCurveTo(holeW, holeH * .91, holeW * .65, holeH, 0, holeH);
  s.bezierCurveTo(-holeW * .65, holeH, -holeW, holeH * .91, -holeW, holeH * .68);
  s.lineTo(-holeW, 0);
  s.closePath();
  return s;
}

/** Non-colliding upper insulation shell, entirely above the existing cabin. */
export function vaultedHabitat(root: T.Group, skin: T.Material, metal: T.Material, dark: T.Material) {
  const add = (g: T.BufferGeometry, m: T.Material) => {
    const mesh = new T.Mesh(g, m);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const rise = (z: number) => 1.35 * Math.sin(Math.min(1, Math.max(0, (-z - 10.6) / 4)) * Math.PI / 2) * Math.sin(Math.min(1, Math.max(0, (z + 34.1) / 3)) * Math.PI / 2);
  const section = (z: number, offset = 0) => Array.from({length: 49}, (_, i) => {
    const a = i / 48 * Math.PI;
    return new T.Vector3(7.14 * Math.cos(a), 4.43 + rise(z) * Math.sin(a) + offset, z);
  });
  for (let bay = 0; bay < 6; bay++) {
    const front = -10.7 - bay * 3.88;
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let row = 0; row <= 12; row++) {
      const points = section(front - row / 12 * 3.84);
      for (let i = 0; i < points.length; i++) {
        vertices.push(...points[i].toArray()); uv.push(i / 48 * 3, row / 12);
        if (row < 12 && i < 48) { const n = row * 49 + i; indices.push(n,n+49,n+1,n+49,n+50,n+1); }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices,3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv,2));
    g.setIndex(indices); g.computeVertexNormals();
    add(g,skin);
    add(new T.TubeGeometry(new T.CatmullRomCurve3(section(front,.045)),64,.065,8,false),metal);
  }
  // Segmented thermal blankets follow the crown, with longitudinal seam rails.
  for (const a of [.42,.85,Math.PI-.85,Math.PI-.42]) {
    const points = Array.from({length:65},(_,i)=>{
      const z=-10.7-i/64*23.24;
      return new T.Vector3(7.14*Math.cos(a),4.43+rise(z)*Math.sin(a)+.025,z);
    });
    add(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,.025,6,false),dark);
  }
}

