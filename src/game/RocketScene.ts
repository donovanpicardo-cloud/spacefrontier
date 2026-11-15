import * as T from "three";
import { paintModel } from "./environments/PainterlyMaterials";
import type { Destination } from "../simulation/engine";
import { rocketPad, flightPhase, FLIGHT_DURATION } from "./Rocket";
import { batchStatic, disposeBatchSources } from "./environments/StaticBatch";
export function rocketModel(destination: Destination) {
  const root = new T.Group(),
    sections = [new T.Group(), new T.Group(), new T.Group()];
  root.add(...sections);
  const paint = new T.MeshStandardMaterial({
    color: 0xe7e8df,
    metalness: 0.4,
    roughness: 0.36,
  });
  const steel = new T.MeshStandardMaterial({
    color: 0x586970,
    metalness: 0.82,
    roughness: 0.3,
  });
  const accent = new T.MeshStandardMaterial({
    color: destination === "moon" ? 0xd0ad62 : 0xc75e38,
    metalness: 0.45,
    roughness: 0.45,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x122c3b,
    metalness: 0.75,
    roughness: 0.22,
  });
  const add = (
    parent: T.Group,
    g: T.BufferGeometry,
    m: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  add(sections[0], new T.CylinderGeometry(0.78, 0.86, 3.7, 32), paint, 0, 2.6);
  for (let n = 0; n < 10; n++)
    add(
      sections[0],
      new T.TorusGeometry(0.795, 0.022, 6, 32),
      steel,
      0,
      1 + n * 0.34,
    ).rotation.x = Math.PI / 2;
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const x = Math.sin(angle),
      z = Math.cos(angle);
    const leg = add(
      sections[0],
      new T.CylinderGeometry(0.045, 0.065, 2, 8),
      steel,
      x * 1.05,
      1.1,
      z * 1.05,
    );
    leg.rotation.z = -z * 0.4;
    leg.rotation.x = x * 0.4;
    add(
      sections[0],
      new T.CylinderGeometry(0.26, 0.3, 0.09, 16),
      steel,
      x * 1.5,
      0.15,
      z * 1.5,
    );
    add(
      sections[0],
      new T.BoxGeometry(0.085, 2.5, 0.07),
      accent,
      x * 0.8,
      2.6,
      z * 0.8,
    ).rotation.y = angle;
  }
  add(sections[1], new T.CylinderGeometry(0.8, 0.8, 2.2, 32), paint, 0, 5.5);
  for (const y of [4.4, 6.5])
    add(
      sections[1],
      new T.CylinderGeometry(0.83, 0.83, 0.12, 32),
      accent,
      0,
      y,
    );
  const engines = destination === "mars" ? 3 : 1;
  for (let i = 0; i < engines; i++) {
    const a = (i * Math.PI * 2) / engines,
      x = engines === 1 ? 0 : Math.sin(a) * 0.48,
      z = engines === 1 ? 0 : Math.cos(a) * 0.48;
    add(
      sections[1],
      new T.CylinderGeometry(0.2, 0.38, 0.65, 24, 1, true),
      steel,
      x,
      0.48,
      z,
    );
    for (let n = 0; n < 5; n++)
      add(
        sections[1],
        new T.TorusGeometry(0.23 + n * 0.025, 0.015, 5, 24),
        accent,
        x,
        0.7 - n * 0.09,
        z,
      ).rotation.x = Math.PI / 2;
  }
  add(sections[2], new T.CylinderGeometry(0.4, 0.8, 1.7, 32), paint, 0, 7.45);
  add(
    sections[2],
    new T.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    paint,
    0,
    8.3,
  );
  add(
    sections[2],
    new T.CylinderGeometry(0.81, 0.81, 0.12, 32),
    steel,
    0,
    6.65,
  );
  for (const x of [-0.33, 0.33]) {
    const window = add(
      sections[2],
      new T.CircleGeometry(0.14, 20),
      dark,
      x,
      7.4,
      0.66,
    );
    window.rotation.y = x * 0.6;
    const rim = add(
      sections[2],
      new T.TorusGeometry(0.15, 0.025, 6, 20),
      steel,
      x,
      7.4,
      0.67,
    );
    rim.rotation.y = x * 0.6;
  }
  for (const z of [-0.76, 0.76])
    add(sections[1], new T.BoxGeometry(0.25, 0.6, 0.06), dark, 0, 5.6, z);
  sections.forEach(batchStatic);
  const flame = new T.Group();
  flame.userData.noCollision = true;
  root.add(flame);
  flame.visible = false;
  for (let i = 0; i < 2; i++) {
    const material = new T.MeshBasicMaterial({
      color: i ? 0xffd789 : 0x72dfff,
      transparent: true,
      opacity: i ? 0.55 : 0.9,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    const plume = new T.Mesh(
      new T.ConeGeometry(i ? 0.5 : 0.24, i ? 3.8 : 2.6, 20),
      material,
    );
    plume.rotation.z = Math.PI;
    plume.position.y = i ? -1.6 : -1;
    flame.add(plume);
  }
  return { root, sections, flame };
}
export class RocketScene {
  model: ReturnType<typeof rocketModel>;
  pad = new T.Group();
  flight: {
    elapsed: number;
    phase: string;
    space: T.Scene;
    ship: ReturnType<typeof rocketModel>;
    earth: T.Mesh;
    departure: T.Mesh;
    stars: T.Points;
    complete: () => void;
  } | null = null;
  stage = -1;
  bounds: T.Box3[];
  constructor(
    public scene: T.Scene,
    public destination: Destination,
    ground: (x: number, z: number) => number,
  ) {
    this.pad.position.set(
      rocketPad.x,
      ground(rocketPad.x, rocketPad.z),
      rocketPad.z,
    );
    scene.add(this.pad);
    const platform = new T.Mesh(
      new T.CylinderGeometry(3.9, 4, 0.12, 48),
      new T.MeshStandardMaterial({
        color: 0x354953,
        metalness: 0.6,
        roughness: 0.65,
      }),
    );
    platform.position.y = 0.06;
    platform.receiveShadow = true;
    this.pad.add(platform);
    const ring = new T.Mesh(
      new T.TorusGeometry(3.5, 0.055, 6, 64),
      new T.MeshBasicMaterial({ color: 0xe4c17d }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.13;
    this.pad.add(ring);
    this.model = rocketModel(destination);
    this.pad.add(this.model.root);
    // A simple solid hull keeps the pad physical without expensive per-triangle moving colliders.
    this.bounds = [
      new T.Box3(
        new T.Vector3(
          rocketPad.x - 1.7,
          this.pad.position.y,
          rocketPad.z - 1.7,
        ),
        new T.Vector3(
          rocketPad.x + 1.7,
          this.pad.position.y + 8.7,
          rocketPad.z + 1.7,
        ),
      ),
    ];
    this.sync(0);
  }
  sync(stage: number) {
    if (this.stage === stage) return;
    this.stage = stage;
    this.model.sections.forEach((s, i) => (s.visible = i < stage));
  }
  start(complete: () => void) {
    if (this.flight || this.stage !== 3) return false;
    const space = new T.Scene();
    space.background = new T.Color(0x02050d);
    space.add(new T.HemisphereLight(0xc2dcff, 0x071020, 1.1));
    const sun = new T.DirectionalLight(0xfff2da, 3);
    sun.position.set(-80, 70, 90);
    space.add(sun);
    const texture = new T.TextureLoader().load("/materials/earth-nasa.jpg");
    texture.colorSpace = T.SRGBColorSpace;
    const earth = new T.Mesh(
      new T.SphereGeometry(38, 64, 40),
      new T.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.05,
      }),
    );
    earth.position.set(12, 0, -250);
    earth.rotation.y = 1;
    space.add(earth);
    const atmosphere = new T.Mesh(
      new T.SphereGeometry(38.7, 48, 32),
      new T.ShaderMaterial({
        transparent: true,
        side: T.BackSide,
        depthWrite: false,
        blending: T.AdditiveBlending,
        vertexShader:
          "varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "varying vec3 n; varying vec3 v; void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.12,.46,1.,rim*.7);}",
      }),
    );
    earth.add(atmosphere);
    const departure = new T.Mesh(
      new T.SphereGeometry(62, 48, 32),
      new T.MeshStandardMaterial({
        color: this.destination === "moon" ? 0x797e83 : 0xa45738,
        roughness: 1,
      }),
    );
    departure.position.set(-25, -78, 70);
    space.add(departure);
    const positions = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const a = i * 2.399963,
        h = 1 - (2 * (i + 0.5)) / 1800,
        r = Math.sqrt(1 - h * h);
      positions.set(
        [Math.cos(a) * r * 580, h * 580, Math.sin(a) * r * 580 - 130],
        i * 3,
      );
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(positions, 3));
    const stars = new T.Points(
      g,
      new T.PointsMaterial({
        color: 0xd2e5ff,
        size: 0.65,
        sizeAttenuation: true,
      }),
    );
    space.add(stars);
    const ship = rocketModel(this.destination);
    paintModel(ship.root);
    ship.sections.forEach((s) => (s.visible = true));
    space.add(ship.root);
    this.flight = {
      elapsed: 0,
      phase: "countdown",
      space,
      ship,
      earth,
      departure,
      stars,
      complete,
    };
    return true;
  }
  update(
    dt: number,
    camera: T.PerspectiveCamera,
    renderer: T.WebGLRenderer,
    paused: boolean,
    reducedMotion: boolean,
  ) {
    const f = this.flight;
    if (!f) return;
    if (!paused) f.elapsed = Math.min(FLIGHT_DURATION, f.elapsed + dt);
    const t = f.elapsed,
      phase = flightPhase(t);
    f.phase = phase;
    camera.fov = 48;
    camera.updateProjectionMatrix();
    if (t < 13) {
      const a = Math.max(0, t - 4),
        height = a * a * (this.destination === "moon" ? 0.8 : 1);
      this.model.root.position.set(a * a * 0.12, height, 0);
      this.model.root.rotation.z = -a * 0.025;
      this.model.flame.visible = t > 3.4;
      this.model.flame.scale.y =
        0.8 + (reducedMotion ? 0 : Math.sin(t * 22) * 0.08);
      const target = this.pad.position
        .clone()
        .add(this.model.root.position)
        .add(new T.Vector3(0, 4.5, 0));
      camera.position
        .copy(target)
        .add(new T.Vector3(15 + Math.min(a, 4), 4, 20));
      camera.lookAt(target);
      renderer.render(this.scene, camera);
    } else {
      const u = T.MathUtils.clamp((t - 13) / (FLIGHT_DURATION - 13), 0, 1),
        e = u * u * (3 - 2 * u);
      f.ship.root.position.set(
        -12 + 24 * e,
        5 * Math.sin(u * Math.PI),
        20 - 218 * e,
      );
      f.ship.root.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        new T.Vector3(0.11, 0, -1).normalize(),
      );
      f.ship.flame.visible = t < 32;
      f.ship.flame.scale.y = 0.65;
      if (t > 22) f.ship.sections[0].position.y = -Math.min(35, (t - 22) * 3);
      f.earth.rotation.y += paused ? 0 : dt * 0.012;
      camera.position.copy(f.ship.root.position).add(new T.Vector3(12, 7, 24));
      camera.lookAt(f.ship.root.position.clone().add(new T.Vector3(0, 1, -7)));
      renderer.render(f.space, camera);
    }
    if (phase === "complete") {
      const done = f.complete;
      f.complete = () => {};
      done();
    }
  }
  stop() {
    this.model.root.position.set(0, 0, 0);
    this.model.root.rotation.set(0, 0, 0);
    this.model.flame.visible = false;
    if (this.flight) {
      disposeBatchSources(this.flight.space);
      this.flight.space.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Points) {
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
      this.flight = null;
    }
  }
}

