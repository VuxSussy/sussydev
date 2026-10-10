import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { TechStack } from "@/data/portfolio";
import { buildR6Rig, clipFromJson, createSitClip, type ClipJson, type Motor } from "@/lib/rbx/rig";
import { chapterJumpTime, damp, sitMix, smoothstep, smootherstep, sunsetMix, techPosition, techVisibility } from "@/lib/story";
import { createBlobShadow, createSky, createStudioFloor, createSunsetWorld, SIT_SPOT, type SceneTheme } from "./environment";
import { TechCarousel } from "./tech-carousel";
import { disposeObjects } from "./dispose";

export type StorySceneOptions = {
  canvas: HTMLCanvasElement;
  techs: readonly TechStack[];
  theme: SceneTheme;
  reducedMotion: boolean;
  onProgress?: (fraction: number) => void;
  onTechHover?: (index: number) => void;
  onTechSelect?: (index: number) => void;
};

type Key = { s: number; cam: [number, number, number]; target: [number, number, number]; yaw: number; pos: [number, number] };

/** Camera / character keyframes along the story (Roblox studs; Sussy faces -Z at yaw 0). */
const KEYS: Key[] = [
  { s: 0, cam: [-2.5, 3.7, 17.5], target: [-2.5, 2.6, 0], yaw: Math.PI - 0.5, pos: [0, 0] },
  { s: 0.8, cam: [-2.3, 3.5, 16.6], target: [-2.3, 2.6, 0], yaw: Math.PI - 0.42, pos: [0, 0] },
  { s: 1.12, cam: [-3.4, 8.4, 21.5], target: [-3.4, 2.1, 1.4], yaw: Math.PI / 2, pos: [0, 0] },
  { s: 1.9, cam: [-3.0, 8.1, 21], target: [-3.0, 2.1, 1.4], yaw: Math.PI / 2, pos: [0, 0] },
  { s: 2.2, cam: [-6.4, 4.1, 23], target: [-6.4, 2.8, 0], yaw: Math.PI / 2 + 0.3, pos: [0, 0] },
  { s: 2.82, cam: [-6.0, 4.0, 22.5], target: [-6.0, 2.8, 0], yaw: Math.PI / 2 + 0.3, pos: [0, 0] },
  { s: 3.42, cam: [SIT_SPOT.x - 3.6, 5.6, SIT_SPOT.y + 31], target: [SIT_SPOT.x - 3.6, 3.2, SIT_SPOT.y - 12], yaw: 0, pos: [SIT_SPOT.x, SIT_SPOT.y] },
  { s: 4, cam: [SIT_SPOT.x - 3.3, 5.0, SIT_SPOT.y + 27], target: [SIT_SPOT.x - 3.3, 3.2, SIT_SPOT.y - 12], yaw: 0, pos: [SIT_SPOT.x, SIT_SPOT.y] },
];

const ROOT_STANDING = 3;
const ROOT_SEATED = 1.5;
const RUN_SPEED = 13;
const COLORS = {
  fog: new THREE.Color("#b07a74"), key: new THREE.Color("#fff4e8"), sunsetKey: new THREE.Color("#ffb27a"),
  rim: new THREE.Color("#8f7cff"), sky: new THREE.Color("#d9dbe6"), sunsetSky: new THREE.Color("#ffc9a8"),
  ground: new THREE.Color("#2a2a30"), sunsetGround: new THREE.Color("#3c3048"),
};

function sampleKeys(s: number, portrait: boolean) {
  let i = 0;
  while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smootherstep(Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s))));
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const cam = a.cam.map((v, k) => lerp(v, b.cam[k])) as [number, number, number];
  const target = a.target.map((v, k) => lerp(v, b.target[k])) as [number, number, number];
  if (portrait) {
    // Centre the character, back off so the full body fits, and keep it clear of the copy:
    // below the text in the first chapters, above the contact panel at sunset.
    const shift = target[0];
    cam[0] -= shift;
    target[0] -= shift;
    for (let k = 0; k < 3; k++) cam[k] = target[k] + (cam[k] - target[k]) * 1.45;
    const lift = 3.8 + 1.6 * techVisibility(s) - 9.8 * smoothstep(2.9, 3.4, s);
    cam[1] += lift;
    target[1] += lift;
  }
  return { cam, target, yaw: lerp(a.yaw, b.yaw), pos: [lerp(a.pos[0], b.pos[0]), lerp(a.pos[1], b.pos[1])] as const };
}

export class StoryScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 600);
  private timer = new THREE.Timer();
  private mixer?: THREE.AnimationMixer;
  private actions: Record<"run" | "idle" | "sit" | "jump" | "land", THREE.AnimationAction> | null = null;
  /** Seconds since Sussy was clicked (-1 = idle). Chapter hops are derived from story progress instead. */
  private clickHopTime = -1;
  private overCharacter = false;
  private character = new THREE.Group();
  private sky: ReturnType<typeof createSky>;
  private floor: ReturnType<typeof createStudioFloor>;
  private shadow = createBlobShadow();
  private sunset: ReturnType<typeof createSunsetWorld>;
  private carousel: TechCarousel;
  private keyLight = new THREE.DirectionalLight("#fff4e8", 2.4);
  private rimLight = new THREE.DirectionalLight("#9fb0ff", 2.2);
  private hemi = new THREE.HemisphereLight("#d9dbe6", "#2a2a30", 0.7);
  private fog = new THREE.Fog("#0e0e11", 30, 160);
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-10, -10);
  private parallax = new THREE.Vector2();
  private lookAt = new THREE.Vector3();
  private story = 0;
  private storyTarget = 0;
  private departure = 0;
  private departureTarget = 0;
  private hovered = -1;
  private treadmill = new THREE.Vector2();
  private reducedMotion: boolean;
  private disposed = false;
  private needsRender = true;
  private loadAbort = new AbortController();
  private pendingModel: THREE.Object3D | null = null;
  private environmentTarget: THREE.WebGLRenderTarget;
  private quality = { tiers: [1.5, 1.25, 1, 0.8], tier: 0, frames: 0, time: 0, stable: 0, warmup: true };
  private observer: ResizeObserver;
  private studioRim = new THREE.Color();
  private studioFog = new THREE.Color();
  /** Dev-only: pin the camera to inspect the scene from any angle. */
  debugView: { position: [number, number, number]; target: [number, number, number] } | null = null;

  constructor(private options: StorySceneOptions) {
    const { canvas } = options;
    this.reducedMotion = options.reducedMotion;
    this.sky = createSky(options.theme);
    this.floor = createStudioFloor(options.theme);
    this.studioRim.set(options.theme === "roblox" ? "#6aa8ff" : "#9fb0ff");
    this.studioFog.set(options.theme === "roblox" ? "#0a1120" : "#0e0e11");
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.quality.tier = coarse ? 2 : 0;
    this.applyPixelRatio();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();
    room.dispose();
    this.scene.fog = this.fog;

    this.keyLight.position.set(4, 7, 6);
    this.rimLight.position.set(-5, 5, -6);
    this.sky.material.depthTest = false;
    this.sunset = createSunsetWorld({ grassCount: coarse ? 1400 : 3200 });
    this.carousel = new TechCarousel(options.techs, options.theme === "roblox" ? "#6cb4ff" : "#f3b47c");
    this.scene.add(this.sky.mesh, this.floor.mesh, this.shadow.mesh, this.sunset.group, this.carousel.group, this.character, this.hemi, this.keyLight, this.rimLight, this.keyLight.target);
    this.keyLight.target.position.set(0, 2, 0);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("click", this.onClick);
    this.timer.connect(document);
  }

  /** Load the character + animation clips, then start rendering. */
  async load() {
    let done = 0;
    const total = 6;
    const tick = () => { if (!this.disposed) this.options.onProgress?.(++done / total); };
    const fetchJson = <T,>(url: string) => fetch(url, { signal: this.loadAbort.signal }).then((r) => { if (!r.ok) throw new Error(url); return r.json() as Promise<T>; }).then((j) => { tick(); return j; });
    const [gltf, index, run, idle, jump, land] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("/models/sussy/sussy-r6.glb").then((g) => {
        if (this.disposed) disposeObjects(g.scene);
        else { this.pendingModel = g.scene; tick(); }
        return g;
      }),
      fetchJson<{ motors: Record<string, Motor> }>("/anims/index.json"),
      fetchJson<ClipJson>("/anims/run-v4.json"),
      fetchJson<ClipJson>("/anims/idle-v2.json"),
      fetchJson<ClipJson>("/anims/jump.json"),
      fetchJson<ClipJson>("/anims/normal-land.json"),
    ]);
    if (this.disposed) return;
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mat = o.material as THREE.MeshStandardMaterial;
        mat.envMapIntensity = 0.8;
      }
    });
    const rig = buildR6Rig(gltf.scene, index.motors);
    rig.root.position.y = ROOT_STANDING;
    this.character.add(rig.root);
    this.pendingModel = null;
    this.mixer = new THREE.AnimationMixer(rig.root);
    const action = (clip: THREE.AnimationClip) => {
      const a = this.mixer!.clipAction(clip);
      a.play();
      a.setEffectiveWeight(0);
      return a;
    };
    const oneShot = (clip: THREE.AnimationClip) => {
      const a = action(clip);
      a.timeScale = 0; // scrubbed manually from the hop time
      return a;
    };
    this.actions = {
      run: action(clipFromJson(run)), idle: action(clipFromJson(idle)), sit: action(createSitClip()),
      jump: oneShot(clipFromJson(jump)), land: oneShot(clipFromJson(land)),
    };
    this.story = this.storyTarget;
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.setAnimationLoop(this.frame);
  }

  setStory(story: number) {
    if (story !== this.storyTarget) this.needsRender = true;
    this.storyTarget = story;
  }

  setDeparting(value: boolean) {
    this.departureTarget = value ? 1 : 0;
    this.needsRender = true;
  }

  setProfile(theme: SceneTheme, techs: readonly TechStack[], story: number) {
    if (this.options.theme !== theme) {
      this.options.theme = theme;
      this.options.techs = techs;
      this.sky.setTheme(theme);
      this.floor.setTheme(theme);
      this.studioRim.set(theme === "roblox" ? "#6aa8ff" : "#9fb0ff");
      this.studioFog.set(theme === "roblox" ? "#0a1120" : "#0e0e11");
      this.scene.remove(this.carousel.group);
      this.carousel.dispose();
      this.carousel = new TechCarousel(techs, theme === "roblox" ? "#6cb4ff" : "#f3b47c");
      this.scene.add(this.carousel.group);
      this.hovered = -1;
      this.treadmill.set(0, 0);
    }
    this.story = this.storyTarget = story;
    this.needsRender = true;
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    this.needsRender = true;
  }

  private applyPixelRatio() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.tiers[this.quality.tier]));
  }

  private resize() {
    this.needsRender = true;
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.fov = this.camera.aspect < 0.8 ? 40 : 32;
    this.camera.updateProjectionMatrix();
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    // Sussy is clickable (hop easter egg); raycast on pointer move only, not every frame.
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.overCharacter = this.canHop() && this.raycaster.intersectObject(this.character, true).length > 0;
    if (this.hovered < 0) this.renderer.domElement.style.cursor = this.overCharacter ? "pointer" : "";
    this.needsRender = true;
  };

  private canHop() {
    return !this.reducedMotion && sitMix(this.story) < 0.05 && this.clickHopTime < 0;
  }

  private onPointerLeave = () => { this.pointer.set(-10, -10); this.overCharacter = false; this.needsRender = true; };

  private onClick = () => {
    if (this.hovered >= 0) this.options.onTechSelect?.(this.hovered);
    else if (this.overCharacter && this.canHop()) {
      this.clickHopTime = 0;
      this.needsRender = true;
    }
  };

  private updateHover(visibility: number) {
    let hovered = -1;
    if (visibility > 0.6 && this.pointer.x > -2) {
      this.carousel.group.updateMatrixWorld(true);
      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.carousel.pickables, false).find((hit) => hit.object.parent?.visible);
      if (hit) hovered = hit.object.userData.index as number;
    }
    if (hovered !== this.hovered) {
      this.hovered = hovered;
      this.renderer.domElement.style.cursor = hovered >= 0 || this.overCharacter ? "pointer" : "";
      this.options.onTechHover?.(hovered);
      this.needsRender = true;
    }
  }

  private adaptQuality(dt: number) {
    const q = this.quality;
    if (q.warmup) { q.warmup = false; return; }
    if (dt <= 0) return;
    q.frames++;
    q.time += dt;
    if (q.time < 4) return;
    const fps = q.frames / q.time;
    q.frames = 0;
    q.time = 0;
    q.stable = fps > 58 ? q.stable + 1 : 0;
    if (fps < 45 && q.tier < q.tiers.length - 1) {
      q.tier++;
      this.applyPixelRatio();
    } else if (q.stable >= 2 && q.tier > 0 && window.devicePixelRatio > q.tiers[q.tier]) {
      q.tier--;
      q.stable = 0;
      this.applyPixelRatio();
    }
  }

  private frame = (timestamp: number) => {
    this.timer.update(timestamp);
    if (document.hidden || !this.actions || !this.mixer) return;
    const reduced = this.reducedMotion;
    if (reduced && !this.needsRender) return;
    this.needsRender = false;
    const elapsed = this.timer.getDelta();
    const dt = Math.min(Math.max(elapsed, 0), 0.05);
    const time = reduced ? 0 : this.timer.getElapsed();
    this.story = reduced ? this.storyTarget : damp(this.story, this.storyTarget, 4.5, dt);
    const s = this.story;
    const portrait = this.camera.aspect < 0.8;

    // Camera path + subtle pointer parallax.
    const key = sampleKeys(s, portrait);
    const px = this.pointer.x > -2 && !reduced ? this.pointer.x : 0;
    const py = this.pointer.y > -2 && !reduced ? this.pointer.y : 0;
    this.parallax.set(reduced ? 0 : damp(this.parallax.x, px, 3, dt), reduced ? 0 : damp(this.parallax.y, py, 3, dt));
    this.camera.position.set(key.cam[0] + this.parallax.x * 0.45, key.cam[1] + this.parallax.y * 0.25, key.cam[2]);
    this.lookAt.set(...key.target);
    this.departure = reduced ? 0 : damp(this.departure, this.departureTarget, 10, dt);
    this.camera.position.sub(this.lookAt).multiplyScalar(1 + this.departure * 0.08).add(this.lookAt);
    if (this.debugView) {
      this.camera.position.set(...this.debugView.position);
      this.lookAt.set(...this.debugView.target);
    }
    this.camera.lookAt(this.lookAt);

    // Character placement and animation weights.
    const sunset = sunsetMix(s);
    const sit = sitMix(s);
    this.character.position.set(key.pos[0], 0, key.pos[1]);
    this.character.rotation.y = key.yaw;
    const chapterHop = this.options.theme === "roblox" && !reduced ? chapterJumpTime(s) : -1;
    if (this.clickHopTime >= 0) {
      this.clickHopTime += dt;
      if (this.clickHopTime > 0.95) this.clickHopTime = -1;
    }
    const jumpTime = chapterHop >= 0 ? chapterHop : this.clickHopTime;
    let hop = 0;
    let jumpW = 0;
    let landW = 0;
    if (jumpTime >= 0) {
      const t = jumpTime;
      hop = Math.sin(Math.PI * Math.min(t / 0.62, 1)) * 1.4;
      jumpW = smoothstep(0, 0.06, t) * (1 - smoothstep(0.5, 0.64, t));
      landW = smoothstep(0.56, 0.64, t) * (1 - smoothstep(0.78, 0.92, t));
      this.actions.jump.time = Math.min(t, this.actions.jump.getClip().duration);
      this.actions.land.time = Math.min(Math.max(t - 0.62, 0), this.actions.land.getClip().duration);
    }
    const rootY = ROOT_STANDING + (ROOT_SEATED - ROOT_STANDING) * sit + hop;
    this.character.children[0].position.y = rootY;
    const moving = (1 - sit) * (1 - jumpW - landW);
    this.actions.jump.setEffectiveWeight(jumpW);
    this.actions.land.setEffectiveWeight(landW);
    this.actions.run.setEffectiveWeight(reduced ? 0 : moving);
    this.actions.idle.setEffectiveWeight(reduced ? moving : 0);
    this.actions.sit.setEffectiveWeight(sit);
    this.actions.run.timeScale = 1 - 0.3 * smoothstep(3.15, 3.42, s);
    if (reduced) this.mixer.setTime(0);
    else this.mixer.update(dt);

    // Treadmill: the floor grid flows opposite to the running direction while in the studio.
    // Facing is (-sin yaw, 0, -cos yaw); the floor plane's local Y maps to world -Z.
    if (!reduced) {
      const speed = RUN_SPEED * moving * (1 - sunset) * dt;
      this.treadmill.x -= Math.sin(key.yaw) * speed;
      this.treadmill.y += Math.cos(key.yaw) * speed;
    }
    this.floor.material.uniforms.uOffset.value.copy(this.treadmill);
    this.floor.material.uniforms.uOpacity.value = 1 - sunset;
    this.floor.mesh.visible = sunset < 0.999;
    this.shadow.mesh.position.set(key.pos[0], 0.02, key.pos[1]);
    this.shadow.mesh.rotation.z = key.yaw;
    this.shadow.material.opacity = (1 - 0.25 * sit) * (1 - 0.18 * hop);
    this.shadow.mesh.scale.setScalar(1 - 0.12 * hop);

    // Tech conveyor.
    const visibility = techVisibility(s);
    // Shift the lane so the focused tech lines up with Sussy's feet despite camera parallax.
    const lane = this.carousel.group.position.z;
    this.carousel.group.position.x = (this.camera.position.x * lane) / Math.max(this.camera.position.z, 1);
    this.carousel.update(techPosition(s, this.options.techs.length), visibility, this.hovered, time);
    this.updateHover(visibility);

    // Studio → sunset.
    this.sky.material.uniforms.uMix.value = sunset;
    this.sky.mesh.position.copy(this.camera.position);
    const rise = 1 - Math.pow(1 - sunset, 3);
    this.sunset.group.position.y = -9 * (1 - rise);
    this.sunset.update(time, sunset, this.renderer.getPixelRatio());
    this.fog.color.copy(this.studioFog).lerp(COLORS.fog, sunset);
    this.fog.near = 30 - 10 * sunset;
    this.fog.far = 160 + 80 * sunset;
    this.keyLight.color.copy(COLORS.key).lerp(COLORS.sunsetKey, sunset);
    this.keyLight.position.set(4 - 12 * sunset, 7 - 4.5 * sunset, 6 - 18 * sunset);
    this.keyLight.intensity = 2.4 + 0.6 * sunset;
    this.rimLight.color.copy(this.studioRim).lerp(COLORS.rim, sunset);
    this.rimLight.intensity = 2.2 - 1.2 * sunset;
    this.hemi.color.copy(COLORS.sky).lerp(COLORS.sunsetSky, sunset);
    this.hemi.groundColor.copy(COLORS.ground).lerp(COLORS.sunsetGround, sunset);
    this.scene.environmentIntensity = 0.45 - 0.2 * sunset;

    if (!reduced) this.adaptQuality(elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.loadAbort.abort();
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("click", this.onClick);
    this.timer.dispose();
    this.mixer?.stopAllAction();
    if (this.character.children[0]) this.mixer?.uncacheRoot(this.character.children[0]);
    disposeObjects(this.scene, ...(this.pendingModel ? [this.pendingModel] : []));
    this.pendingModel = null;
    this.environmentTarget.dispose();
    this.renderer.dispose();
  }
}
