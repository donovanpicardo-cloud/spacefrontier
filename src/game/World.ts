import { CrashLanding } from "./CrashLanding";
import { dressOutpost } from "./environments/OutpostCladding";
import { isSharedPaintMap, paintedMap, paintScene } from "./environments/PainterlyMaterials";
import { warmGraphics } from "./GraphicsWarmup";
import { sprintHeld, updateMovementInput } from "./MovementInput";
import { gameAudio } from "./GameAudio";
import type { AudioFrame } from "./AudioDirector";
import { groundMeshHeight } from "./VehicleTerrain";
import { RocketScene } from "./RocketScene";
import { rocketPad } from "./Rocket";
import { FramePacer } from "./FramePacer";
import { FrameDiagnostics } from "./FrameDiagnostics";
import { RecoveryRoom } from "./habitats/RecoveryRoom";
import { interiorDetail } from "./habitats/InteriorDetail";
import { TerrainStream } from "./environments/TerrainStream";
import { RenderBudget, renderRatio } from "./RenderBudget";
import { suitMovement } from "./MovementTuning";
import * as T from "three";
import { HabitatLighting } from "./HabitatLighting";
import { horizontalStep, ballisticStep } from "./AstronautMotion";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Destination } from "../simulation/engine";
import { createAstronaut, animateAstronaut } from "./characters/Astronaut";
import {
  buildTerrain,
  terrainHeight,
  buildSky,
  setTerrainQuality,
} from "./environments/Terrain";
import { habitatSkin } from "./habitats/HabitatSkin";
import { buildHabitat, updateHabitatScreens } from "./habitats/Habitat";
import { orbitDelta, shoulderFraming } from "./CameraInput";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SurfaceDust } from "./effects/SurfaceDust";
import { OnlineAstronaut } from "./characters/OnlineAstronaut";
import type { TutorialEvent } from "./Tutorial";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { outpostDetail } from "./environments/OutpostDetail";
import { navigationTarget } from "./Navigation";
import { CollisionWorld } from "./CollisionWorld";
import { WorldRepairs, type RepairInfo } from "./WorldRepairs";
import type { RepairKind } from "./RepairPlan";
import { ExplorerVehicle, type VehicleInfo, type VehicleSave } from "./Vehicle";
import { batchStatic, disposeBatchSources } from "./environments/StaticBatch";
import { WorldResources, type GatherInfo } from "./WorldResources";
import {
  WorldAdventure,
  type FieldInfo,
  type FieldAction,
} from "./WorldAdventure";
import { initialAdventure, type Adventure } from "./Adventure";
import { airlockDoorOpen } from "./Airlock";
import type { ResourceKind, ResourceSite } from "./Resources";

import { stations } from "./Stations";
export { stations } from "./Stations";
export type WorldState = {
  rocketStage?: number;
  playing: boolean;
  paused: boolean;
  inside: boolean;
  repairing: boolean;
  flashlight: boolean;
  sensitivity: number;
  reducedMotion: boolean;
  quality: string;
  power: number;
  storm: boolean;
  crop: number;
  telemetry: {
    oxygen: number;
    suitAir?: number;
    water: number;
    time: number;
    history: number[][];
  };
  onNear: (id: string | null) => void;
  onInside: (v: boolean) => void;
  onMove: () => void;
  onAction?: (event: TutorialEvent) => void;
  onReady?: () => void;
  onModel?: (status: "loading" | "ready" | "error") => void;
  guideTarget?: string | null;
  junior?: boolean;
  tutorial?: boolean;
  onLookReleased?: () => void;
  onRepair?: (info: RepairInfo | null) => void;
  onRepairComplete?: () => void;
  onVehicle?: (info: VehicleInfo) => void;
  onGather?: (info: GatherInfo | null) => void;
  onGatherComplete?: (site: ResourceSite) => void;
  adventure?: Adventure;
  onScanPosition?: (position: number) => void;
  onField?: (info: FieldInfo | null) => void;
  onFieldAction?: (action: FieldAction) => void;
  onAirlock?: (info: FieldInfo | null) => void;
  onAirlockComplete?: () => void;
  restored?: Record<RepairKind, boolean>;
};
const white = new T.MeshStandardMaterial({
  color: 0xd9ddd8,
  roughness: 0.65,
  metalness: 0.25,
});
const dark = new T.MeshStandardMaterial({
  color: 0x243439,
  roughness: 0.6,
  metalness: 0.65,
});
const orange = new T.MeshStandardMaterial({ color: 0xe26c36, roughness: 0.6 });
const cyan = new T.MeshStandardMaterial({
  color: 0x83eeea,
  emissive: 0x39bfc2,
  emissiveIntensity: 1.5,
});
export function mesh(
  g: T.BufferGeometry,
  m: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat = white,
) {
  return mesh(new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
}
function rounded(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat = white,
) {
  return mesh(
    new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.17),
    mat,
    parent,
    x,
    y,
    z,
  );
}
function bootPrint() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#514634";
  ctx.beginPath();
  ctx.roundRect(3, 3, 26, 31, 6);
  ctx.roundRect(6, 36, 20, 25, 5);
  ctx.fill();
  ctx.clearRect(0, 15, 32, 2);
  ctx.clearRect(0, 24, 32, 3);
  ctx.clearRect(0, 47, 32, 3);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map, transparent: true, opacity: .42, depthWrite: false });
}
function label(text: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#17272b";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#b9f3ec";
  ctx.font = "bold 40px monospace";
  ctx.fillText(text, 25, 79);
  return new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) });
}
function seeded(n: number) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export class World {
  renderer: T.WebGLRenderer;
  diagnostics: FrameDiagnostics;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(52, 1, 0.08, 650);
  player = createAstronaut();
  state: WorldState;
  destination: Destination;
  keys = new Set<string>();
  yaw = 0.32;
  pitch = 0.1;
  distance = 7.2;
  horizontalVelocity = { x: 0, z: 0 };
  velocity = 0;
  speed = 0;
  phase = 0;
  clock = new T.Clock();
  raf = 0;
  colliders: T.Mesh[] = [];
  solids: T.Box3[] = [];
  near: string | null = null;
  landing = 0;
  footTimer = 0;
  footprints: T.Mesh[] = [];
  private footGeometry = new T.PlaneGeometry(.19, .33);
  private footMaterial = bootPrint();
  private leftPrint = true;
  resize: ResizeObserver;
  sun: T.DirectionalLight;
  ambient: T.HemisphereLight;
  contactShadow: T.Mesh;
  screenSampleAt = -1;
  interiorLights: T.PointLight[] = [];
  habitatLighting!: HabitatLighting;
  plants: T.Mesh[] = [];
  dust: T.Points;
  surfaceDust: SurfaceDust;
  disposed = false;
  wreck: CrashLanding;
  private landingCamera = false;
  private cinematicAudio = false;
  private landingLabels: T.Object3D[] = [];
  async filmLanding(quiet: boolean, show: () => void, finish: () => void) {
    await this.wreck.ready;
    if (this.disposed) return;
    this.landingLabels = [...this.resources.labels.values(), ...this.adventure.labels].filter(o => o.visible);
    this.landingLabels.forEach(o => { o.visible = false; });
    this.landingCamera = true;
    this.cinematicAudio = !quiet;
    this.wreck.start(finish);
    this.player.root.visible = this.contactShadow.visible = false;
    this.wreck.frame(0, this.camera);
    this.renderScene();
    show();
    if (quiet) this.skipLanding();
  }
  skipLanding() {
    this.cinematicAudio = false;
    this.wreck.skip(this.camera);
  }
  transit: { from: T.Vector3; to: T.Vector3; t: number } | null = null;
  doors: T.Mesh[] = [];
  target = new T.Vector3();
  desired = new T.Vector3();
  ray = new T.Raycaster();
  temp = new T.Vector3();
  look = new T.Vector3();
  fans: T.Group[] = [];
  screens: T.Mesh[] = [];
  reflection: T.WebGLRenderTarget | null = null;
  dragging = false;
  puzzleOrbit = false;
  pointerX = 0;
  pointerY = 0;
  orbitYaw = 0.32;
  orbitPitch = 0.1;
  online!: OnlineAstronaut;
  composer?: EffectComposer;
  smoothing?: EffectComposer;
  edgeSmoothing?: ShaderPass;
  ao?: SSAOPass;
  appliedQuality = "";
  lastLook = 0;
  jumped = false;
  jumpRequestedUntil = 0;
  takeoff = 0;
  ignoreUnlock = false;
  unlockedAt = -1000;
  physics = new CollisionWorld();
  repairs!: WorldRepairs;
  resources!: WorldResources;
  adventure!: WorldAdventure;
  workReturn: T.Vector3 | null = null;
  workExiting = false;
  supplyTarget: string | null = null;
  vehicle!: ExplorerVehicle;
  repairApproach: { from: T.Vector3; to: T.Vector3; t: number } | null = null;
  guideClock = 0;
  guidePoint = new T.Vector3();
  lastGuide = "";
  recoveryRoom!: RecoveryRoom;
  terrainStream!: TerrainStream;
  renderBudget = new RenderBudget();
  rocket!: RocketScene;
  warming = true;
  warmGeneration = 0;
  roomCameraReady = false;
  fps = 0;
  frameCount = 0;
  frameTime = 0;
  constructor(
    public container: HTMLElement,
    d: Destination,
    state: WorldState,
  ) {
    this.state = state;
    this.destination = d;
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    this.diagnostics = new FrameDiagnostics(
      this.renderer.getContext() as WebGL2RenderingContext,
    );
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.stopPainting = paintScene(this.scene);
    this.scene.background = new T.Color(d === "moon" ? 0x03060c : 0x9e7562);
    this.scene.fog = d === "mars" ? new T.FogExp2(0xb58d72, 0.004) : null;
    this.ambient = new T.HemisphereLight(
      d === "moon" ? 0xb8cee8 : 0xe9c5ac,
      d === "moon" ? 0x454b56 : 0x785044,
      d === "moon" ? 0.28 : 0.6,
    );
    this.scene.add(this.ambient);
    this.sun = new T.DirectionalLight(d === "moon" ? 0xfff5e8 : 0xffe1c5, 3.6);
    this.sun.position.set(-48, 21, 16);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -45,
      right: 45,
      top: 45,
      bottom: -45,
      far: 140,
    });
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.023;
    this.sun.shadow.radius = d === "moon" ? 1.65 : 2.65;
    this.scene.add(this.sun, this.sun.target);
    const pmrem = new T.PMREMGenerator(this.renderer);
    const studio = new RoomEnvironment();
    this.reflection = pmrem.fromScene(studio, 0.04);
    this.scene.environment = this.reflection.texture;
    this.scene.environmentIntensity = 0.45;
    studio.dispose();
    pmrem.dispose();
    this.terrain();
    this.base();
    this.props();
    this.staticScenery.push(outpostDetail(this.scene, d === "mars"));
    this.repairs = new WorldRepairs(
      this.scene,
      d,
      (info) => this.state.onRepair?.(info),
      () => {
        this.renderer.domElement.classList.remove("repair-mode");
        this.leaveWork();
        this.state.onRepairComplete?.();
      },
    );
    this.resources = new WorldResources(
      this.scene,
      d,
      (x, z) => this.groundHeight(x, z),
      (info) => this.state.onGather?.(info),
      (site) => {
        this.supplyTarget = null;
        this.state.onGatherComplete?.(site);
      },
    );
    this.rocket = new RocketScene(this.scene, d, (x, z) =>
      this.groundHeight(x, z),
    );
    this.physics.collect(this.scene, this.doors);
    this.wreck = new CrashLanding(this.scene, d, (x,z) => this.drivingSurface(x,z), (box, geometry, matrix) => {
      this.physics.add(box);
      if (geometry && matrix) this.physics.shape(box, geometry, matrix, "Crashed spacecraft");
    });
    this.resources.batch();
    dressOutpost(this.scene, this.doors[0], () => this.disposed, d === "mars");
    this.repairs.devices.forEach((d) => {
      const detail = d.root.children.find((o) => o.userData.serviceDetail);
      if (detail instanceof T.Group) batchStatic(detail);
    });
    this.staticScenery.forEach(batchStatic);
    this.vehicle = new ExplorerVehicle(
      this.scene,
      d,
      (x, z) => this.drivingSurface(x, z),
      this.physics,
      (info) => this.state.onVehicle?.(info),
    );
    this.adventure = new WorldAdventure(
      this.scene,
      d,
      (x, z) => this.groundHeight(x, z),
      (info) => this.state.onField?.(info),
      (action) => this.state.onFieldAction?.(action),
    );
    this.vehicle.dynamicObstacles = () => [
      ...this.doors.map((d) => new T.Box3().setFromObject(d)),
      ...this.adventure.bounds(true),
      ...this.recoveryRoom.bounds(),
      ...(this.rocket.stage > 0 ? this.rocket.bounds : []),
    ];
    this.dust = this.particles();
    this.surfaceDust = new SurfaceDust(this.scene, d === "mars");
    this.scene.add(this.player.root);
    this.online = new OnlineAstronaut((status) => {
      if (this.disposed) return;
      this.state.onModel?.(status);
      if (status === "ready") {
        this.player.body.visible = false;
        if (!this.state.playing) this.prepareGraphics();
        this.player.root.add(this.player.light, this.player.light.target);
      }
    });
    this.player.root.add(this.online.root);
    const contact = document.createElement("canvas");
    contact.width = contact.height = 128;
    const cx = contact.getContext("2d")!;
    const fade = cx.createRadialGradient(64, 64, 5, 64, 64, 64);
    fade.addColorStop(0, "#00000088");
    fade.addColorStop(1, "#00000000");
    cx.fillStyle = fade;
    cx.fillRect(0, 0, 128, 128);
    this.contactShadow = new T.Mesh(
      new T.PlaneGeometry(1.4, 1.4),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(contact),
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.contactShadow);
    const vehicleContact = new T.Mesh(
      new T.PlaneGeometry(3.5, 4.3),
      new T.MeshBasicMaterial({
        map: (this.contactShadow.material as T.MeshBasicMaterial).map,
        transparent: true,
        depthWrite: false,
        opacity: 0.48,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    vehicleContact.rotation.x = -Math.PI / 2;
    vehicleContact.position.y = 0.02;
    vehicleContact.userData.noCollision = true;
    this.vehicle.root.add(vehicleContact);
    this.player.root.position.set(0, 0, 4);
    this.camera.position.set(2, 3.3, 8);
    this.resize = new ResizeObserver(() => this.size());
    this.resize.observe(container);
    this.size();
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    document.addEventListener("mousemove", this.mouse);
    document.addEventListener("visibilitychange", this.visibilityChange);
    document.addEventListener("pointerlockchange", this.lockChange);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener(
      "pointermove",
      this.repairPointerMove,
    );
    window.addEventListener("pointerup", this.pointerUp);
    window.addEventListener("pointercancel", this.pointerUp);
    this.renderer.domElement.addEventListener("contextmenu", this.contextMenu);
    this.renderer.domElement.addEventListener("wheel", this.wheel, {
      passive: false,
    });
    this.habitatLighting = new HabitatLighting(this.scene, this.interiorLights);
    this.applyQuality();
    this.prepareGraphics();
    this.animate();
  }
  prepareGraphics() {
    const generation = ++this.warmGeneration;
    this.warming = true;
    // Compile while the title/loading UI is visible, before accepting gameplay.
    // KHR_parallel_shader_compile is used by Three when the driver supports it.
    void warmGraphics(this.renderer, this.scene, this.camera,
      () => this.disposed || generation !== this.warmGeneration)
      .finally(() => {
        if (this.disposed || generation !== this.warmGeneration) return;
        this.warming = false;
        this.visibilityChange();
        this.state.onReady?.();
      });
  }
  visibilityChange = () => {
    this.clock.getDelta();
    this.framePacer.deadline = performance.now();
    this.frameCount = this.frameTime = 0;
    this.keys.clear();
  };
  drivingSurface(x: number, z: number) {
    const mesh = Math.abs(x) <= 325 && Math.abs(z) <= 325 ? this.terrainSurface
      : this.terrainStream.tiles.get(Math.floor((x + 65) / 130) + ":" + Math.floor((z + 65) / 130));
    return mesh ? groundMeshHeight(mesh, x, z) : this.groundHeight(x, z);
  }
  groundHeight(x: number, z: number) {
    return terrainHeight(x, z, this.destination);
  }
  staticScenery: T.Group[] = [];
  terrainSurface!: T.Mesh;
  stopPainting?: () => void;
  terrain() {
    const terrain = buildTerrain(
      this.scene,
      this.destination,
      this.state.quality,
      () => this.disposed,
    );
    this.terrainSurface = terrain.ground;
    this.terrainStream = new TerrainStream(
      this.scene,
      this.destination,
      terrain.ground.material,
    );
    this.colliders.push(...terrain.colliders);
    for (const rock of terrain.colliders)
      this.solids.push(new T.Box3().setFromObject(rock));
    buildSky(this.scene, this.destination);
  }
  solid(o: T.Mesh) {
    o.updateMatrixWorld();
    this.colliders.push(o);
    this.solids.push(new T.Box3().setFromObject(o));
  }
  base() {
    const h = buildHabitat(this.scene, this.destination === "moon");
    this.colliders.push(...h.colliders);
    this.solids.push(...h.solids);
    this.doors = h.doors;
    this.interiorLights = h.lights;
    this.plants = h.plants;
    this.fans = h.fans;
    this.screens = h.screens;
    [...h.doors, ...h.plants, ...h.fans, ...h.screens].forEach(
      (o) => (o.userData.noBatch = true),
    );
    const detail = interiorDetail(this.scene);
    this.colliders.push(...detail.solids);
    this.recoveryRoom = new RecoveryRoom(this.scene);
    this.interiorLights.push(...this.recoveryRoom.lights);
    this.staticScenery.push(
      h.root,
      habitatSkin(this.scene, h.doors),
      detail.root,
    );
  }
  props() {
    const root = new T.Group();
    this.scene.add(root);
    this.staticScenery.push(root);
    const lunar = this.destination === "moon";
    const panelFrame = new T.MeshStandardMaterial({
      color: lunar ? 0xc8b99d : 0xc5a58d, roughness: .93, map: paintedMap("panel"),
    });
    const cells = [0x3c444a, 0x424950, 0x475058].map(color =>
      new T.MeshStandardMaterial({ color, roughness: .92, emissive: 0x24282a, emissiveIntensity: .24 }),
    );
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const x = 12 + col * 3.4,
          z = -3 - row * 4;
        rounded(root, x, .26, z, .84, .52, .89, panelFrame);
        rounded(root, x, .94, z, .35, .88, .41, panelFrame);
        box(root, x, 1.49, z, 2.85, .13, .21, panelFrame);
        const panel = new T.Group();
        panel.position.set(x, 1.65, z);
        panel.rotation.x = .56;
        root.add(panel);
        box(panel, 0, 0, 0, 3.1, 0.12, 2.7, panelFrame);
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 4; j++)
            box(
              panel,
              -1.23 + i * 0.49,
              0.075,
              -1 + j * 0.66,
              0.46,
              0.025,
              0.61,
              cells[(i * 5 + j * 7) % cells.length],
            );
        if (row === 0) this.colliders.push(panel.children[0] as T.Mesh);
      }
    rounded(root, 8.8, .45, -5, 1.19, .9, .76, panelFrame);
    box(root, 8.8, .2, -4.59, 1.14, .13, .05, orange);
    const cable = new T.CatmullRomCurve3([
      new T.Vector3(9.34, .32, -4.86), new T.Vector3(9.78, .12, -4.46),
      new T.Vector3(10.77, .08, -4.45), new T.Vector3(12, .18, -3.2),
    ]);
    mesh(new T.TubeGeometry(cable, 24, .065, 8), dark, root);

    for (let i = 0; i < 7; i++) {
      box(root, -2.5, 0.38, 1 - i * 1.5, 0.05, 0.75, 0.05, orange);
      box(root, -2.5, 0.79, 1 - i * 1.5, 0.12, 0.06, 0.12, cyan);
    }
  }
  particles() {
    const g = new T.BufferGeometry();
    const a = [];
    for (let i = 0; i < 240; i++)
      a.push(
        (seeded(i) - 0.5) * 100,
        seeded(i + 400) * 8,
        (seeded(i + 600) - 0.5) * 100,
      );
    g.setAttribute("position", new T.Float32BufferAttribute(a, 3));
    const o = new T.Points(
      g,
      new T.PointsMaterial({
        color: this.destination === "mars" ? 0xe2b68d : 0xafb8b7,
        size: 0.035,
        transparent: true,
        opacity: 0.3,
      }),
    );
    this.scene.add(o);
    return o;
  }
  ensurePostProcessing() {
    if (this.composer) return;
    const renderTarget = new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
    });
    renderTarget.samples = 4;
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new SSAOPass(this.scene, this.camera, 640, 400, 16);
    this.ao.kernelRadius = 0.8;
    this.ao.minDistance = 0.001;
    this.ao.maxDistance = 0.16;
    this.composer.addPass(this.ao);
    this.composer.addPass(new OutputPass());
  }
  ensureSmoothing() {
    if (this.smoothing) return;
    // Medium gets inexpensive edge smoothing; School/Low retain their direct render path.
    this.smoothing = new EffectComposer(this.renderer, new T.WebGLRenderTarget(1, 1));
    this.smoothing.addPass(new RenderPass(this.scene, this.camera));
    this.smoothing.addPass(new OutputPass());
    this.edgeSmoothing = new ShaderPass(FXAAShader);
    this.smoothing.addPass(this.edgeSmoothing);
  }
  private renderScene() {
    if (this.ao?.enabled && this.composer) this.composer.render();
    else if (this.state.quality === "Medium" && this.smoothing) this.smoothing.render();
    else this.renderer.render(this.scene, this.camera);
  }
  inRecoveryRoom() {
    return this.recoveryRoom.contains(this.player.root.position);
  }
  size() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.renderer.setPixelRatio(
      renderRatio(
        this.state.quality,
        w,
        h,
        devicePixelRatio,
        this.state.quality === "School computer" ? this.renderBudget.scale : 1,
      ),
    );
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
    this.smoothing?.setPixelRatio(this.renderer.getPixelRatio());
    this.smoothing?.setSize(w, h);
    this.edgeSmoothing?.uniforms.resolution.value.set(
      1 / Math.max(1, w * this.renderer.getPixelRatio()),
      1 / Math.max(1, h * this.renderer.getPixelRatio()),
    );
    this.ao?.setSize(Math.ceil(w * 0.65), Math.ceil(h * 0.65));
  }
  applyQuality() {
    const q = this.state.quality;
    if (q === this.appliedQuality) return;
    this.appliedQuality = q;
    setTerrainQuality(this.terrainSurface, this.destination, q);
    if (q === "Medium") this.ensureSmoothing();
    else if (this.smoothing) {
      this.smoothing.passes.forEach(pass => pass.dispose());
      this.smoothing.dispose();
      this.smoothing = undefined;
      this.edgeSmoothing = undefined;
    }
    if (q === "High" || q === "Ultra") this.ensurePostProcessing();
    this.renderer.shadowMap.enabled = q !== "Low" && q !== "School computer";
    const resolution = q === "Ultra" ? 4096 : q === "High" ? 2048 : 1024;
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.sun.shadow.mapSize.set(resolution, resolution);
    this.sun.shadow.radius = (this.destination === "moon" ? 1.65 : 2.65) * resolution / 1024;
    Object.assign(this.sun.shadow.camera, {
      left: -28,
      right: 28,
      top: 28,
      bottom: -28,
      near: 0.1,
      far: 160,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    if (this.ao) this.ao.enabled = q === "Ultra" || q === "High";
    const samples = q === "High" || q === "Ultra" ? 4 : 0;
    if (this.composer) {
      this.composer.renderTarget1.samples = samples;
      this.composer.renderTarget2.samples = samples;
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
    }
    this.size();
  }
  resetCamera() {
    this.lastLook = this.clock.elapsedTime;
    this.orbitYaw = this.player.root.rotation.y;
    this.orbitPitch = this.destination === "moon" ? 0.035 : 0.1;
    this.distance = this.destination === "moon" ? 8.2 : 7.2;
    this.state.onAction?.({ type: "reset" });
  }
  focusGuide() {
    // Objective guidance is visual only; never change the player’s viewing angle.
    this.lastGuide = "";
  }
  resetPlayer(position: number[] = [0, 0.12, 0]) {
    this.rocket.stop();
    this.adventure.cancel();
    this.workReturn = null;
    this.resources.restore();
    this.supplyTarget = this.state.adventure?.towing ? "recovery" : null;
    this.cancelRepair();
    this.repairs.reset();
    this.repairApproach = null;
    this.workExiting = false;
    this.vehicle.reset();
    this.state.restored = { solar: false, greenhouse: false, life: false };
    this.transit = null;
    this.velocity = 0;
    this.horizontalVelocity = { x: 0, z: 0 };
    this.speed = 0;
    this.jumped = false;
    this.jumpRequestedUntil = 0;
    this.takeoff = 0;
    this.lastGuide = "";
    this.keys.clear();
    this.pointerUp();
    this.near = null;
    this.state.onNear(null);
    this.player.root.position.fromArray(position);
    const doorBounds = [
      ...this.doors.map((d) => new T.Box3().setFromObject(d)),
      ...this.vehicle.bounds(),
    ];
    this.physics.recover(this.player.root.position, doorBounds);
    const safe = this.physics.vertical(
      this.player.root.position,
      this.player.root.position.y,
      this.groundHeight(
        this.player.root.position.x,
        this.player.root.position.z,
      ) + 0.12,
      doorBounds,
    );
    this.player.root.position.y = safe.y;
    this.player.root.rotation.set(0, 0, 0);
    this.doors.forEach((d) => (d.position.x = 0));
    this.resetCamera();
  }
  updateGuide(dt: number) {
    // Objective distance remains useful; navigation never draws a trail or steers the view.
    this.guideClock += dt;
    if (this.guideClock < .16) return;
    this.guideClock = 0;
    const station = this.navigationSites().find(s => s.id === (this.supplyTarget || this.state.guideTarget));
    if (!station) return;
    const point = navigationTarget(this.player.root.position, this.state.inside, station);
    this.guidePoint.set(point.x, 0, point.z);
  }
  beginRepair(kind: RepairKind) {
    this.resources.cancel();
    if (
      this.transit ||
      this.vehicle.driving ||
      this.vehicle.transition ||
      this.workExiting
    )
      return false;
    this.workReturn = this.player.root.position.clone();
    this.repairs.start(kind);
    const to = this.physics.safeFoot(
      this.repairs.anchor(),
      (x, z) => this.groundHeight(x, z),
      [
        ...this.vehicle.bounds(),
        ...this.adventure.bounds(),
        ...this.doors.map((d) => new T.Box3().setFromObject(d)),
      ],
    );
    this.repairApproach = { from: this.player.root.position.clone(), to, t: 0 };
    this.velocity = 0;
    this.horizontalVelocity = { x: 0, z: 0 };
    this.speed = 0;
    this.keys.clear();
    this.releaseLook();
    this.renderer.domElement.classList.add("repair-mode");
    return true;
  }
  beginGather(id: string) {
    // Subsequent E presses operate the current tool; do not restart the approach
    // or clear the held input needed for drilling, pumping and pack removal.
    if (this.resources.gather.active === id) return true;
    if (
      this.transit ||
      this.repairs.active ||
      this.vehicle.driving ||
      this.vehicle.transition ||
      this.state.inside
    )
      return false;
    if (!this.resources.start(id)) return false;
    const site = this.resources.sites.find((s) => s.id === id)!;
    const to = this.physics.safeFoot(
      new T.Vector3(
        site.x,
        this.groundHeight(site.x, site.z + 0.95) + 0.12,
        site.z + 0.95,
      ),
      (x, z) => this.groundHeight(x, z),
      [...this.vehicle.bounds(), ...this.adventure.bounds()],
    );
    this.repairApproach = { from: this.player.root.position.clone(), to, t: 0 };
    this.workExiting = false;
    this.horizontalVelocity = { x: 0, z: 0 };
    this.velocity = 0;
    this.keys.clear();
    return true;
  }
  findSupply(kind: ResourceKind, exactId?: string) {
    const p = this.player.root.position;
    const site = this.resources.sites
      .filter(
        (s) =>
          s.kind === kind &&
          (!exactId || s.id === exactId) &&
          !this.resources.gather.collected.has(s.id),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
      )[0];
    if (site) {
      this.supplyTarget = site.id;
      this.lastGuide = "";
      this.focusGuide();
    }
    return site;
  }
  getResourceSave() {
    return [...this.resources.gather.collected];
  }
  restoreResources(ids?: string[]) {
    this.resources.restore(ids);
  }
  cancelRepair() {
    const active = !!this.repairs?.active;
    this.repairs?.cancel();
    if (active) this.leaveWork();
    else if (!this.workExiting) this.repairApproach = null;
    this.renderer.domElement.classList.remove("repair-mode");
  }
  leaveWork() {
    const from = this.player.root.position.clone();
    const to = this.physics.workExit(from, (x, z) => this.groundHeight(x, z), [
      ...this.vehicle.bounds(),
      ...this.adventure.bounds(),
      ...this.doors.map((d) => new T.Box3().setFromObject(d)),
    ]);
    this.workReturn = null;
    this.workExiting = true;
    this.repairApproach = { from, to, t: 0 };
    this.keys.clear();
    this.velocity = 0;
    this.state.repairing = false;
  }
  navigationSites() {
    return [
      ...stations,
      rocketPad,
      {
        id: "medbay",
        name: this.recoveryRoom.built
          ? "Crew recovery room"
          : "Recovery room project",
        x: this.recoveryRoom.built ? 13 : 6.5,
        z: -23,
      },
      ...this.resources.sites,
      ...this.adventure.targets(),
      {
        id: "rover",
        name: this.vehicle.name,
        x: this.vehicle.state.x,
        z: this.vehicle.state.z,
      },
    ];
  }
  guideAdventure(id: string) {
    const target = this.navigationSites().find((s) => s.id === id);
    if (target) {
      this.supplyTarget = id;
      this.lastGuide = "";
      this.focusGuide();
    }
    return target;
  }
  toggleVehicle() {
    this.resources.cancel();
    if (this.transit || this.repairs.active) return;
    if (this.vehicle.driving) this.vehicle.exit(this.player.root.position);
    else if (!this.state.inside && this.vehicle.near(this.player.root.position))
      this.vehicle.enter(this.player.root.position);
    this.keys.clear();
  }
  getVehicleState() {
    return this.vehicle.save();
  }
  restoreVehicle(v: VehicleSave | undefined) {
    this.vehicle.restore(v, this.player.root);
    this.state.onNear(this.vehicle.driving ? "vehicle" : null);
    this.near = this.vehicle.driving ? "vehicle" : null;
  }
  keydown = (e: KeyboardEvent) => {
    if (this.adventure.hold && (e.code === "Tab" || e.target instanceof HTMLButtonElement)) return;
    if (
      this.repairs.active &&
      !this.state.paused &&
      (e.code.startsWith("Arrow") ||
        e.code === "Space" ||
        e.code.startsWith("Digit"))
    ) {
      e.preventDefault();
      this.repairs.key(e.code);
      return;
    }
    if (["Space", "Tab", "ArrowUp", "ArrowDown"].includes(e.code))
      e.preventDefault();
    if (this.resources.gather.active && !this.state.paused && !e.repeat)
      this.resources.key(e.code);
    updateMovementInput(this.keys, e, true);
    if (
      e.code === "Space" &&
      !e.repeat &&
      this.state.playing &&
      !this.state.paused &&
      !this.vehicle.driving
    )
      this.jumpRequestedUntil = performance.now() + 200;
    if (e.code === "KeyR" && this.state.playing && !this.state.paused)
      this.resetCamera();
  };
  keyup = (e: KeyboardEvent) => updateMovementInput(this.keys, e, false);
  blur = () => {
    this.jumpRequestedUntil = 0;
    this.keys.clear();
    this.resources.cancel();
    this.adventure.cancel();
    this.pointerUp();
  };
  lock = () => {
    const canvas = this.renderer.domElement;
    if (document.pointerLockElement !== canvas)
      canvas.requestPointerLock?.()?.catch(() => {});
  };
  releaseLook() {
    if (document.pointerLockElement === this.renderer.domElement) {
      this.ignoreUnlock = true;
      document.exitPointerLock();
    }
  }
  lockChange = () => {
    if (document.pointerLockElement === this.renderer.domElement) {
      if (this.adventure.hold) this.releaseLook();
      return;
    }
    if (this.ignoreUnlock) {
      this.ignoreUnlock = false;
      return;
    }
    this.unlockedAt = performance.now();
    if (this.state.playing && !this.state.paused && !this.state.repairing)
      this.state.onLookReleased?.();
  };
  dragTrack(e: PointerEvent, start: boolean) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.adventure.dragTrack(new T.Vector2(
      2 * (e.clientX - rect.left) / rect.width - 1,
      1 - 2 * (e.clientY - rect.top) / rect.height,
    ), this.camera, e.pointerId, start);
  }
  pointerDown = (e: PointerEvent) => {
    if (!this.state.playing || this.state.paused) return;
    if (this.adventure.hold) {
      if (e.button === 0 && this.adventure.hold.type === "robot") {
        this.renderer.domElement.setPointerCapture(e.pointerId);
        this.dragTrack(e, true);
      }
      return;
    }
    if (
      e.button === 2 &&
      (this.repairs.active ||
        this.resources.gather.active ||
        this.adventure.hold ||
        this.transit)
    ) {
      this.repairs.pointerUp();
      this.puzzleOrbit = true;
      this.dragging = true;
      this.renderer.domElement.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (this.repairs.active) {
      if (!this.repairApproach)
        this.repairs.pointerDown(e, this.camera, this.renderer.domElement);
      return;
    }
    this.dragging = true;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.renderer.domElement.classList.add("orbiting");
    if (e.pointerType === "mouse" && e.button === 0 && !this.state.tutorial &&
        !this.resources.gather.active && !this.adventure.hold && !this.transit)
      this.lock();
  };
  pointerUp = (e?: PointerEvent) => {
    this.adventure.releaseTrack(e?.pointerId);
    if (this.repairs?.active) {
      if (e && this.repairs.held)
        this.repairs.pointerMove(e, this.camera, this.renderer.domElement);
      this.repairs.pointerUp();
    }
    this.dragging = false;
    this.puzzleOrbit = false;
    this.renderer.domElement.classList.remove("orbiting");
  };
  contextMenu = (e: Event) => e.preventDefault();
  repairPointerMove = (e: PointerEvent) => {
    if (this.adventure.hold?.type === "robot" && this.state.playing && !this.state.paused) {
      if (e.buttons & 1) this.dragTrack(e, false);
      return;
    }
    if (e.pointerType !== "mouse" && this.dragging) {
      this.handleLook(e);
      return;
    }
    if (
      this.repairs.active &&
      !this.puzzleOrbit &&
      this.state.playing &&
      !this.state.paused &&
      !this.repairApproach
    )
      this.repairs.pointerMove(e, this.camera, this.renderer.domElement);
  };
  mouse = (e: MouseEvent) => this.handleLook(e);
  handleLook(e: MouseEvent) {
    if (
      this.repairs.active &&
      !this.puzzleOrbit &&
      this.state.playing &&
      !this.state.paused &&
      !this.repairApproach
    ) {
      this.repairs.pointerMove(e, this.camera, this.renderer.domElement);
      return;
    }
    if (!this.state.playing || this.state.paused) return;
    if (this.repairs.active || this.resources.gather.active || this.adventure.hold) return;
    if (this.transit && !this.puzzleOrbit) return;
    const locked = document.pointerLockElement === this.renderer.domElement;
    if (!locked && e.target !== this.renderer.domElement) return;
    if (!locked && !this.dragging && !this.puzzleOrbit) return;
    const touch = "pointerType" in e && e.pointerType !== "mouse";
    const dx = touch ? e.clientX - this.pointerX : e.movementX,
      dy = touch ? e.clientY - this.pointerY : e.movementY;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    const v = orbitDelta(
      this.orbitYaw,
      this.orbitPitch,
      dx,
      dy,
      this.state.sensitivity,
    );
    this.orbitYaw = v.yaw;
    this.orbitPitch = v.pitch;
    this.lastLook = this.clock.elapsedTime;
    this.state.onAction?.({
      type: "look",
      amount: Math.abs(dx) + Math.abs(dy),
    });
  }
  wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.distance = T.MathUtils.clamp(
      this.distance + e.deltaY * 0.005,
      this.repairs.active ? 1.8 : 3,
      9,
    );
  };
  framePacer = new FramePacer();
  private audioGrounded = true;
  private updateAudio(mode: AudioFrame["mode"], dt: number, elapsed = 0) {
    gameAudio.update({
      mode, elapsed, destination: this.destination,
      paused: this.state.paused || (mode === "surface" && !this.state.playing),
      inside: this.state.inside, speed: this.speed,
      grounded: this.audioGrounded,
      driving: this.vehicle.driving, vehicleSpeed: this.vehicle.state.speed,
      working: (!!this.repairs.active && this.repairs.held) || !!this.resources.gather.active || !!this.adventure.hold,
      airlock: !!this.transit, storm: this.state.storm,
      oxygen: Math.min(this.state.telemetry.oxygen, this.state.telemetry.suitAir ?? 100),
    }, dt);
  }
  simulationSeconds = 0;
  animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const frameAt = performance.now();
    if (document.hidden || this.warming) {
      gameAudio.silence();
      this.clock.getDelta();
      return;
    }
    const frameBudget = this.state.paused
      ? 1000 / 12
      : this.state.quality === "Low"
        ? 1000 / 30
        : this.state.quality === "School computer"
          ? 1000 / 60
          : 0;
    if (!this.framePacer.ready(frameAt, frameBudget)) return;
    const realDt = this.clock.getDelta();
    if (this.landingCamera && !this.state.playing) {
      this.player.root.visible = this.contactShadow.visible = false;
      this.wreck.frame(realDt, this.camera);
      this.updateAudio(this.cinematicAudio ? "crash" : "surface", realDt, this.wreck.time);
      this.renderScene();
      return;
    }
    if (this.landingCamera) {
      this.landingCamera = false;
      this.landingLabels.forEach(o => { o.visible = true; });
      this.landingLabels = [];
      this.contactShadow.visible = true;
    }
    this.frameCount++;
    this.frameTime += realDt;
    if (this.frameTime >= 1) {
      if (this.state.playing && !this.state.paused)
        this.fps = Math.round(this.frameCount / this.frameTime);
      this.frameCount = 0;
      this.frameTime = 0;
    }
    const dt = Math.min(realDt, 0.04);
    const active = this.state.playing && !this.state.paused;
    if (active && !this.rocket.flight) this.simulationSeconds += dt;
    this.diagnostics.begin(realDt * 1000, active);
    this.applyQuality();
    if (active && this.state.quality === "School computer" && realDt > 0 &&
        realDt < 0.5 && this.renderBudget.observe(realDt * 1000)) {
      this.size();
    }
    this.rocket.sync(this.state.rocketStage || 0);
    if (this.rocket.flight) {
      this.renderer.info.reset();
      this.diagnostics.beginGPU();
      this.rocket.update(
        dt,
        this.camera,
        this.renderer,
        this.state.paused,
        this.state.reducedMotion,
      );
      this.updateAudio("rocket", dt, this.rocket.flight?.elapsed ?? 36);
      this.diagnostics.endGPU();
      this.diagnostics.mark("Flight render");
      this.diagnostics.finish();
      this.diagnostics.publish({
        version: "r9-optimized",
        quality: this.state.quality,
        flight: true,
      });
      return;
    }
    if (this.state.restored) this.repairs.sync(this.state.restored);
    const p = this.player.root;
    this.terrainStream.update(p.position.x, p.position.z);
    this.recoveryRoom.sync(!!this.state.adventure?.upgrades.includes("medbay"));
    if (this.recoveryRoom.built && !this.roomCameraReady) {
      this.roomCameraReady = true;
      this.colliders.push(...this.recoveryRoom.kit.solids);
    }
    this.adventure.sync(
      this.state.adventure || initialAdventure(),
      this.vehicle,
      active ? dt : 0,
    );
    this.resources.gather.duration = this.adventure.data.upgrades.includes(
      "workshop",
    )
      ? 2
      : 3;
    this.vehicle.towing = !!this.adventure.data.towing;
    this.diagnostics.mark("Scene sync");
    const previousX = p.position.x,
      previousZ = p.position.z;
    let moving = false;
    const dynamic = active
      ? [
          ...this.doors.map((d) => new T.Box3().setFromObject(d)),
          ...this.vehicle.bounds(),
          ...this.adventure.bounds(),
          ...this.recoveryRoom.bounds(),
          ...(this.rocket.stage > 0 ? this.rocket.bounds : []),
        ]
      : [];
    if (active) {
      this.takeoff = Math.max(0, this.takeoff - dt);
      this.yaw = T.MathUtils.damp(this.yaw, this.orbitYaw, 16, dt);
      this.pitch = T.MathUtils.damp(this.pitch, this.orbitPitch, 16, dt);
    }
    if (active) {
      const wasRiding = this.vehicle.driving || !!this.vehicle.transition;
      this.vehicle.update(
        dt,
        {
          throttle:
            Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS")),
          steer: Number(this.keys.has("KeyA")) - Number(this.keys.has("KeyD")),
          brake: this.keys.has("Space"),
        },
        p,
      );
      if (this.vehicle.driving)
        this.adventure.sync(
          this.state.adventure || initialAdventure(),
          this.vehicle,
          0,
        );
      const riding = this.vehicle.driving || !!this.vehicle.transition;
      if (riding) this.horizontalVelocity = { x: 0, z: 0 };
      if (wasRiding && !riding) {
        this.velocity = 0;
        this.lastGuide = "";
      }
      let ground = this.groundHeight(p.position.x, p.position.z) + 0.12,
        grounded = true;
      if (!riding) {
        const forward =
          Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
        const strafe =
          Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
        const terrainBefore =
          this.groundHeight(p.position.x, p.position.z) + 0.12;
        const floorBefore = this.physics.vertical(
          p.position,
          p.position.y,
          terrainBefore,
          dynamic,
        ).floor;
        const onGround =
          p.position.y <= floorBefore + 0.02 && this.velocity <= 0;
        const enabled =
          !this.state.repairing &&
          !this.transit &&
          !this.resources.gather.active &&
          !this.adventure.hold &&
          !this.repairApproach;
        const motion = horizontalStep(
          this.horizontalVelocity,
          { x: strafe, z: -forward },
          this.yaw,
          onGround,
          enabled,
          sprintHeld(this.keys),
          dt,
        );
        this.horizontalVelocity = { x: motion.x, z: motion.z };
        const xBefore = p.position.x,
          zBefore = p.position.z;
        this.physics.move(p.position, motion.dx, motion.dz, dynamic);
        if (Math.abs(p.position.x - xBefore - motion.dx) > 0.002)
          this.horizontalVelocity.x = 0;
        if (Math.abs(p.position.z - zBefore - motion.dz) > 0.002)
          this.horizontalVelocity.z = 0;
        this.speed = Math.hypot(
          this.horizontalVelocity.x,
          this.horizontalVelocity.z,
        );
        moving = enabled && this.speed > 0.08;
        if (moving && onGround) {
          const angle = Math.atan2(
            -this.horizontalVelocity.x,
            -this.horizontalVelocity.z,
          );
          p.rotation.y +=
            Math.atan2(
              Math.sin(angle - p.rotation.y),
              Math.cos(angle - p.rotation.y),
            ) *
            (1 - Math.exp(-10 * dt));
          this.state.onMove();
          this.state.onAction?.({
            type: "move",
            amount: Math.hypot(
              p.position.x - previousX,
              p.position.z - previousZ,
            ),
          });
        }
        const terrain = this.groundHeight(p.position.x, p.position.z) + 0.12;
        ground = this.physics.vertical(
          p.position,
          p.position.y,
          terrain,
          dynamic,
        ).floor;
        grounded = p.position.y <= ground + 0.01;
        if (
          (this.keys.has("Space") ||
            performance.now() < this.jumpRequestedUntil) &&
          grounded &&
          !this.state.repairing &&
          !this.resources.gather.active &&
          !this.transit &&
          !this.adventure.hold &&
          !this.repairApproach
        ) {
          this.jumpRequestedUntil = 0;
          this.velocity = suitMovement(this.destination).jumpSpeed;
          this.jumped = true;
          this.takeoff = 0.14;
          this.keys.delete("Space");
        }
        const flight = ballisticStep(
          this.velocity,
          suitMovement(this.destination).gravity,
          dt,
        );
        this.velocity = flight.velocity;
        const vertical = this.physics.vertical(
          p.position,
          p.position.y + flight.dy,
          terrain,
          dynamic,
        );
        if (vertical.hitCeiling && this.velocity > 0) this.velocity = 0;
        p.position.y = vertical.y;
        if (p.position.y <= vertical.floor + 0.001 && this.velocity <= 0) {
          if (this.jumped && this.velocity < 0) {
            this.state.onAction?.({ type: "jump" });
            this.jumped = false;
          }
          if (this.velocity < -1) this.landing = 0.28;
          p.position.y = vertical.floor;
          this.velocity = 0;
        }
        if (this.transit) {
          this.transit.t += dt / 4;
          const t = Math.min(1, this.transit.t);
          this.state.onAirlock?.({
            name: "Airlock pressure cycle",
            text:
              t < 0.35
                ? "Step into the enclosed chamber."
                : t < 0.65
                  ? "Both doors sealed. Equalizing pressure…"
                  : "Pressure balanced. The next door is opening.",
            progress: t,
          });
          const mid = new T.Vector3(0, 0.21, -11);
          const approach = new T.Vector3(
            0,
            0.17,
            this.transit.to.z < -12 ? -7.3 : -14.2,
          );
          if (t < 0.15) {
            const a = t / 0.15;
            p.position.lerpVectors(
              this.transit.from,
              approach,
              a * a * (3 - 2 * a),
            );
          } else if (t < 0.35) {
            const a = (t - 0.15) / 0.2;
            p.position.lerpVectors(approach, mid, a * a * (3 - 2 * a));
          } else if (t < 0.65) p.position.copy(mid);
          else {
            const a = (t - 0.65) / 0.35;
            p.position.lerpVectors(mid, this.transit.to, a * a * (3 - 2 * a));
          }
          p.rotation.y = this.transit.to.z < this.transit.from.z ? 0 : Math.PI;
          this.speed = t > 0.35 && t < 0.65 ? 0 : 1.5;
          if (t >= 1) {
            this.transit = null;
            this.keys.clear();
            this.state.onAirlock?.(null);
            this.state.onAirlockComplete?.();
            this.lastGuide = "";
          }
        }
      } else {
        this.speed = 0;
        this.velocity = 0;
        this.takeoff = 0;
      }
      this.doors.forEach((d, i) => {
        let open = false;
        if (this.transit) {
          const entering = this.transit.to.z < this.transit.from.z;
          const other = this.doors[1 - i];
          open = airlockDoorOpen(this.transit.t, entering, i, other.position.x);
        }
        d.position.x = T.MathUtils.damp(d.position.x, open ? 2.6 : 0, 14, dt);
      });
      if (this.repairApproach) {
        const t = Math.min(
          1,
          (this.repairApproach.t += dt / (this.workExiting ? 0.7 : 1.1)),
        );
        p.position.lerpVectors(
          this.repairApproach.from,
          this.repairApproach.to,
          t * t * (3 - 2 * t),
        );
        p.rotation.y = this.workExiting
          ? Math.atan2(
              this.repairApproach.from.x - this.repairApproach.to.x,
              this.repairApproach.from.z - this.repairApproach.to.z,
            )
          : 0;
        this.speed = 1.4;
        if (t >= 1) {
          this.repairApproach = null;
          if (this.workExiting) this.physics.recover(p.position, dynamic);
          this.workExiting = false;
          this.speed = 0;
        }
      }
      this.repairs.update(dt);
      this.phase += this.speed * dt * 3.1;
      if (this.state.repairing && !this.transit && !this.repairs.active) {
        const station = stations.find((s) => s.id === this.near);
        if (station) {
          const angle = Math.atan2(
            p.position.x - station.x,
            p.position.z - station.z,
          );
          p.rotation.y +=
            Math.atan2(
              Math.sin(angle - p.rotation.y),
              Math.cos(angle - p.rotation.y),
            ) *
            (1 - Math.exp(-8 * dt));
        }
      }
      this.landing = T.MathUtils.damp(this.landing, 0, 9, dt);
      this.diagnostics.mark("Physics and vehicles");
      animateAstronaut(this.player, {
        dt,
        time: this.clock.elapsedTime,
        phase: this.phase,
        speed: this.speed,
        grounded,
        verticalSpeed: this.velocity,
        landing: this.landing,
        repair: !!this.repairs.active && !this.repairApproach,
        reducedMotion: this.state.reducedMotion,
      });
      // Use the collision result even when vertical speed is zero at the jump apex.
      this.audioGrounded = grounded;
      this.online.update(
        dt,
        this.speed,
        grounded,
        this.landing,
        false, // Tool-specific hand reach replaces the generic servicing loop.
        this.velocity,
        this.takeoff,
        this.vehicle.driving ||
          (!!this.vehicle.transition &&
            (this.vehicle.transition.type === "exit"
              ? this.vehicle.transition.t < 0.5
              : this.vehicle.transition.t > 0.8)),
      );
      const seated =
        this.vehicle.driving ||
        (!!this.vehicle.transition &&
          (this.vehicle.transition.type === "exit"
            ? this.vehicle.transition.t < 0.5
            : this.vehicle.transition.t > 0.8));
      if (seated) {
        this.player.body.position.y = -0.25;
        this.player.legs.forEach((l) => (l.rotation.x = 1.2));
        this.player.knees.forEach((k) => (k.rotation.x = -1.3));
      }
      if (!this.repairApproach)
        this.resources.update(
          dt,
          this.keys.has("KeyE") && !riding,
          p.position,
          Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA")),
          Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS")),
        );
      if (this.resources.gather.active) {
        const site = this.resources.sites.find(
          (s) => s.id === this.resources.gather.active,
        )!;
        p.rotation.y = Math.atan2(p.position.x - site.x, p.position.z - site.z);
      }
      this.adventure.update(dt, p, this.vehicle);
      if (this.adventure.hold?.type === "sample") this.state.onScanPosition?.(this.adventure.scanPosition);
      const hands = seated
        ? this.vehicle.hands()
        : this.repairs.hands() ||
          this.resources.hands() ||
          this.adventure.hands();
      if (hands && !this.repairApproach)
        this.online.reachHands(hands.right, hands.left);
      this.player.light.intensity = this.state.flashlight ? 18 : 0;
      const inside =
        !riding &&
        ((Math.abs(p.position.x) < 7.15 &&
          p.position.z < -12 &&
          p.position.z > -34) ||
          this.inRecoveryRoom());
      if (inside !== this.state.inside && !this.transit)
        this.state.onInside(inside);
      const closest = stations
        .map((s) => ({
          id: s.id,
          dist: Math.hypot(s.x - p.position.x, s.z - p.position.z),
        }))
        .sort((a, b) => a.dist - b.dist)[0];
      const resource = this.resources.nearest(p.position);
      const field = this.adventure.nearest(p.position);
      const hitch = this.adventure.robots.find(
        (r) =>
          this.adventure.data.readyRobots.includes(r.id) &&
          !this.adventure.data.rescued.includes(r.id) &&
          !this.adventure.data.towing &&
          Math.hypot(r.x - this.vehicle.state.x, r.z - this.vehicle.state.z) <
            4.5 &&
          Math.abs(this.vehicle.state.speed) < 0.4,
      );
      const roomNear =
        !riding &&
        (this.recoveryRoom.built
          ? this.inRecoveryRoom() &&
            Math.hypot(p.position.x - 11.2, p.position.z + 23) < 2.3
            ? "medbay"
            : null
          : Math.hypot(p.position.x - 6.5, p.position.z + 23) < 2
            ? "recovery-room-project"
            : null);
      const near =
        (!riding &&
        Math.hypot(p.position.x - rocketPad.x, p.position.z - rocketPad.z) < 5.7
          ? "rocket"
          : null) ||
        roomNear ||
        (riding && hitch
          ? "hitch:" + hitch.id
          : !riding &&
              field &&
              field.distance < 2.7 &&
              field.distance < closest.dist
            ? field.site.id
            : riding ||
                (!inside &&
                  this.vehicle.near(p.position) &&
                  closest.dist > 2.2 &&
                  (!resource || resource.distance >= 2.2))
              ? "vehicle"
              : !inside &&
                  resource &&
                  resource.distance < 2.2 &&
                  resource.distance < closest.dist
                ? "resource:" + resource.site.id
                : closest.dist < (this.state.junior ? 4 : 3)
                  ? closest.id
                  : this.state.inside &&
                      Math.hypot(p.position.x, p.position.z + 13) < 3
                    ? "airlock"
                    : null);
      if (closest.id === "solar" && closest.dist < 3.8)
        this.state.onAction?.({ type: "marker" });
      if (inside && !this.transit) this.state.onAction?.({ type: "airlock" });
      if (near !== this.near) {
        this.near = near;
        this.state.onNear(near);
      }
      if (moving && grounded && !inside && !riding) {
        this.footTimer += dt;
        if (this.footTimer > 0.35) {
          this.footTimer = 0;
          this.surfaceDust.step(p.position, p.rotation.y);
          const offset = this.leftPrint ? -.13 : .13;
          this.leftPrint = !this.leftPrint;
          const x = p.position.x + Math.cos(p.rotation.y) * offset;
          const z = p.position.z - Math.sin(p.rotation.y) * offset;
          const foot = this.footprints.length === 100
            ? this.footprints.shift()!
            : new T.Mesh(this.footGeometry, this.footMaterial);
          foot.position.set(x, this.groundHeight(x, z) + .025, z);
          foot.rotation.set(-Math.PI / 2, 0, -p.rotation.y, "YXZ");
          if (!foot.parent) this.scene.add(foot);
          this.footprints.push(foot);
        }
      }
    }
    this.diagnostics.mark("Character and gameplay");
    if (active) this.surfaceDust.update(dt);
    const interior = this.state.inside;
    const site = this.resources.gather.active;
    const rig = site && this.resources.rigs.get(site);
    const task = this.repairs.active ? this.repairs.cameraPose()
      : rig ? {
        look: rig.root.localToWorld(new T.Vector3(0, 0.75, 0)),
        position: rig.root.localToWorld(new T.Vector3(0, 1.45, 2.15)),
      } : this.adventure.cameraPose(p.position);
    p.visible = !task;
    if (task) {
      this.look.copy(task.look);
      this.camera.position.copy(task.position).sub(task.look)
        .multiplyScalar(Math.max(1, 1.15 / this.camera.aspect)).add(task.look);
      this.camera.fov = 49;
    } else {
      const range =
        this.vehicle.driving || this.vehicle.transition
          ? this.destination === "moon"
            ? 7
            : 9
          : interior
            ? Math.min(this.distance, 3.1)
            : this.distance;
      this.target.copy(p.position).add(new T.Vector3(0, 1.48, 0));
      const shoulder = new T.Vector3(0.53, 0, 0).applyAxisAngle(
        T.Object3D.DEFAULT_UP,
        this.yaw,
      );
      this.desired
        .set(
          Math.sin(this.yaw) * Math.cos(this.pitch) * range,
          Math.sin(this.pitch) * range + (interior ? 0.08 : 0.55),
          Math.cos(this.yaw) * Math.cos(this.pitch) * range,
        )
        .add(this.target)
        .add(shoulder);
      this.temp.copy(this.desired).sub(this.target);
      const length = this.temp.length();
      this.ray.set(this.target, this.temp.normalize());
      this.ray.far = length + 0.2;
      let hits = this.ray.intersectObjects(this.colliders, false);
      // Pull closer at walls; never rotate the view away from the movement heading.
      if (hits.length && hits[0].distance < length)
        this.desired
          .copy(this.target)
          .addScaledVector(this.temp, Math.max(0.65, hits[0].distance - 0.25));
      this.desired.y = Math.max(
        this.groundHeight(this.desired.x, this.desired.z) + 0.35,
        this.desired.y,
      );
      const cameraPath = this.desired.clone().sub(this.target);
      for (let i = 1; i <= 12; i++) {
        const sample = this.target.clone().addScaledVector(cameraPath, i / 12);
        if (sample.y < this.groundHeight(sample.x, sample.z) + 0.2) {
          this.desired
            .copy(this.target)
            .addScaledVector(cameraPath, Math.max(0.12, (i - 1) / 12));
          break;
        }
      }
      const collision = hits.length > 0 && hits[0].distance < length;
      this.camera.position.lerp(
        this.desired,
        1 - Math.exp(-(collision ? 96 : 8) * dt),
      );
      this.look.copy(this.target).add(shoulder.clone().multiplyScalar(0.4));
      const framing = shoulderFraming(
        this.camera.position.distanceTo(this.target),
      );
      this.look.y -= framing.aimDrop;
      this.camera.fov = T.MathUtils.damp(this.camera.fov, framing.fov, 8, dt);
    }
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.look);
    this.diagnostics.mark("Camera");
    const lightLimit =
      this.state.quality === "Low"
        ? 1
        : this.state.quality === "School computer"
          ? 2
          : 4;
    this.habitatLighting.update(
      p.position, interior, this.state.power, lightLimit, dt,
    );
    const dustStorm = this.destination === "mars" && this.state.storm;
    if (this.scene.fog instanceof T.FogExp2)
      this.scene.fog.density = T.MathUtils.damp(this.scene.fog.density, dustStorm ? .016 : .004, 2, dt);
    this.ambient.intensity = T.MathUtils.damp(
      this.ambient.intensity,
      interior ? 0.55 : this.destination === "moon" ? 0.28 : 0.6,
      3,
      dt,
    );
    this.scene.environmentIntensity = T.MathUtils.damp(
      this.scene.environmentIntensity,
      interior ? 0.3 : 0.22,
      3,
      dt,
    );
    this.sun.intensity = T.MathUtils.damp(
      this.sun.intensity,
      interior ? 0.42 : dustStorm ? 1.2 : 3.6,
      3,
      dt,
    );
    const floorY = this.groundHeight(p.position.x, p.position.z) + 0.13;
    this.contactShadow.position.set(p.position.x, floorY, p.position.z);
    (this.contactShadow.material as T.MeshBasicMaterial).opacity = Math.max(
      0.08,
      0.65 - (p.position.y - floorY) * 0.2,
    );
    if (this.screenSampleAt !== this.state.telemetry.time) {
      this.screenSampleAt = this.state.telemetry.time;
      if (interior)
        updateHabitatScreens(this.screens, {
          ...this.state.telemetry,
          battery: this.state.power,
          storm: this.state.storm,
        });
    }
    this.plants.forEach((p) => {
      if (p.userData.baseScale === undefined) p.userData.baseScale = p.scale.y;
      p.scale.y = p.userData.baseScale * (0.7 + this.state.crop * 0.006);
    });
    if (active)
      this.fans.forEach(
        (f) => (f.rotation.z += dt * (this.state.power > 0 ? 3 : 0)),
      );
    this.screens.forEach((screen) => {
      const m = screen.material as T.MeshStandardMaterial;
      m.emissiveIntensity =
        this.state.power > 0
          ? 0.7 + Math.sin(this.clock.elapsedTime * 1.6) * 0.04
          : 0.04;
    });
    this.updateGuide(dt);
    // Snap the shadow volume to texel increments while preserving the sun direction.
    const texel = 56 / this.sun.shadow.mapSize.x;
    const sx = Math.round(p.position.x / texel) * texel;
    const sz = Math.round((p.position.z - 8) / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx - 48, 21, sz + 16);
    this.dust.rotation.y += dt * (this.state.storm ? 0.015 : 0.001);
    (this.dust.material as T.PointsMaterial).opacity =
      this.destination === "mars" ? (this.state.storm ? 0.65 : 0.22) : 0;
    this.resources.visibility(p.position, this.supplyTarget);
    for (const label of this.resources.labels.values())
      label.quaternion.copy(this.camera.quaternion);
    for (const label of this.adventure.labels)
      label.quaternion.copy(this.camera.quaternion);
    this.diagnostics.mark("Lights and interface");
    this.renderer.info.reset();
    this.diagnostics.beginGPU();
    this.renderScene();
    this.diagnostics.endGPU();
    this.diagnostics.mark("Render submission");
    this.updateAudio("surface", dt);
    this.diagnostics.finish();
    this.diagnostics.publish({
      version: "r9-optimized",
      quality: this.state.quality,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
    });
  };
  cycleAirlock() {
    if (
      this.transit ||
      this.vehicle.driving ||
      this.vehicle.transition ||
      this.repairApproach
    )
      return false;
    this.adventure.cancel();
    this.resources.cancel();
    this.keys.clear();
    const entering = !this.state.inside;
    this.transit = {
      from: this.player.root.position.clone(),
      to: new T.Vector3(0, 0.12, entering ? -13.7 : -7.5),
      t: 0,
    };
    return true;
  }
  getPosition() {
    return (
      this.transit?.from ||
      (this.workExiting && this.repairApproach?.to) ||
      this.player.root.position
    ).toArray();
  }
  setPosition(p: number[]) {
    if (p.length === 3 && p.every(Number.isFinite))
      this.player.root.position.fromArray(p);
  }
  dispose() {
    gameAudio.menu();
    this.disposed = true;
    this.wreck.dispose();
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("mousemove", this.mouse);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    document.removeEventListener("pointerlockchange", this.lockChange);
    if (document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.pointerDown,
    );
    window.removeEventListener("pointerup", this.pointerUp);
    window.removeEventListener("pointercancel", this.pointerUp);
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.repairPointerMove,
    );
    this.renderer.domElement.removeEventListener(
      "contextmenu",
      this.contextMenu,
    );
    this.rocket.stop();
    disposeBatchSources(this.scene);
    this.reflection?.dispose();
    this.repairs.cancel();
    this.resources.cancel();
    this.adventure.cancel();
    this.vehicle.disposed = true;
    this.online.dispose();
    this.composer?.passes.forEach((p) => p.dispose());
    this.composer?.dispose();
    this.smoothing?.passes.forEach(pass => pass.dispose());
    this.smoothing?.dispose();
    this.sun.shadow.map?.dispose();
    this.renderer.domElement.removeEventListener("wheel", this.wheel);
    for (const foot of this.footprints) foot.removeFromParent();
    this.footGeometry.dispose();
    this.footMaterial.map?.dispose();
    this.footMaterial.dispose();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Points) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: T.Material) => {
          for (const v of Object.values(m))
            if (v instanceof T.Texture && !isSharedPaintMap(v)) v.dispose();
          m.dispose();
        });
      }
    });
    this.stopPainting?.();
    this.diagnostics.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
