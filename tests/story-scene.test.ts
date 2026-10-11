// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import * as THREE from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { portfolio } from "../data/portfolio";

const gpu = vi.hoisted(() => ({
  render: vi.fn(), dispose: vi.fn(), setPixelRatio: vi.fn(), compile: vi.fn(async () => {}),
}));
let frame: ((timestamp: number) => void) | null;
let assetPromise: Promise<{ scene: THREE.Group }> | undefined;

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    domElement: HTMLCanvasElement;
    private pixelRatio = 1;
    constructor({ canvas }: { canvas: HTMLCanvasElement }) { this.domElement = canvas; }
    setPixelRatio(value: number) { this.pixelRatio = value; gpu.setPixelRatio(value); }
    getPixelRatio() { return this.pixelRatio; }
    setSize() {}
    setAnimationLoop(callback: typeof frame) { frame = callback; }
    compileAsync = gpu.compile;
    render = gpu.render;
    dispose = gpu.dispose;
  }, PMREMGenerator: class {
    fromScene() { return new actual.WebGLRenderTarget(1, 1); }
    dispose() {}
  } };
});
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({ GLTFLoader: class {
  setMeshoptDecoder() { return this; }
  loadAsync() { return assetPromise; }
} }));
vi.mock("../components/story/scene/environment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/story/scene/environment")>();
  return { ...actual, createBlobShadow() {
    const material = new THREE.MeshBasicMaterial();
    return { mesh: new THREE.Mesh(new THREE.PlaneGeometry(), material), material };
  } };
});

import { StoryScene } from "../components/story/scene/story-scene";

let scene: StoryScene;
let canvas: HTMLCanvasElement;
let asset: THREE.Group;
let geometry: THREE.BoxGeometry;
let material: THREE.MeshStandardMaterial;
let texture: THREE.Texture;
let timestamp: number;
let resize: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  frame = null;
  timestamp = performance.now() + 5000;
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {} disconnect() {}
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => JSON.parse(readFileSync(new NodeURL(`../public${url}`, import.meta.url), "utf8")) })));
  geometry = new THREE.BoxGeometry();
  texture = new THREE.Texture();
  material = new THREE.MeshStandardMaterial({ map: texture });
  asset = new THREE.Group();
  for (const name of ["Torso", "Head", "RightArm", "LeftArm", "RightLeg", "LeftLeg"]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    asset.add(mesh);
  }
  assetPromise = Promise.resolve({ scene: asset });
  canvas = document.createElement("canvas");
  scene = new StoryScene({ canvas, techs: portfolio.profiles.dev.techStack, theme: "dev", reducedMotion: false });
});

afterEach(() => {
  scene.dispose();
  vi.unstubAllGlobals();
});

const tick = () => { timestamp += 16.7; frame?.(timestamp); };

it("prewarms shaders, skips unchanged reduced-motion frames and invalidates on scroll and resize", async () => {
  scene.setReducedMotion(true);
  await scene.load();
  expect(gpu.compile).toHaveBeenCalledTimes(1);
  tick();
  expect(gpu.render).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 30; i++) tick();
  expect(gpu.render).toHaveBeenCalledTimes(1);
  scene.setStory(1.5);
  tick();
  expect(gpu.render).toHaveBeenCalledTimes(2);
  scene.setStory(1.5);
  tick();
  expect(gpu.render).toHaveBeenCalledTimes(2);
  resize();
  tick();
  expect(gpu.render).toHaveBeenCalledTimes(3);
  scene.setReducedMotion(false);
  tick(); tick();
  expect(gpu.render).toHaveBeenCalledTimes(5);
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  tick();
  expect(gpu.render).toHaveBeenCalledTimes(5);
});

it("keeps chapter hop height reversible and reuses the renderer while changing profile", async () => {
  await scene.load();
  const rootY = () => {
    const call = gpu.render.mock.lastCall;
    if (!call) throw new Error("No rendered frame");
    return (call[0] as THREE.Scene).getObjectByName("HumanoidRootPart")!.position.y;
  };
  scene.setProfile("roblox", portfolio.profiles.roblox.techStack, 1.71);
  tick();
  const initial = rootY();
  expect(initial).toBeGreaterThan(3);
  scene.setProfile("roblox", portfolio.profiles.roblox.techStack, 2.72);
  tick();
  scene.setProfile("roblox", portfolio.profiles.roblox.techStack, 1.71);
  tick();
  expect(rootY()).toBeCloseTo(initial, 10);
  expect(gpu.dispose).not.toHaveBeenCalled();
  scene.setReducedMotion(true);
  tick();
  expect(rootY()).toBe(3);
});

it("disposes a late avatar and never starts a render loop after unmount", async () => {
  let resolveAsset!: (value: { scene: THREE.Group }) => void;
  assetPromise = new Promise((resolve) => { resolveAsset = resolve; });
  const disposals = [geometry, material, texture].map((resource) => vi.spyOn(resource, "dispose"));
  const loading = scene.load();
  scene.dispose();
  resolveAsset({ scene: asset });
  await loading;
  expect(frame).toBeNull();
  disposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  scene.dispose();
  expect(gpu.dispose).toHaveBeenCalledTimes(1);
});

it("keeps initial DPR through shader warmup and waits for sustained recovery before raising it", async () => {
  await scene.load();
  tick();
  expect(gpu.setPixelRatio).toHaveBeenLastCalledWith(1.5);
  for (let i = 0; i < 68; i++) { timestamp += 60; frame?.(timestamp); }
  expect(gpu.setPixelRatio).toHaveBeenLastCalledWith(1.25);
  for (let i = 0; i < 240; i++) { timestamp += 1000 / 60; frame?.(timestamp); }
  expect(gpu.setPixelRatio).toHaveBeenLastCalledWith(1.25);
  for (let i = 0; i < 240; i++) { timestamp += 1000 / 60; frame?.(timestamp); }
  expect(gpu.setPixelRatio).toHaveBeenLastCalledWith(1.5);
});

it("holds the goodbye wave until Sussy has sat down, then waves with the arm facing the viewer", async () => {
  await scene.load();
  const state = scene as unknown as { waveTime: number; waveSeated: boolean; story: number };
  tick();
  scene.setStory(3.75); // a long jump: the scene's own story value is still near the start
  scene.wave();
  tick();
  expect(state.waveTime).toBe(-1);
  let started = -1;
  for (let i = 0; i < 180 && started < 0; i++) {
    tick();
    if (state.waveTime >= 0) started = state.story;
  }
  expect(started).toBeGreaterThan(3.55); // seated (sitMix > 0.92)
  expect(state.waveSeated).toBe(true); // seated: only the right arm waves, Sussy stays sitting
});

it("ignores touch moves for hover and forgets a tapped point, and a scroll makes a resting mouse stale", async () => {
  await scene.load();
  const state = scene as unknown as { pointer: THREE.Vector2; pointerFresh: boolean };
  const pointer = (type: string, init: PointerEventInit = {}) => new PointerEvent(type, { clientX: 10, clientY: 10, ...init });
  canvas.dispatchEvent(pointer("pointermove", { pointerType: "touch" }));
  expect(state.pointer.x).toBe(-10);
  canvas.dispatchEvent(pointer("click", { pointerType: "touch" }));
  expect(state.pointer.x).toBe(-10);
  canvas.dispatchEvent(pointer("pointermove", { pointerType: "mouse" }));
  expect(state.pointer.x).toBeGreaterThan(-2);
  expect(state.pointerFresh).toBe(true);
  scene.setStory(1.4);
  expect(state.pointerFresh).toBe(false);
});

it("walks on a gentle scroll, accelerates into a run on a fast one and idles when the page rests", async () => {
  await scene.load();
  const state = scene as unknown as { actions: Record<"run" | "walk" | "idle", THREE.AnimationAction>; waveTime: number };
  const weight = (name: "run" | "walk" | "idle") => state.actions[name].getEffectiveWeight();
  // Scroll `pxPerFrame` every frame (60 fps) for `frames` frames.
  const scroll = (pxPerFrame: number, frames: number) => { for (let i = 0; i < frames; i++) { scene.addScroll(pxPerFrame); tick(); } };
  scene.setStory(0.2);
  scroll(0, 90);
  expect(weight("run")).toBeGreaterThan(0.95); // the opening shot keeps running
  scene.setStory(1.5);
  scroll(0, 300);
  expect(weight("idle")).toBeGreaterThan(0.95); // resting page: idle
  scroll(3, 120); // ~180 px/s: a gentle scroll
  expect(weight("walk")).toBeGreaterThan(0.8);
  expect(weight("run")).toBeLessThan(0.05);
  scroll(20, 4); // a burst of fast scrolling...
  expect(weight("run")).toBeLessThan(0.5); // ...does not snap straight into a sprint
  scroll(20, 90); // ~1200 px/s sustained
  expect(weight("run")).toBeGreaterThan(0.9);
  scroll(0, 240);
  expect(weight("idle")).toBeGreaterThan(0.95);
  // The hello wave is a stop: Sussy stands to wave, then runs on.
  scene.setStory(0.2);
  scroll(0, 120);
  scene.wave();
  scroll(0, 40);
  expect(state.waveTime).toBeGreaterThan(0);
  expect(weight("run")).toBeLessThan(0.1);
  scroll(0, 200);
  expect(weight("run")).toBeGreaterThan(0.9);
});

it("turns the head towards the focused tech while standing on the conveyor", async () => {
  await scene.load();
  const state = scene as unknown as { look: THREE.Vector2 };
  scene.setStory(1.5);
  for (let i = 0; i < 240; i++) tick();
  // The conveyor runs in front of Sussy (towards the camera), i.e. to the side of the running direction.
  expect(Math.abs(state.look.x)).toBeGreaterThan(0.5);
  scene.setStory(3.9); // seated: no look-at, the sit clip owns the head
  for (let i = 0; i < 240; i++) tick();
  expect(Math.abs(state.look.x)).toBeLessThan(0.05);
});
