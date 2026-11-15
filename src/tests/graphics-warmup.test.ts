import { afterEach, describe, expect, it, vi } from "vitest";
import * as T from "three";
import { warmGraphics } from "../game/GraphicsWarmup";

afterEach(() => vi.useRealTimers());
const fake = (get: () => unknown) =>
  ({
    compile: () => new Set([new T.MeshStandardMaterial()]),
    properties: { get },
  }) as unknown as Pick<T.WebGLRenderer, "compile" | "properties">;
describe("graphics warm-up cannot permanently lock gameplay", () => {
  it("finishes when an asynchronously replaced material loses its GPU program", async () => {
    vi.useFakeTimers();
    let disposed = false;
    const renderer = fake(() =>
      disposed ? {} : { currentProgram: { isReady: () => false } },
    );
    const done = vi.fn();
    const pending = warmGraphics(
      renderer,
      new T.Scene(),
      new T.Camera(),
      () => false,
    ).then(done);
    disposed = true;
    await vi.advanceTimersByTimeAsync(16);
    await pending;
    expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds driver warm-up time even if a program never becomes ready", async () => {
    vi.useFakeTimers();
    const pending = warmGraphics(
      fake(() => ({ currentProgram: { isReady: () => false } })),
      new T.Scene(),
      new T.Camera(),
      () => false,
      64,
    );
    await vi.advanceTimersByTimeAsync(64);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("stops polling a superseded or disposed world", async () => {
    vi.useFakeTimers();
    let cancelled = false;
    const pending = warmGraphics(
      fake(() => ({ currentProgram: { isReady: () => false } })),
      new T.Scene(),
      new T.Camera(),
      () => cancelled,
    );
    cancelled = true;
    await vi.advanceTimersByTimeAsync(16);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("recovers from a driver readiness error", async () => {
    await expect(
      warmGraphics(
        fake(() => ({
          currentProgram: {
            isReady: () => {
              throw Error("disposed program");
            },
          },
        })),
        new T.Scene(),
        new T.Camera(),
        () => false,
      ),
    ).resolves.toBeUndefined();
  });
  it("recovers if renderer material properties become unavailable", async () => {
    await expect(
      warmGraphics(
        fake(() => {
          throw Error("renderer disposed");
        }),
        new T.Scene(),
        new T.Camera(),
        () => false,
      ),
    ).resolves.toBeUndefined();
  });
});

