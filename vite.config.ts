import { defineConfig } from "vite";
import {localPerformanceReports} from './server/performance.mjs';
export default defineConfig({
  plugins:[localPerformanceReports()],
  build: { rollupOptions: { output: {
    manualChunks(id) {
      // Three publishes its renderer and core separately; retain that boundary.
      if (id.includes("/three/build/three.core.js")) return "three-core";
      if (id.includes("/three/build/three.module.js")) return "three-renderer";
    },
  } } },
});

