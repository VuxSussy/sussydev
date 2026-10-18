// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Ambience } from "../components/story/scene/ambience";

const param = () => ({ value: 0, setTargetAtTime: vi.fn() });
let contextState: AudioContextState;
let allowAutoplay: boolean;
let play: ReturnType<typeof vi.fn>;

beforeEach(() => {
  contextState = "suspended";
  allowAutoplay = false;
  play = vi.fn(() => (allowAutoplay ? Promise.resolve() : Promise.reject(new DOMException("blocked", "NotAllowedError"))));
  vi.stubGlobal("Audio", class {
    loop = false;
    preload = "";
    paused = true;
    play = play;
    pause = vi.fn();
    removeAttribute = vi.fn();
  });
  vi.stubGlobal("AudioContext", class {
    currentTime = 0;
    destination = {};
    get state() { return contextState; }
    resume = vi.fn(async () => { if (allowAutoplay) contextState = "running"; });
    suspend = vi.fn(async () => {});
    close = vi.fn(async () => {});
    createGain() { return { gain: param(), connect: (node: unknown) => node }; }
    createMediaElementSource() { return { connect: (node: unknown) => node }; }
    createBufferSource() { return { connect: vi.fn(), start: vi.fn(), loop: false, buffer: null }; }
    decodeAudioData = vi.fn(async () => ({}));
  });
  vi.stubGlobal("fetch", vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })));
});

afterEach(() => vi.unstubAllGlobals());

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

it("starts playing right away where the browser allows autoplay", async () => {
  allowAutoplay = true;
  const ambience = new Ambience();
  ambience.setEnabled(true);
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  expect(contextState).toBe("running");
  ambience.dispose();
});

it("retries at the first gesture when autoplay is blocked, then stops listening", async () => {
  const ambience = new Ambience();
  ambience.setEnabled(true);
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  // The visitor clicks: now the browser allows it.
  allowAutoplay = true;
  window.dispatchEvent(new Event("pointerdown"));
  await flush();
  expect(play).toHaveBeenCalledTimes(2);
  expect(contextState).toBe("running");
  window.dispatchEvent(new Event("keydown"));
  await flush();
  expect(play).toHaveBeenCalledTimes(2);
  ambience.dispose();
});

it("does not start at a gesture after the visitor turned sound off", async () => {
  const ambience = new Ambience();
  ambience.setEnabled(true);
  await flush();
  ambience.setEnabled(false);
  allowAutoplay = true;
  window.dispatchEvent(new Event("pointerdown"));
  await flush();
  expect(play).toHaveBeenCalledTimes(1);
  ambience.dispose();
});
