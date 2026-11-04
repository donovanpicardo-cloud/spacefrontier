import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Destination } from "../simulation/engine";

// Local, deterministic assets: no network requests, model downloads, or postprocessing.
function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function releaseModel(root: T.Object3D) {
  root.traverse(object => {
    if (!(object instanceof T.Mesh || object instanceof T.Points)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof T.Texture) value.dispose();
      material.dispose();
    }
  });
}
function spacecraft() {
  const ship = new T.Group();
  const white = new T.MeshStandardMaterial({
    color: 0xd7dedb,
    metalness: 0.6,
    roughness: 0.35,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x202d38,
    metalness: 0.8,
    roughness: 0.32,
  });
  const gold = new T.MeshStandardMaterial({
    color: 0xc49c59,
    metalness: 0.75,
    roughness: 0.45,
  });
  const blue = new T.MeshStandardMaterial({
    color: 0x173e6b,
    metalness: 0.65,
    roughness: 0.3,
  });
  const add = (
    geometry: T.BufferGeometry,
    material: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    ship.add(mesh);
    return mesh;
  };
  add(new T.CylinderGeometry(0.66, 0.84, 2.6, 12), white).rotation.x =
    Math.PI / 2;
  const nose = add(new T.ConeGeometry(0.66, 1.05, 12), white, 0, 0, -1.8);
  nose.rotation.x = -Math.PI / 2;
  add(new T.BoxGeometry(0.7, 0.12, 0.6), dark, 0, 0.58, -1.1).rotation.x =
    -0.15;
  add(
    new T.CylinderGeometry(0.87, 0.87, 0.45, 12),
    gold,
    0,
    0,
    0.7,
  ).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    add(new T.BoxGeometry(3.3, 0.09, 0.12), gold, side * 1.8, 0, 0.4);
    add(new T.BoxGeometry(2.3, 0.07, 1.9), blue, side * 2.1, 0, 0.4);
    for (let i = 0; i < 7; i++)
      add(
        new T.BoxGeometry(0.018, 0.085, 1.9),
        gold,
        side * 2.1 - 1.1 + i * 0.36,
        0,
        0.4,
      );
    for (const z of [-0.5, 0.1, 0.7, 1.3])
      add(new T.BoxGeometry(2.3, 0.085, 0.018), gold, side * 2.1, 0, z);
    add(
      new T.BoxGeometry(0.12, 0.12, 1.8),
      dark,
      side * 0.72,
      -0.42,
      0.7,
    ).rotation.x = -0.4;
    add(new T.SphereGeometry(0.17, 8, 6), gold, side * 0.72, -0.75, 1.5);
    add(
      new T.CylinderGeometry(0.2, 0.32, 0.6, 12, 1, true),
      dark,
      side * 0.4,
      -0.25,
      1.5,
    ).rotation.x = Math.PI / 2;
  }
  add(new T.CylinderGeometry(0.025, 0.025, 1.2, 6), gold, 0, 1, 0.4);
  add(
    new T.SphereGeometry(0.28, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    white,
    0,
    1.6,
    0.4,
  ).rotation.x = 0.5;
  const flame = add(
    new T.ConeGeometry(0.38, 2.4, 12),
    new T.MeshBasicMaterial({
      color: 0x8ddcff,
      transparent: true,
      opacity: 0.75,
    }),
    0,
    -0.1,
    2.6,
  );
  flame.rotation.x = Math.PI / 2;
  const fire = add(
    new T.ConeGeometry(0.65, 3, 10),
    new T.MeshBasicMaterial({
      color: 0xff843b,
      transparent: true,
      opacity: 0.65,
    }),
    0,
    0,
    2.7,
  );
  fire.rotation.x = Math.PI / 2;
  fire.visible = false;
  return { ship, flame, fire };
}

export class ArrivalScene {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(42, 1, 0.1, 1800);
  planets: T.Mesh[] = [];
  craft = spacecraft();
  ground: T.Mesh;
  dust: T.Points;
  destination: Destination | null = null;
  elapsed = 0;
  landed = false;
  reduced = false;
  private frame = 0;
  private last = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private selectionLayout: { x: number; y: number; scale: number }[] = [];
  private surfaceBackground = new T.Color();
  private surfaceFog = new T.FogExp2(0x05080d, 0.012);
  private settled = false;
  constructor(
    private host: HTMLDivElement,
    private onTime: (seconds: number) => void,
    private onEnd: () => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: window.devicePixelRatio <= 1.5,
      alpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x03070e);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    host.appendChild(this.renderer.domElement);
    this.scene.add(new T.HemisphereLight(0xaec5e1, 0x30221b, 1.5));
    const sunlight = new T.DirectionalLight(0xffe4c6, 4);
    sunlight.position.set(-12, 8, 10);
    this.scene.add(sunlight);
    const rng = random(71),
      points = new Float32Array(1500 * 3);
    for (let i = 0; i < points.length; i++) points[i] = (rng() - 0.5) * 900;
    const stars = new T.BufferGeometry();
    stars.setAttribute("position", new T.BufferAttribute(points, 3));
    this.scene.add(
      new T.Points(
        stars,
        new T.PointsMaterial({
          color: 0xc8d7ed,
          size: 0.6,
          sizeAttenuation: true,
        }),
      ),
    );
    for (const mars of [false, true]) {
      const material = new T.MeshStandardMaterial({ color: mars ? 0xae6440 : 0xffffff, roughness: 1 });
      const planet = new T.Mesh(new T.SphereGeometry(1.7, 128, 80), material);
      if (mars) {
        this.loadModel("/models/mars-globe.glb", 3.4, model => {
          material.visible = false;
          planet.add(model);
        });
      } else {
        const loader = new T.TextureLoader();
        material.map = loader.load("/materials/lro-moon.jpg");
        material.map.colorSpace = T.SRGBColorSpace;
        material.bumpMap = loader.load("/materials/lro-relief.jpg");
        material.bumpScale = 0.025;
      }
      planet.position.set(mars ? 2.65 : -2.65, 0.2, 0);
      planet.rotation.z = mars ? 0.25 : -0.12;
      this.planets.push(planet);
      this.scene.add(planet);
      if (mars) {
        const halo = new T.Mesh(
          new T.SphereGeometry(1.735, 48, 32),
          new T.MeshBasicMaterial({
            color: 0xcb7950,
            transparent: true,
            opacity: 0.07,
            side: T.BackSide,
          }),
        );
        planet.add(halo);
      }
    }
    this.scene.add(this.craft.ship);
    this.craft.ship.visible = false;
    const terrain = new T.PlaneGeometry(250, 250, 64, 64);
    terrain.rotateX(-Math.PI / 2);
    const vertices = terrain.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        z = vertices.getZ(i);
      vertices.setY(
        i,
        Math.sin(x * 0.08) * Math.cos(z * 0.1) * 3 + rng() * 0.5,
      );
    }
    terrain.computeVertexNormals();
    this.ground = new T.Mesh(
      terrain,
      new T.MeshStandardMaterial({
        color: 0x777776,
        roughness: 1,
        flatShading: true,
      }),
    );
    this.ground.visible = false;
    this.scene.add(this.ground);
    const debris = new Float32Array(160 * 3);
    for (let i = 0; i < debris.length; i++) debris[i] = (rng() - 0.5) * 16;
    const dustGeometry = new T.BufferGeometry();
    dustGeometry.setAttribute("position", new T.BufferAttribute(debris, 3));
    this.dust = new T.Points(
      dustGeometry,
      new T.PointsMaterial({
        color: 0xbdaa93,
        size: 0.25,
        transparent: true,
        opacity: 0.6,
      }),
    );
    this.dust.visible = false;
    this.scene.add(this.dust);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    host.parentElement
      ?.querySelectorAll(".arrival-world-visual")
      .forEach((element) => this.observer.observe(element));
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }
  private resize() {
    this.settled = false;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const bounds = this.host.getBoundingClientRect();
    const halfHeight = Math.tan(T.MathUtils.degToRad(42 / 2)) * 14;
    this.selectionLayout = Array.from(
      this.host.parentElement?.querySelectorAll(".arrival-world-visual") ?? [],
    ).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x:
          (((rect.left + rect.width / 2 - bounds.left) / w) * 2 - 1) *
          halfHeight *
          this.camera.aspect,
        y:
          (1 - ((rect.top + rect.height / 2 - bounds.top) / h) * 2) *
          halfHeight,
        scale:
          ((Math.min(rect.height * 0.87, rect.width * 0.85) / h) * halfHeight) /
          1.7,
      };
    });
  }
  private loadModel(url: string, width: number, attach: (root: T.Group) => void) {
    new GLTFLoader().load(url, ({ scene }) => {
      if (this.disposed) return releaseModel(scene);
      const box = new T.Box3().setFromObject(scene);
      const size = box.getSize(new T.Vector3());
      const scale = width / Math.max(size.x, size.y, size.z);
      scene.scale.multiplyScalar(scale);
      scene.position.sub(box.getCenter(new T.Vector3()).multiplyScalar(scale));
      attach(scene);
    }, undefined, () => { /* The local fallback stays visible. */ });
  }
  choose(destination: Destination, reduced: boolean) {
    if (!reduced) {
      const file = destination === "moon" ? "apollo-lunar-module" : "insight";
      this.loadModel("/models/" + file + ".glb", 6.5, model => {
        const { ship, flame, fire } = this.craft;
        for (const part of ship.children) part.visible = part === flame || part === fire;
        ship.add(model);
      });
    }
    this.destination = destination;
    this.elapsed = 0;
    this.reduced = reduced;
    (this.ground.material as T.MeshStandardMaterial).color.set(
      destination === "mars" ? 0x9c5032 : 0x777776,
    );
    if (reduced) this.finish();
  }
  finish() {
    if (this.landed) return;
    this.elapsed = 24;
    this.landed = true;
    this.onTime(24);
    this.onEnd();
  }
  private animate = (now: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.06) : 0;
    this.last = now;
    if (document.hidden) return;
    if (this.landed && this.settled) return;
    if (!this.destination) {
      this.camera.position.set(0, 0, 14);
      this.camera.lookAt(0, 0, 0);
      this.planets.forEach((planet, i) => {
        const layout = this.selectionLayout[i];
        if (layout) {
          planet.position.set(layout.x, layout.y, 0);
          planet.scale.setScalar(layout.scale);
        }
        if (!this.reduced) planet.rotation.y += dt * 0.055;
      });
    } else {
      if (!this.landed) {
        this.elapsed += dt;
        this.onTime(this.elapsed);
        if (this.elapsed >= 24) this.finish();
      }
      const t = this.elapsed,
        mars = this.destination === "mars";
      const selected = this.planets[mars ? 1 : 0];
      this.planets.forEach((p) => (p.visible = p === selected && t < 18));
      this.craft.ship.visible = true;
      if (t < 18) {
        const descent = T.MathUtils.smoothstep(t, 10, 18);
        selected.position.set(0, -15 - descent * 13, -32 + descent * 6);
        selected.scale.setScalar(15 + descent * 10);
        selected.rotation.y += dt * 0.015;
        this.craft.ship.position.set(
          Math.sin(t * 0.3) * 0.5,
          1 - descent * 2,
          0,
        );
        this.craft.ship.rotation.set(
          t > 6 ? Math.sin(t * 1.5) * 0.14 : 0.04,
          -0.3 + t * 0.015,
          t > 6 ? Math.sin(t * 2) * 0.22 : -0.12,
        );
        this.camera.position.set(
          8 - descent * 3 - Math.sin(t * 0.13) * 1.4,
          4 + descent,
          12 - descent * 3,
        );
        this.camera.lookAt(0, -0.8, -2);
        this.craft.flame.visible = t < 6 || (t > 11 && Math.sin(t * 16) > 0.25);
        this.craft.flame.scale.y = 0.8 + Math.sin(t * 30) * 0.12;
        this.craft.fire.visible = t > 8;
        this.craft.fire.scale.setScalar(0.5 + Math.abs(Math.sin(t * 19)) * 0.5);
      } else {
        this.ground.visible = true;
        this.surfaceBackground.set(mars ? 0x3b231e : 0x05080d);
        this.surfaceFog.color.copy(this.surfaceBackground);
        this.scene.background = this.surfaceBackground;
        this.scene.fog = this.surfaceFog;
        const fall = T.MathUtils.smoothstep(t, 18, 20);
        this.craft.ship.position.set(0, 12 * (1 - fall) + 1.2, -8 * (1 - fall));
        this.craft.ship.rotation.set(0.1, -0.5, -0.45 * fall);
        this.craft.flame.visible = false;
        this.craft.fire.visible = t < 21;
        this.camera.position.set(12, 5, 17);
        this.camera.lookAt(0, this.camera.aspect < 0.85 ? -3 : 2, 0);
        if (t > 20 && t < 21 && !this.reduced)
          this.camera.position.x += Math.sin(t * 65) * 0.22 * (21 - t);
        this.dust.visible = t >= 20;
        this.dust.position.set(0, 1, 0);
        this.dust.scale.setScalar(1 + Math.max(0, t - 20) * 0.3);
        (this.dust.material as T.PointsMaterial).opacity = Math.max(
          0.08,
          0.6 - Math.max(0, t - 20) * 0.13,
        );
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.settled = this.landed;
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.disposed = true;
    releaseModel(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
