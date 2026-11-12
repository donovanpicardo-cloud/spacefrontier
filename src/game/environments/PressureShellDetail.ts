import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Cosmetic hardware stays inside the existing exterior envelope. Parent is batched. */
export function pressureShellDetail(root: T.Group, paint: T.Material, metal: T.Material, dark: T.Material) {
  const add = (g: T.BufferGeometry, m: T.Material, x: number, y: number, z: number) => {
    const o = new T.Mesh(g, m); o.position.set(x,y,z);
    o.castShadow = o.receiveShadow = true; root.add(o); return o;
  };
  const box = (x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material) =>
    add(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.12),m,x,y,z);
  const tube = (points: number[][], radius: number, m: T.Material) =>
    add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),32,radius,8,false),m,0,0,0);
  for (const side of [-1,1]) {
    // Raised hoop stiffeners and saddle mounts articulate the pressure hull.
    for (const x of [3.06,5.66,6.82]) {
      const ring=add(new T.TorusGeometry(2.135,.047,8,64),metal,side*x,2.16,-11.04);
      ring.rotation.y=Math.PI/2;
      for (const y of [.55,3.77]) box(side*x,y,-9.6,.23,.18,.19,dark);
    }
    // External heat exchanger: pitched fins cast real small-scale shadows.
    box(side*4.65,4.33,-11.05,3.4,.16,1.45,dark);
    for(let i=0;i<22;i++) {
      const fin=box(side*4.65-1.55+i*.147,4.47,-11.05,.065,.25,1.3,metal);
      fin.rotation.z=.16;
    }
    for(const z of [-11.67,-10.43]) tube([[side*3.1,4.56,z],[side*4.6,4.6,z],[side*6.2,4.56,z]],.05,metal);
    // Small equipment bay, layered connectors and protected conduit routing.
    box(side*6.2,1.18,-8.93,.82,.58,.22,dark);
    box(side*6.2,1.21,-8.78,.67,.4,.08,paint);
    for(let i=0;i<6;i++) box(side*6.2-.23+i*.09,1.19,-8.73,.026,.23,.025,dark);
    tube([[side*6.55,1,-8.89],[side*6.8,.7,-8.94],[side*6.8,.3,-9.3]],.043,dark);
    for(const y of [1.2,2,2.8]) {
      box(side*2.55,y,-9.15,.24,.36,.12,metal);
      for(const dy of [-.1,.1]) add(new T.SphereGeometry(.035,8,6),dark,side*2.55,y+dy,-9.07);
    }
    tube([[side*1.82,.35,-9.08],[side*1.82,2.9,-9.08],[side*1.45,3.52,-9.08],[side*.55,3.55,-9.08]],.045,metal);
  }
  // Readable service stencil establishes human scale without floating UI labels.
  const c=document.createElement("canvas"); c.width=1024;c.height=160;
  const ctx=c.getContext("2d")!;
  ctx.fillStyle="#152028";ctx.fillRect(0,0,1024,160);
  ctx.fillStyle="#d5dedb";ctx.font="500 60px monospace";ctx.fillText("HABITAT / 01",36,83);
  ctx.fillStyle="#a89674";ctx.font="22px monospace";ctx.fillText("PRESSURIZED  //  CREW ACCESS",39,126);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  add(new T.PlaneGeometry(1.9,.3),new T.MeshStandardMaterial({map,roughness:.7,metalness:.15}),0,4.73,-9.19);
}
