import type { Camera, Object3D, WebGLRenderer } from "three";

/** Three's async poll can throw outside its promise when a loading material is disposed. */
export function warmGraphics(
  renderer: Pick<WebGLRenderer, "compile" | "properties">,
  scene: Object3D,
  camera: Camera,
  cancelled: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  return new Promise((resolve) => {
    if (cancelled()) {
      resolve();
      return;
    }
    let materials: ReturnType<WebGLRenderer["compile"]>;
    try {
      materials = renderer.compile(scene, camera);
    } catch {
      resolve();
      return;
    }
    const deadline = performance.now() + timeoutMs;
    const poll = () => {
      if (cancelled() || performance.now() >= deadline) {
        resolve();
        return;
      }
      for (const material of materials) {
        // Asset loading can replace/dispose a material between polling turns.
        try {
          const program = (
            renderer.properties.get(material) as
              | {
                  currentProgram?: { isReady(): boolean };
                }
              | undefined
          )?.currentProgram;
          if (!program || program.isReady()) materials.delete(material);
        } catch {
          materials.delete(material);
        }
      }
      if (!materials.size) resolve();
      else setTimeout(poll, 16);
    };
    poll();
  });
}
