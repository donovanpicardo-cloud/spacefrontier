import * as T from "three";
import { isSharedPaintMap, paintScene } from "./environments/PainterlyMaterials";
import { modelClarity } from "./ModelClarity";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


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
        if (value instanceof T.Texture && !isSharedPaintMap(value)) value.dispose();
      material.dispose();
    }
  });
}
export class ArrivalScene {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(42, 1, 0.1, 1800);
  planets: T.Mesh[] = [];
  reduced = false;
  private frame = 0;
  private last = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private stopPainting: () => void;
  private selectionLayout: { x: number; y: number; scale: number }[] = [];
  constructor(private host: HTMLDivElement) {
    this.stopPainting = paintScene(this.scene);
    this.renderer = new T.WebGLRenderer({
      antialias: window.devicePixelRatio <= 1.5,
      alpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x171817);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
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
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    host.parentElement
      ?.querySelectorAll(".arrival-world-visual")
      .forEach((element) => this.observer.observe(element));
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }
  private resize() {
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
      modelClarity(scene);
      const size = box.getSize(new T.Vector3());
      const scale = width / Math.max(size.x, size.y, size.z);
      scene.scale.multiplyScalar(scale);
      scene.position.sub(box.getCenter(new T.Vector3()).multiplyScalar(scale));
      attach(scene);
    }, undefined, () => { /* The local fallback stays visible. */ });
  }
  private animate = (now: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.06) : 0;
    this.last = now;
    if (document.hidden) return;
    {
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
    }
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.stopPainting();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.disposed = true;
    releaseModel(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
