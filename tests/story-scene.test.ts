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
  scene = new StoryScene({ canvas: document.createElement("canvas"), techs: portfolio.profiles.dev.techStack, theme: "dev", reducedMotion: false });
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
  const state = scene as unknown as { waveTime: number; waveSide: number; story: number };
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
  expect(state.waveSide).toBe(1);
});
