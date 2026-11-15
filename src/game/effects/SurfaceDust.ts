import * as T from "three";
export class SurfaceDust {
  geometry = new T.BufferGeometry();
  positions = new Float32Array(240 * 3);
  life = new Float32Array(240);
  velocities = new Float32Array(240 * 3);
  next = 0;
  points: T.Points;
  constructor(
    scene: T.Scene,
    public mars: boolean,
  ) {
    this.geometry.setAttribute(
      "position",
      new T.BufferAttribute(this.positions, 3),
    );
    this.geometry.setAttribute("life", new T.BufferAttribute(this.life, 1));
    const material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { color: { value: new T.Color(mars ? 0xc79874 : 0xa5b0bf) }, spread: { value: mars ? 115 : 58 } },
      vertexShader:
        "uniform float spread; attribute float life; varying float alpha; void main(){alpha=life;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(spread*(.3+sin(life*3.14159)*.7)/max(1.,-p.z),1.,32.);}",
      fragmentShader:
        "uniform vec3 color;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,(1.-d)*(1.-d)*alpha*alpha*.21);}",
    });
    this.points = new T.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  step(p: T.Vector3, yaw: number) {
    for (let i = 0; i < 12; i++) {
      const n = this.next++ % 240,
        j = n * 3;
      this.positions[j] = p.x + (Math.random() - 0.5) * 0.35;
      this.positions[j + 1] = p.y - 0.1;
      this.positions[j + 2] = p.z + (Math.random() - 0.5) * 0.35;
      this.velocities[j] = Math.sin(yaw) * 0.3 + (Math.random() - 0.5) * 0.35;
      this.velocities[j + 1] = 0.2 + Math.random() * 0.35;
      this.velocities[j + 2] =
        Math.cos(yaw) * 0.3 + (Math.random() - 0.5) * 0.35;
      this.life[n] = 1;
    }
  }
  update(dt: number) {
    for (let i = 0; i < 240; i++) {
      if (this.life[i] <= 0) continue;
      const j = i * 3;
      this.life[i] = Math.max(0, this.life[i] - dt * 1.5);
      this.velocities[j + 1] -= (this.mars ? 3.71 : 1.62) * dt * 0.2;
      for (let k = 0; k < 3; k++)
        this.positions[j + k] += this.velocities[j + k] * dt;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.life.needsUpdate = true;
  }
}

