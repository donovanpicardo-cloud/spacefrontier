import { defineConfig } from "vite";
import {localPerformanceReports} from './server/performance.mjs';
export default defineConfig({
  plugins:[localPerformanceReports()],
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
