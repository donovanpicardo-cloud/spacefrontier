type Frame = { interval: number; cpu: number; parts: Record<string, number> };
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
const percentile = (values: number[], fraction: number) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ||
    0
  );
};
export class FrameDiagnostics {
  frames: Frame[] = [];
  current: Frame | null = null;
  startAt = 0;
  markedAt = 0;
  active = false;
  lastGameplay: ReturnType<FrameDiagnostics["snapshot"]> | null = null;
  gpu: number[] = [];
  pending: WebGLQuery[] = [];
  query: WebGLQuery | null = null;
  timer: TimerExtension | null;
  backend = "";
  lastSent = 0;
  session = Math.random().toString(36).slice(2);
  sequence = 0;
  constructor(public gl: WebGL2RenderingContext) {
    this.timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    this.backend = String(
      gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
    );
  }
  begin(interval: number, active: boolean) {
    if (this.active !== active) {
      if (this.active && this.frames.length >= 30)
        this.lastGameplay = this.snapshot();
      this.frames.length = 0;
      this.gpu.length = 0;
      this.active = active;
    }
    this.startAt = this.markedAt = performance.now();
    this.current = { interval, cpu: 0, parts: {} };
  }
  mark(name: string) {
    if (!this.current) return;
    const now = performance.now();
    this.current.parts[name] = now - this.markedAt;
    this.markedAt = now;
  }
  beginGPU() {
    const gl = this.gl,
      timer = this.timer;
    if (!timer) return;
    while (
      this.pending.length &&
      gl.getQueryParameter(this.pending[0], gl.QUERY_RESULT_AVAILABLE)
    ) {
      const q = this.pending.shift()!;
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT))
        this.gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
    if (this.gpu.length > 60) this.gpu.splice(0, this.gpu.length - 60);
    if (this.sequence++ % 8 || this.pending.length >= 4) return;
    this.query = gl.createQuery();
    if (this.query) gl.beginQuery(timer.TIME_ELAPSED_EXT, this.query);
  }
  endGPU() {
    if (!this.query || !this.timer) return;
    this.gl.endQuery(this.timer.TIME_ELAPSED_EXT);
    this.pending.push(this.query);
    this.query = null;
  }
  finish() {
    if (!this.current) return;
    this.current.cpu = performance.now() - this.startAt;
    this.frames.push(this.current);
    this.current = null;
    if (this.frames.length > 240) this.frames.shift();
  }
  snapshot() {
    const frames = this.frames,
      n = Math.max(1, frames.length);
    const parts: Record<string, number> = {};
    for (const f of frames)
      for (const [k, value] of Object.entries(f.parts))
        parts[k] = (parts[k] || 0) + value / n;
    const averageInterval = frames.reduce((sum, f) => sum + f.interval, 0) / n;
    return {
      state: this.active ? "playing" : "menu",
      samples: frames.length,
      fps: averageInterval ? 1000 / averageInterval : 0,
      cpuMs: frames.reduce((sum, f) => sum + f.cpu, 0) / n,
      frameP95: percentile(
        frames.map((f) => f.interval),
        0.95,
      ),
      cpuP95: percentile(
        frames.map((f) => f.cpu),
        0.95,
      ),
      gpuMs: this.gpu.length
        ? this.gpu.reduce((a, b) => a + b, 0) / this.gpu.length
        : null,
      backend: this.backend,
      parts,
    };
  }
  publish(metadata: Record<string, unknown>) {
    if (
      !import.meta.env.DEV ||
      performance.now() - this.lastSent < 5000 ||
      this.frames.length < 5
    )
      return;
    this.lastSent = performance.now();
    // Development-only diagnostics stay on this localhost server. No game saves or inputs are sent.
    void fetch("/__frontier_performance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frontier-Profile": "1",
      },
      body: JSON.stringify({
        ...this.snapshot(),
        lastGameplay: this.lastGameplay,
        ...metadata,
        session: this.session,
        userAgent: navigator.userAgent,
        recordedAt: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
  dispose() {
    for (const q of this.pending) this.gl.deleteQuery(q);
    if (this.query) this.gl.deleteQuery(this.query);
  }
}

