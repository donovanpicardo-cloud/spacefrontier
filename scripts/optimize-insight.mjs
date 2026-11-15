import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

const [source, output = "public/models/insight.glb"] = process.argv.slice(2);
if (!source) throw new Error("Usage: npm run optimize:insight -- path/to/original-insight.glb [output.glb]");
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
  "meshopt.decoder": MeshoptDecoder,
});
const original = await readFile(source);
const document = await io.readBinary(original);

// Record the actual geometry and hierarchy used by landing, collisions and breakaway parts.
// Hash numerical values rather than buffer layout, which can change during serialization.
function geometrySignature(doc) {
  const root = doc.getRoot();
  const hash = array => createHash("sha256").update(JSON.stringify(Array.from(array))).digest("hex");
  const topologyHash = primitive => {
    const accessor = primitive.getIndices();
    if (!accessor) return null;
    const indices = Array.from(accessor.getArray());
    // Meshopt may cyclically rotate each triangle. Preserve triangle order and winding.
    if (primitive.getMode() === 4) for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3);
      const start = triangle.indexOf(Math.min(...triangle));
      indices.splice(i, 3, ...triangle.slice(start), ...triangle.slice(0, start));
    }
    return hash(indices);
  };
  return {
    nodes: root.listNodes().map(node => ({
      name: node.getName(), matrix: node.getMatrix(),
      children: node.listChildren().map(child => child.getName()),
      mesh: node.getMesh()?.getName(),
    })),
    meshes: root.listMeshes().map(mesh => ({
      name: mesh.getName(),
      primitives: mesh.listPrimitives().map(primitive => ({
        mode: primitive.getMode(),
        indices: topologyHash(primitive),
        attributes: Object.fromEntries(primitive.listSemantics().sort().map(semantic =>
          [semantic, hash(primitive.getAttribute(semantic).getArray())])),
      })),
    })),
  };
}
const before = geometrySignature(document);
await document.transform(
  dedup({ propertyTypes: [PropertyType.TEXTURE] }),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], lossless: true }),
);
// No simplification, vertex reordering, quantization or lossy geometry filters.
document.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const bytes = await io.writeBinary(document);
const decoded = await io.readBinary(bytes);
assert( JSON.stringify(geometrySignature(decoded)) === JSON.stringify(before),
  "Geometry or animated hierarchy changed");
assert(bytes.length < original.length, "Optimization must reduce download size");
await writeFile(output, bytes);
console.log(JSON.stringify({ originalBytes: original.length, optimizedBytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  geometry: "All vertex attributes, triangle topology/winding, nodes and transforms verified unchanged",
  textures: "Duplicate textures shared; lossless WebP, maximum 1024px",
}, null, 2));
