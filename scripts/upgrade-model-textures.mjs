import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import sharp from "sharp";

// Restore genuine source detail while retaining game geometry, rigging and pivots.
const [target, source] = process.argv.slice(2);
assert(target && source, "Usage: node scripts/upgrade-model-textures.mjs target.glb source.glb");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(target);
const signature = doc => JSON.stringify({
  accessors: doc.getRoot().listAccessors().map(a => [a.getName(), a.getType(), Array.from(a.getArray())]),
  nodes: doc.getRoot().listNodes().map(n => [n.getName(), n.getMatrix(), n.listChildren().map(c => c.getName())]),
  animations: doc.getRoot().listAnimations().map(a => [a.getName(), a.listChannels().length]),
});
const before = createHash("sha256").update(signature(document)).digest("hex");
const bytes = await readFile(source), length = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.subarray(20, 20 + length));
const bin = bytes.subarray(28 + length);
const upgraded = [];
for (const texture of document.getRoot().listTextures()) {
  const image = json.images?.find(i => i.name === texture.getName());
  if (!image || image.bufferView === undefined) continue;
  const view = json.bufferViews[image.bufferView];
  const original = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const info = await sharp(original).metadata(), old = texture.getSize();
  if (!info.width || !old || Math.min(2048, info.width) < old[0]) continue;
  const color = /basecolor|color/i.test(texture.getName());
  const result = await sharp(original).resize({width:2048,height:2048,fit:"inside",withoutEnlargement:true}).webp({lossless:!color,quality:94,effort:6}).toBuffer();
  texture.setImage(new Uint8Array(result)).setMimeType("image/webp");
  upgraded.push({name:texture.getName(), from:old, to:texture.getSize()});
}
const output = await io.writeBinary(document), decoded = await io.readBinary(output);
assert.equal(createHash("sha256").update(signature(decoded)).digest("hex"), before,
  "Geometry, hierarchy or animation data changed");
if (upgraded.length) await writeFile(target, output);
console.log(JSON.stringify({target, upgraded, bytes:output.length, geometry:"Verified unchanged"}));

