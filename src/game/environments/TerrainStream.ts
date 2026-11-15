import * as T from "three";
import type { Destination } from "../../simulation/engine";
import { terrainHeight } from "./Terrain";
// The detailed outpost terrain covers five 130 m tiles in each direction.
// Recycle a small outer ring instead of an invisible fence or an enormous mesh.
export class TerrainStream {
  tiles = new Map<string, T.Mesh>();
  last = "";
  constructor(
    public scene: T.Scene,
    public destination: Destination,
    public material: T.Material | T.Material[],
  ) {}
  update(x: number, z: number) {
    const ix = Math.floor((x + 65) / 130),
      iz = Math.floor((z + 65) / 130);
    const key = ix + ":" + iz;
    if (key === this.last) return;
    this.last = key;
    const desired = new Set<string>();
    for (let a = ix - 2; a <= ix + 2; a++)
      for (let b = iz - 2; b <= iz + 2; b++) {
        if (Math.abs(a) <= 2 && Math.abs(b) <= 2) continue;
        const id = a + ":" + b;
        desired.add(id);
        if (this.tiles.has(id)) continue;
        const geometry = new T.PlaneGeometry(130, 130, 32, 32);
        geometry.rotateX(-Math.PI / 2);
        const positions = geometry.attributes.position,
          colours: number[] = [];
        const base = new T.Color(
          this.destination === "moon" ? 0x737a7b : 0xa07152,
        );
        for (let i = 0; i < positions.count; i++) {
          const px = positions.getX(i) + a * 130,
            pz = positions.getZ(i) + b * 130;
          positions.setXYZ(i, px, terrainHeight(px, pz, this.destination), pz);
          geometry.attributes.uv.setXY(i, px / 650 + 0.5, 0.5 - pz / 650);
          colours.push(base.r, base.g, base.b);
        }
        geometry.setAttribute(
          "color",
          new T.Float32BufferAttribute(colours, 3),
        );
        geometry.computeVertexNormals();
        const mesh = new T.Mesh(geometry, this.material);
        mesh.receiveShadow = true;
        mesh.userData.noCollision = true;
        this.scene.add(mesh);
        this.tiles.set(id, mesh);
      }
    for (const [id, tile] of this.tiles)
      if (!desired.has(id)) {
        this.scene.remove(tile);
        tile.geometry.dispose();
        this.tiles.delete(id);
      }
  }
}
