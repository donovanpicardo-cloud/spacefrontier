import * as T from "three";
import type { Destination } from "../simulation/engine";
import { Gathering, resourceSites, type ResourceSite } from "./Resources";
import { Extraction } from "./Extraction";
import { resourceRig, type ResourceRig } from "./ResourceRigs";
import { batchStatic } from "./environments/StaticBatch";
export type GatherInfo = {
  name: string;
  progress: number;
  instruction: string;
  controls: string;
  heat?: number;
  voltage?: number;
  band?: number;
};
export class WorldResources {
  sites: ResourceSite[];
  gather = new Gathering();
  extraction: Extraction | null = null;
  rigs = new Map<string, ResourceRig>();
  roots = new Map<string, T.Group>();
  labels = new Map<string, T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>>();
  tool = new T.Group();
  buttonHeld = false;
  lastProgress = "";
  constructor(
    scene: T.Scene,
    d: Destination,
    ground: (x: number, z: number) => number,
    public status: (info: GatherInfo | null) => void,
    public complete: (site: ResourceSite) => void,
  ) {
    this.sites = resourceSites(d);
    for (const site of this.sites) {
      const rig = resourceRig(site.kind);
      rig.root.position.set(site.x, ground(site.x, site.z), site.z);
      rig.root.name = "Resource equipment";
      scene.add(rig.root);
      this.rigs.set(site.id, rig);
      this.roots.set(site.id, rig.root);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.font = "bold 38px sans-serif";
      ctx.textAlign = "center";
      const label = new T.Mesh(
        new T.PlaneGeometry(1.8, 0.45),
        new T.MeshBasicMaterial({
          map: new T.CanvasTexture(canvas),
          side: T.DoubleSide,
        }),
      );
      label.position.set(0, 1.7, 0);
      label.userData.noCollision = true;
      rig.root.add(label);
      this.labels.set(site.id, label);
      this.paint(site.id);
    }
    const handle = new T.Mesh(
      new T.CylinderGeometry(0.045, 0.065, 0.26, 16),
      new T.MeshStandardMaterial({
        color: 0xc9b477,
        metalness: 0.55,
        roughness: 0.5,
      }),
    );
    handle.rotation.x = Math.PI / 2;
    this.tool.add(handle);
    this.tool.userData.noCollision = true;
    this.tool.visible = false;
    scene.add(this.tool);
  }
  batch() {
    for (const rig of this.rigs.values())
      batchStatic(rig.root.userData.structure);
  }
  nearest(p: T.Vector3) {
    return this.sites
      .filter((s) => !this.gather.collected.has(s.id))
      .map((site) => ({
        site,
        distance: Math.hypot(p.x - site.x, p.z - site.z),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }
  start(id: string) {
    if (this.gather.active === id) return true;
    if (!this.gather.start(id)) return false;
    this.extraction = new Extraction(this.sites.find((s) => s.id === id)!.kind);
    this.lastProgress = "";
    this.emit();
    return true;
  }
  key(code: string) {
    // The E event which opens the rig may reach this listener after start().
    // It must not also trip the relay before the approach/tool has begun.
    if (this.extraction && (this.extraction.elapsed > 0 || this.extraction.stage > 0))
      this.extraction.key(code);
  }
  cancel() {
    this.gather.cancel();
    this.extraction = null;
    this.buttonHeld = false;
    this.tool.visible = false;
    for (const site of this.sites) this.resetVisual(site.id);
    this.status(null);
    this.lastProgress = "";
  }
  restore(ids?: string[]) {
    this.cancel();
    this.gather.restore(ids);
    for (const site of this.sites) this.paint(site.id);
  }
  resetVisual(id: string) {
    const rig = this.rigs.get(id)!,
      used = this.gather.collected.has(id);
    rig.dial.rotation.z = 0;
    rig.component.position.set(
      this.sites.find((s) => s.id === id)!.kind === "battery" ? 0.62 : 0,
      this.sites.find((s) => s.id === id)!.kind === "battery" ? 0.37 : 0.48,
      0,
    );
    rig.component.visible = !used;
    rig.ice.visible = !used;
    rig.moving.children
      .filter((o) => o.userData.cover)
      .forEach((o) => {
        o.visible = !used;
        o.position.y = 0.32;
      });
    (rig.indicator.material as T.MeshStandardMaterial).color.setHex(
      used ? 0x40534c : 0x6de0b9,
    );
  }
  paint(id: string) {
    this.resetVisual(id);
    const texture = this.labels.get(id)!.material.map!,
      ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
    ctx.fillStyle = "#132d35";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = this.gather.collected.has(id) ? "#93a69a" : "#ecf0dd";
    const kind = this.sites.find((s) => s.id === id)!.kind;
    ctx.fillText(
      this.gather.collected.has(id)
        ? "RECOVERED"
        : kind === "ice"
          ? "ICE SEAM"
          : kind === "salvage"
            ? "SALVAGE WRECK"
            : "FIELD DYNAMO",
      256,
      77,
    );
    texture.needsUpdate = true;
  }
  emit() {
    if (!this.extraction || !this.gather.active) return;
    const task = this.extraction,
      site = this.sites.find((s) => s.id === this.gather.active)!;
    const key = [
      task.stage,
      Math.floor(task.progress * 100),
      Math.round(task.voltage),
      task.fault,
      Math.floor(task.stable * 10),
      task.overheated,
      Math.floor(task.heat * 10),
    ].join(":");
    if (key === this.lastProgress) return;
    this.lastProgress = key;
    this.status({
      name: site.name,
      progress: Math.max(0, Math.min(1, task.progress)),
      instruction: task.instruction(),
      controls: task.controls,
      ...(site.kind === "battery" && task.stage === 0 ? { voltage: Math.round(task.voltage), band: task.targetVoltage } : {}),
      ...(site.kind === "ice" ? { heat: task.heat } : {}),
    });
  }
  update(dt: number, held: boolean, p: T.Vector3, turn = 0, lift = 0) {
    const id = this.gather.active;
    if (!id) {
      this.buttonHeld = false;
      return;
    }
    const site = this.sites.find((s) => s.id === id)!;
    if (Math.hypot(p.x - site.x, p.z - site.z) > 2.5) {
      this.cancel();
      return;
    }
    const task = this.extraction!,
      rig = this.rigs.get(id)!;
    const done = task.update(
      dt,
      turn,
      held || this.buttonHeld,
      this.gather.duration,
      lift,
    );
    this.tool.visible = site.kind === "ice";
    this.tool.position.copy(rig.root.position).add(new T.Vector3(0, 0.9, 0));
    if (site.kind === "ice") {
      rig.moving.children
        .filter((o) => o.userData.cover)
        .forEach((o) => {
          o.position.y = 0.32 - task.drilled * 0.52;
          o.visible = task.drilled < 1;
        });
      rig.dial.position.y = 0.72 - task.drilled * 0.2;
      const auger = rig.dial.children.find((o) => o.userData.auger);
      if (auger && held && !task.overheated) auger.rotation.y += dt * 14;
      (rig.indicator.material as T.MeshStandardMaterial).color.setHex(
        task.heat > 0.72 ? 0xf27440 : 0x6de0b9,
      );
      this.tool.position.copy(
        rig.root.localToWorld(new T.Vector3(0, 1.04 - task.drilled * 0.2, 0)),
      );
    } else if (site.kind === "battery") {
      rig.dial.rotation.z = T.MathUtils.damp(
        rig.dial.rotation.z,
        task.crankAngle,
        12,
        dt,
      );
      (rig.indicator.material as T.MeshStandardMaterial).emissiveIntensity =
        0.2 + task.progress;
      if (task.unplugged)
        rig.component.position.z = Math.min(1, task.elapsed / 0.7) * 0.7;
    } else rig.component.position.set(task.componentX, task.componentY, 0);
    if (done) {
      this.gather.collected.add(id);
      this.gather.cancel();
      this.extraction = null;
      this.buttonHeld = false;
      this.tool.visible = false;
      this.status(null);
      this.paint(id);
      this.complete(site);
      return;
    }
    this.emit();
  }
  hands() {
    if (!this.gather.active || !this.extraction) return null;
    const rig = this.rigs.get(this.gather.active)!,
      task = this.extraction;
    let right: T.Vector3;
    if (task.kind === "battery")
      right = rig.dial.localToWorld(new T.Vector3(0.23, 0, 0.14));
    else if (task.kind === "salvage")
      right = rig.component.localToWorld(new T.Vector3(0.18, 0.12, 0.2));
    else right = this.tool.position.clone();
    return {
      right,
      left:
        task.kind === "battery"
          ? rig.root.localToWorld(new T.Vector3(-0.3, 1, 0.25))
          : right.clone().add(new T.Vector3(-0.25, 0.02, 0)),
    };
  }
  visibility(p: T.Vector3, target: string | null) {
    for (const site of this.sites) {
      this.roots.get(site.id)!.visible =
        target === site.id || Math.hypot(p.x - site.x, p.z - site.z) < 110;
      this.labels.get(site.id)!.visible =
        this.gather.active !== site.id &&
        (target === site.id || Math.hypot(p.x - site.x, p.z - site.z) < 24);
    }
  }
}
