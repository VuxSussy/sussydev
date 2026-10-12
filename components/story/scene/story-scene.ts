import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { portfolio, type Project, type TechStack } from "@/data/portfolio";
import { buildR6Rig, clipFromJson, createSitClip, emoteWeight, jointNode, poseSampler, type ClipJson, type Motor } from "@/lib/rbx/rig";
import { arriveMix, chapterJumpTime, damp, DOOR_STORY, doorFlood, journeyX, sitMix, smoothstep, smootherstep, studioExit, sunsetMix, techPosition, techVisibility, worldReveal } from "@/lib/story";
import { createBlobShadow, createDoorFlood, createSky, createStudioDoor, createStudioFloor, createStudioProps, createSunsetWorld, ROAD_START } from "./environment";
import { Footsteps } from "./footsteps";
import { Milestones } from "./milestones";
import { TechCarousel } from "./tech-carousel";
import { disposeObjects } from "./dispose";

export type StorySceneOptions = {
  canvas: HTMLCanvasElement;
  techs: readonly TechStack[];
  reducedMotion: boolean;
  onProgress?: (fraction: number) => void;
  onTechHover?: (index: number) => void;
  onTechSelect?: (index: number) => void;
  /** The GPU dropped the WebGL context (mobile GPU reset, driver crash); rendering is paused until it returns. */
  onContextLost?: () => void;
  /** The context came back and the scene is drawing again. */
  onContextRestored?: () => void;
};

type Key = { s: number; cam: [number, number, number]; target: [number, number, number]; yaw: number };

/**
 * Camera / character keyframes along the story. `cam` and `target` are offsets from Sussy's position, which
 * follows the road (`characterPosition`); Sussy faces -Z at yaw 0, -X at yaw π/2 and the camera (+Z) at yaw π.
 */
const KEYS: Key[] = [
  { s: 0, cam: [-2.5, 3.7, 17.5], target: [-2.5, 2.6, 0], yaw: Math.PI - 0.5 },
  { s: 0.8, cam: [-2.3, 3.5, 16.6], target: [-2.3, 2.6, 0], yaw: Math.PI - 0.42 },
  { s: 1.12, cam: [-3.4, 9.4, 22.5], target: [-3.4, 1.15, 2.8], yaw: Math.PI / 2 },
  { s: 1.9, cam: [-3.0, 9.1, 22], target: [-3.0, 1.15, 2.8], yaw: Math.PI / 2 },
  // On the road the camera looks well ahead of Sussy: the roadside TV sits in the right half of the frame, clear of
  // the project panel on the left, with Sussy beside it.
  { s: 2.2, cam: [-12.0, 7.6, 37], target: [-12.0, 6.6, 0], yaw: Math.PI / 2 + 0.3 },
  { s: 3.2, cam: [-11.0, 7.0, 34], target: [-11.0, 6.0, 0], yaw: Math.PI / 2 + 0.3 },
  // Arrival: Sussy turns round under the tree and sits facing the camera, sunset behind.
  { s: 3.42, cam: [-3.6, 5.0, 21.5], target: [-3.6, 4.4, -3], yaw: Math.PI + 0.26 },
  { s: 4, cam: [-3.3, 4.6, 19], target: [-3.3, 4.3, -3], yaw: Math.PI + 0.26 },
];

/** Sussy's position on the ground: in the studio until the Work chapter, then along the road to the tree. */
export function characterPosition(story: number) {
  return [ROAD_START.x + journeyX(story, portfolio.profile.projects.length), ROAD_START.y] as const;
}

/** Scroll speed (CSS px/s) at which Sussy reaches a full run; slower scrolling walks. */
const RUN_SCROLL_SPEED = 900;
/** Ground speeds (studs/s) the walk and run cycles are authored for. */
const WALK_SPEED = 6;
/** Neck look-at limits (radians) and how much of a larger turn the body takes when standing still. */
const LOOK_YAW = 1.05;
const LOOK_PITCH = 0.45;
const BODY_TURN = 0.45;
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
/** Story value until which Sussy keeps running even without scrolling (the opening shot). */
const INTRO_RUN_END = 0.55;
const ROOT_STANDING = 3;
const ROOT_SEATED = 1.5;
const RUN_SPEED = 13;
/** Roblox blue: focus rings on the conveyor. */
const ACCENT = "#6cb4ff";
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
    // At sunset the camera stays up and looks below Sussy, so the scene sits above the panel.
    const end = smoothstep(2.9, 3.4, s);
    const lift = (3.8 + 1.6 * techVisibility(s)) * (1 - end);
    // On the road the project panel is a sheet along the bottom: look lower so the TVs and Sussy sit above it,
    // and lean towards the TV (it stands ahead of Sussy, towards -X) so both share the narrow frame.
    const road = smoothstep(2.3, 2.5, s) * (1 - end);
    cam[1] += lift + 1.2 * end + 1.5 * road;
    target[1] += lift - 6.5 * end - 7.5 * road;
    cam[0] -= 6.5 * road;
    target[0] -= 6.5 * road;
  }
  const pos = characterPosition(s);
  cam[0] += pos[0];
  cam[2] += pos[1];
  target[0] += pos[0];
  target[2] += pos[1];
  return { cam, target, yaw: lerp(a.yaw, b.yaw), pos };
}

export class StoryScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 600);
  private timer = new THREE.Timer();
  private mixer?: THREE.AnimationMixer;
  private actions: Record<"run" | "walk" | "idle" | "sit" | "jump" | "land", THREE.AnimationAction> | null = null;
  /** The Roblox R6 wave emote (rbxassetid://128777973), sampled and layered over the mixer like an Action track. */
  private waveEmote: ReturnType<typeof poseSampler> | null = null;
  /** Mixer-driven joint and its procedural offset node, by joint node name. */
  private jointsByNode = new Map<string, { joint: THREE.Object3D; offset: THREE.Object3D }>();
  private offsets: THREE.Object3D[] = [];
  /** Seconds since Sussy was clicked (-1 = idle). Chapter hops are derived from story progress instead. */
  private clickHopTime = -1;
  /** Roblox set dressing in the studio (fades with it). */
  private props = createStudioProps();
  private door = createStudioDoor();
  private flood = createDoorFlood();
  private floodCenter = new THREE.Vector3();
  /** Warm fill from the camera side so Sussy's face is lit while the sun sits behind at the end. */
  private fillLight = new THREE.DirectionalLight("#ffb990", 0);
  private lastX = 0;
  private debugClock = 0;
  private milestones!: Milestones;
  /** 0..1 dusk that slowly falls while Sussy sits at the sunset, and lifts quickly when scrolling away. */
  private dusk = 0;
  private headFrame: THREE.Object3D | null = null;
  private neckOffset: THREE.Object3D | null = null;
  /** Seated waves only move the right arm, so the sitting pose stays (standing waves play the whole emote). */
  private waveSeated = false;
  /** Seconds into the wave emote (-1 = not waving). */
  private waveTime = -1;
  private poseQ = new THREE.Quaternion();
  private poseP = new THREE.Vector3();
  private inverseQ = new THREE.Quaternion();
  /** Seconds left for a queued wave to start (0 = none queued); dropped if the user has scrolled elsewhere. */
  private waveQueue = 0;
  /** False after a scroll until the mouse moves again (hover only counts when the user points). */
  private pointerFresh = false;
  /** Scroll distance (px) since the last frame and its smoothed rate, which drive the walk -> run speed. */
  private scrollAccum = 0;
  private scrollSpeed = 0;
  /** 0 = idle, ~0.3 = walking, 1 = full run (eased: Sussy accelerates and slows down). */
  private speed = 1;
  /** Head look-at (radians, damped) towards the focused tech or the nearest roadside stop. */
  private look = new THREE.Vector2();
  private lookTarget = new THREE.Vector3();
  private lookDir = new THREE.Vector3();
  private lookQ = new THREE.Quaternion();
  private headPoint = new THREE.Vector3();
  /** Distance Sussy has "run" on the treadmill, in studs (Roblox leaderstats). */
  studsRun = 0;
  private footsteps = new Footsteps();
  private lastRunTime = 0;
  private lastHopTime = -1;
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
    this.sky = createSky();
    this.floor = createStudioFloor();
    this.studioRim.set("#6aa8ff");
    this.studioFog.set("#0a1120");
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.quality.tier = coarse ? 2 : 0;
    this.applyPixelRatio();

    this.environmentTarget = this.buildEnvironment();
    this.scene.environmentIntensity = 0.45;
    this.scene.fog = this.fog;

    this.keyLight.position.set(4, 7, 6);
    this.rimLight.position.set(-5, 5, -6);
    this.sky.material.depthTest = false;
    this.sunset = createSunsetWorld({ grassCount: coarse ? 2200 : 5000, carpetCount: coarse ? 3200 : 8000 });
    this.carousel = new TechCarousel(options.techs, ACCENT);
    this.scene.add(this.props.group, this.door.group, this.flood.mesh, this.fillLight, this.fillLight.target);
    this.milestones = new Milestones(portfolio.profile.projects);
    this.scene.add(this.milestones.group);
    this.scene.add(this.sky.mesh, this.floor.mesh, this.shadow.mesh, this.sunset.group, this.carousel.group, this.character, this.hemi, this.keyLight, this.rimLight, this.keyLight.target);
    this.keyLight.target.position.set(0, 2, 0);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("click", this.onClick);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.timer.connect(document);
  }

  /** Studio reflections: a PMREM of three's RoomEnvironment (rebuilt after a lost context, as GPU targets are gone). */
  private buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    this.scene.environment = target.texture;
    pmrem.dispose();
    room.dispose();
    return target;
  }

  // three.js already calls preventDefault on the lost event (so the browser may restore the context) and
  // re-uploads buffers and textures afterwards; render-target contents are the one thing to rebuild.
  private onContextLost = () => {
    this.options.onContextLost?.();
  };

  private onContextRestored = () => {
    if (this.disposed) return;
    this.environmentTarget.dispose();
    this.environmentTarget = this.buildEnvironment();
    this.needsRender = true;
    this.options.onContextRestored?.();
  };

  /** Load the character + animation clips, then start rendering. */
  async load() {
    let done = 0;
    const total = 8;
    const tick = () => { if (!this.disposed) this.options.onProgress?.(++done / total); };
    const fetchJson = <T,>(url: string) => fetch(url, { signal: this.loadAbort.signal }).then((r) => { if (!r.ok) throw new Error(url); return r.json() as Promise<T>; }).then((j) => { tick(); return j; });
    // Vegetation (Blender-made tree, bushes, grass, ferns) streams in alongside; the scene works without it.
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("/models/nature/nature.glb")
      .then((nature) => { if (!this.disposed) this.sunset.addVegetation(nature.scene); })
      .catch(() => {});
    // The studio's floating toolbox (hammers, tools, studded bricks) rises in when it arrives; optional too.
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("/models/props/props.glb")
      .then((props) => {
        // Nothing of a late load has reached the GPU yet, so there is nothing to free after unmount. The clones
        // share the source geometry, which the scene's own dispose releases.
        if (this.disposed) return;
        this.props.addModels(props.scene, this.reducedMotion ? -Infinity : this.timer.getElapsed());
        this.needsRender = true;
      })
      .catch(() => {});
    const [gltf, index, run, idle, jump, land, walk, wave] = await Promise.all([
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
      fetchJson<ClipJson>("/anims/walk-v3.json"),
      fetchJson<ClipJson>("/anims/wave.json"),
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
    this.headFrame = rig.parts.Head;
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
      run: action(clipFromJson(run)), walk: action(clipFromJson(walk)), idle: action(clipFromJson(idle)), sit: action(createSitClip()),
      jump: oneShot(clipFromJson(jump)), land: oneShot(clipFromJson(land)),
    };
    this.waveEmote = poseSampler(clipFromJson(wave));
    for (const [part, joint] of Object.entries(rig.joints)) {
      const offset = rig.offsets[part as keyof typeof rig.offsets];
      this.jointsByNode.set(jointNode(part), { joint, offset });
      this.offsets.push(offset);
    }
    this.neckOffset = rig.offsets.Head;
    this.story = this.storyTarget;
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.setAnimationLoop(this.frame);
  }

  /** Redraw on the next frame (e.g. after the showcase stops were re-measured). */
  refresh() {
    this.needsRender = true;
  }

  setStory(story: number) {
    if (story !== this.storyTarget) {
      this.needsRender = true;
      // Scrolling moves the conveyor under a resting mouse: that is not the user pointing at a tech.
      this.pointerFresh = false;
    }
    this.storyTarget = story;
  }

  /**
   * Screen position (CSS px, relative to the canvas) of a point just above Sussy's hat, for the chat bubble.
   * Returns null before the avatar loads or when the point is off screen.
   */
  headScreenPosition(): { x: number; y: number } | null {
    if (!this.headFrame) return null;
    this.headFrame.getWorldPosition(this.headPoint);
    this.headPoint.y += 1.9;
    this.headPoint.project(this.camera);
    const { x, y, z } = this.headPoint;
    if (z > 1 || Math.abs(x) > 1.05 || Math.abs(y) > 1.05) return null;
    const canvas = this.renderer.domElement;
    return { x: ((x + 1) / 2) * canvas.clientWidth, y: ((1 - y) / 2) * canvas.clientHeight };
  }

  /** Localised project text for the roadside screens. */
  setProjects(projects: readonly Project[]) {
    this.milestones.setProjects(projects);
    this.needsRender = true;
  }

  /** Footstep audio (off by default; must be enabled from a user gesture). */
  setSound(enabled: boolean) {
    this.footsteps.setEnabled(enabled);
  }

  /**
   * Debug only (`?debug` in development): jump to a story value and simulate `seconds` of frames
   * synchronously, so screenshots can be taken without scrolling and waiting.
   */
  seek(story: number, seconds = 2) {
    this.storyTarget = this.story = story;
    let t = Math.max(this.debugClock, performance.now()) + 1000;
    this.seeking = true;
    for (let i = 0; i < seconds * 60; i++) this.frame((t += 1000 / 60));
    this.seeking = false;
    this.debugClock = t;
  }

  /** Debug only: while true, the render loop holds the last seeked frame (for frame-by-frame inspection). */
  frozen = false;
  private seeking = false;

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
    // Touch moves are scrolls; taps are handled in onClick.
    if (event.pointerType === "touch") return;
    this.setPointer(event);
  };

  private setPointer(event: MouseEvent) {
    this.pointerFresh = true;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    // Sussy is clickable (hop easter egg); raycast on pointer move only, not every frame.
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.overCharacter = this.canHop() && this.raycaster.intersectObject(this.character, true).length > 0;
    if (this.hovered < 0) this.renderer.domElement.style.cursor = this.overCharacter ? "pointer" : "";
    this.needsRender = true;
  }

  private canHop() {
    return !this.reducedMotion && sitMix(this.story) < 0.05 && this.clickHopTime < 0;
  }

  private onPointerLeave = () => { this.pointer.set(-10, -10); this.overCharacter = false; this.needsRender = true; };

  private onClick = (event: MouseEvent) => {
    // Hit-test at the click position (touch taps arrive without a preceding pointermove).
    this.setPointer(event);
    const tech = this.pickTech(techVisibility(this.story));
    if (tech >= 0) this.options.onTechSelect?.(tech);
    else if (this.overCharacter) this.hop();
    // A finger leaves no hover behind.
    if ((event as PointerEvent).pointerType === "touch") this.onPointerLeave();
  };

  /** Sussy waves with the arm nearer the camera (layered over running or sitting). */
  wave() {
    if (this.reducedMotion || !this.waveEmote) return;
    // Queued: it starts once the scene has caught up with the scroll (after a long jump the camera is still
    // travelling), and the goodbye only once Sussy has actually sat down.
    this.waveQueue = 3;
    this.needsRender = true;
  }

  private startQueuedWave(dt: number) {
    if (this.waveQueue <= 0 || this.waveTime >= 0) return;
    this.waveQueue = Math.max(0, this.waveQueue - dt);
    const seated = sitMix(this.storyTarget) > 0.5;
    const ready = seated ? sitMix(this.story) > 0.92 : Math.abs(this.story - this.storyTarget) < 0.12;
    if (!ready) return;
    this.waveQueue = 0;
    this.waveSeated = seated;
    this.waveTime = 0;
  }

  /** Make Sussy hop (click/tap on the character or the Space shortcut). Returns false when not possible. */
  hop() {
    if (!this.canHop()) return false;
    this.clickHopTime = 0;
    this.needsRender = true;
    return true;
  }

  /** Index of the tech tile under the pointer (-1 = none). */
  private pickTech(visibility: number) {
    if (visibility <= 0.6 || this.pointer.x <= -2) return -1;
    this.carousel.group.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.carousel.pickables, false).find((hit) => hit.object.parent?.visible);
    return hit ? (hit.object.userData.index as number) : -1;
  }

  private updateHover(visibility: number) {
    const hovered = this.pointerFresh ? this.pickTech(visibility) : -1;
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
    if (this.frozen && !this.seeking) return;
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
    const chapterHop = !reduced ? chapterJumpTime(s) : -1;
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
    const reveal = worldReveal(s);
    const exit = studioExit(s);
    this.character.children[0].position.y = rootY;
    // Locomotion speed follows how fast the page is scrolled (and how fast Sussy actually travels on the road):
    // a gentle scroll walks, a quick one runs, and the change is eased like acceleration. When the page rests
    // Sussy slows to idle — except in the opening shot, where the run is the introduction.
    this.scrollSpeed = damp(this.scrollSpeed, this.scrollAccum / Math.max(dt, 1 / 240), 5, dt);
    this.scrollAccum = 0;
    const ground = Math.abs(key.pos[0] - this.lastX) / Math.max(dt, 1 / 240);
    // The hello wave is a stop: Sussy stands, turns to the viewer and waves, then runs on.
    const greeting = this.waveTime >= 0 && !this.waveSeated && this.waveEmote ? emoteWeight(this.waveTime, this.waveEmote.duration, 0.3) : 0;
    let targetSpeed = Math.min(1, Math.max(this.scrollSpeed / RUN_SCROLL_SPEED, ground / (RUN_SPEED * 1.1)));
    if (s < INTRO_RUN_END) targetSpeed = 1;
    if (reduced || greeting > 0) targetSpeed = 0;
    this.speed = damp(this.speed, targetSpeed, targetSpeed > this.speed ? 2.4 : greeting > 0 ? 6 : 3.2, dt);
    const runMix = smoothstep(0.42, 0.82, this.speed);
    const walkMix = smoothstep(0.02, 0.2, this.speed) * (1 - runMix);
    this.character.rotation.y = key.yaw + (Math.PI - key.yaw) * 0.55 * greeting;
    const upright = (1 - sit) * (1 - jumpW - landW);
    const moving = upright * runMix;
    const walking = upright * walkMix;
    this.actions.jump.setEffectiveWeight(jumpW);
    this.actions.land.setEffectiveWeight(landW);
    this.actions.run.setEffectiveWeight(reduced ? 0 : moving);
    this.actions.walk.setEffectiveWeight(reduced ? 0 : walking);
    this.actions.idle.setEffectiveWeight(reduced ? upright : upright - moving - walking);
    this.actions.sit.setEffectiveWeight(sit);
    // Cadence rises with speed so the feet keep up with the ground.
    // On the road Sussy really moves, so the steps follow the ground speed and the feet do not slide.
    const road = reveal * (1 - sit);
    const cadence = 0.75 + 0.9 * Math.min(1, this.speed / 0.42);
    this.actions.walk.timeScale = cadence + (THREE.MathUtils.clamp(ground / WALK_SPEED, 0.7, 2.2) - cadence) * road;
    const stride = (0.82 + 0.3 * this.speed) * (1 - 0.3 * smoothstep(3.15, 3.42, s));
    this.actions.run.timeScale = stride + (THREE.MathUtils.clamp(ground / RUN_SPEED, 0.75, 1.6) - stride) * road * (1 - smoothstep(3.15, 3.42, s));
    if (reduced) this.mixer.setTime(0);
    else this.mixer.update(dt);
    if (!reduced) this.playFootsteps(moving, sunset, jumpTime);
    // Procedural layers start from scratch every frame (absolute values, nothing accumulates).
    for (const offset of this.offsets) {
      offset.quaternion.identity();
      offset.position.set(0, 0, 0);
    }
    if (!reduced) this.startQueuedWave(dt);
    if (this.waveTime >= 0 && this.waveEmote) {
      this.waveTime = reduced ? -1 : this.waveTime + dt;
      if (this.waveTime >= 0) this.applyWave(this.waveTime);
      if (this.waveTime > this.waveEmote.duration) this.waveTime = -1;
    }
    if (!reduced) this.applyLook(s, sit, greeting, dt);

    // Treadmill: the floor grid flows opposite to the running direction while in the studio.
    // Facing is (-sin yaw, 0, -cos yaw); the floor plane's local Y maps to world -Z.
    if (!reduced) {
      const speed = (RUN_SPEED * moving * this.actions.run.timeScale + WALK_SPEED * walking * this.actions.walk.timeScale) * (1 - reveal) * dt;
      // Studs: treadmill distance in the studio, real distance along the road afterwards.
      this.studsRun += speed + Math.abs(key.pos[0] - this.lastX);
      this.treadmill.x -= Math.sin(key.yaw) * speed;
      this.treadmill.y += Math.cos(key.yaw) * speed;
    }
    this.lastX = key.pos[0];
    this.floor.material.uniforms.uOffset.value.copy(this.treadmill);
    this.floor.material.uniforms.uOpacity.value = 1 - exit;
    this.floor.mesh.visible = exit < 0.999;
    const flood = doorFlood(s);
    // The door stays until the flood hides it, so the studio never visibly comes apart.
    this.door.update(smoothstep(1.94, 2.06, s) * (1 - smoothstep(DOOR_STORY - 0.045, DOOR_STORY - 0.005, s)), time, smoothstep(2.02, 2.2, s));
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
    this.milestones.update(s, reveal, characterPosition, time);
    this.updateHover(visibility);

    // Studio → sunset.
    this.sky.material.uniforms.uMix.value = sunset;
    const seated = sit > 0.95 && !reduced;
    this.dusk = damp(this.dusk, seated ? 1 : 0, seated ? 0.07 : 1.5, dt);
    this.sky.material.uniforms.uNight.value = this.dusk * sunset;
    this.sky.material.uniforms.uTime.value = time;
    this.sky.mesh.position.copy(this.camera.position);
    // The meadow rises under the fading studio floor as Sussy reaches the doorway.
    const rise = 1 - Math.pow(1 - reveal, 3);
    this.sunset.group.position.y = -9 * (1 - rise);
    this.sunset.update(time, reveal, this.renderer.getPixelRatio(), sunset);
    this.props.update(time, 1 - exit, this.camera.aspect < 0.8);
    this.fog.color.copy(this.studioFog).lerp(COLORS.fog, sunset);
    this.fog.near = 30 - 10 * sunset;
    this.fog.far = 160 + 80 * sunset;
    this.keyLight.color.copy(COLORS.key).lerp(COLORS.sunsetKey, sunset);
    this.keyLight.position.set(4 - 12 * sunset, 7 - 4.5 * sunset, 6 - 18 * sunset);
    this.keyLight.intensity = (2.4 + 0.6 * sunset) * (1 - 0.35 * this.dusk);
    this.rimLight.color.copy(this.studioRim).lerp(COLORS.rim, sunset);
    this.rimLight.intensity = 2.2 - 1.2 * sunset;
    this.hemi.color.copy(COLORS.sky).lerp(COLORS.sunsetSky, sunset);
    this.hemi.groundColor.copy(COLORS.ground).lerp(COLORS.sunsetGround, sunset);
    this.scene.environmentIntensity = 0.45 - 0.2 * sunset;
    const arrive = arriveMix(s);
    this.fillLight.intensity = 1.4 * arrive;
    this.fillLight.position.set(key.pos[0] + 4, 6, key.pos[1] + 12);
    this.fillLight.target.position.set(key.pos[0], 2, key.pos[1]);

    this.camera.updateMatrixWorld();
    this.floodCenter.copy(this.door.opening).project(this.camera);
    this.flood.update(flood.spread, flood.strength, this.floodCenter, this.camera.aspect);

    if (!reduced) this.adaptQuality(elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  /** Right foot lands near t=0.00s and left near t=0.31s of the 0.63s `run v4` cycle. */
  /**
   * Layer the wave emote over the mixer result with Roblox's fade in/out. Standing, it drives every joint it
   * animates (like an Action-priority track); seated, only the right arm so Sussy stays sitting.
   */
  private applyWave(t: number) {
    const emote = this.waveEmote!;
    const weight = emoteWeight(t, emote.duration);
    const arm = jointNode("Right Arm");
    for (const node of emote.joints.keys()) {
      if (this.waveSeated && node !== arm) continue;
      const entry = this.jointsByNode.get(node);
      if (!entry || !emote.sample(node, t, this.poseQ, this.poseP)) continue;
      // Desired transform D = blend(mixer pose J, emote pose) expressed as the offset O with J * O = D:
      // O.q = J.q^-1 * D.q and O.p = J.q^-1 * (D.p - J.p). The mixer's joint itself is never touched.
      const { joint, offset } = entry;
      this.poseQ.copy(joint.quaternion).slerp(this.poseQ, weight);
      this.poseP.copy(joint.position).lerp(this.poseP, weight).sub(joint.position);
      this.inverseQ.copy(joint.quaternion).invert();
      offset.quaternion.copy(this.inverseQ).multiply(this.poseQ);
      offset.position.copy(this.poseP).applyQuaternion(this.inverseQ);
    }
  }

  /**
   * Sussy looks at what the page is showing: the focused tech on the conveyor, or the roadside stop being passed.
   * The neck turns first (Neck joint: Z = yaw towards the character's left, X = pitch, negative looks up); when
   * standing still a bigger turn is shared with the body.
   */
  private applyLook(s: number, sit: number, greeting: number, dt: number) {
    let weight = 0;
    const tech = techVisibility(s);
    if (tech > 0.4 && this.carousel.focusPoint(this.lookTarget)) weight = tech;
    else {
      const near = this.milestones.nearestBoard(this.character.position.x, this.lookTarget);
      weight = (1 - smoothstep(4, 11, near)) * worldReveal(s);
    }
    weight *= (1 - sit) * (1 - greeting);
    let yaw = 0;
    let pitch = 0;
    if (weight > 0.001 && this.headFrame) {
      this.headFrame.getWorldPosition(this.lookDir);
      this.lookDir.subVectors(this.lookTarget, this.lookDir);
      // Into the character's frame (it only rotates about Y); the character faces local -Z.
      this.lookDir.applyAxisAngle(THREE.Object3D.DEFAULT_UP, -this.character.rotation.y);
      const turn = Math.atan2(-this.lookDir.x, -this.lookDir.z);
      // Only things ahead or beside: a stop already passed (behind) is let go rather than turning the back on the viewer.
      weight *= 1 - smoothstep(1.55, 2.1, Math.abs(turn));
      yaw = turn * weight;
      pitch = Math.atan2(this.lookDir.y, Math.hypot(this.lookDir.x, this.lookDir.z)) * weight;
    }
    this.look.x = damp(this.look.x, yaw, 4, dt);
    this.look.y = damp(this.look.y, pitch, 4, dt);
    // While walking or idle the body helps with turns beyond the neck's range; while running it keeps its line.
    const still = 1 - smoothstep(0.2, 0.6, this.speed);
    const neckYaw = THREE.MathUtils.clamp(this.look.x, -LOOK_YAW, LOOK_YAW);
    const bodyYaw = THREE.MathUtils.clamp(this.look.x - neckYaw, -BODY_TURN, BODY_TURN) * still;
    this.character.rotation.y += bodyYaw;
    if (this.neckOffset) {
      const headYaw = THREE.MathUtils.clamp(this.look.x - bodyYaw, -LOOK_YAW, LOOK_YAW);
      // On the neck's offset node (reset every frame), never on the mixer-driven joint.
      this.neckOffset.quaternion
        .multiply(this.lookQ.setFromAxisAngle(AXIS_Z, headYaw))
        .multiply(this.lookQ.setFromAxisAngle(AXIS_X, -THREE.MathUtils.clamp(this.look.y, -LOOK_PITCH, LOOK_PITCH)));
    }
  }

  /** Scroll distance (CSS px) since the last call; its rate sets Sussy's walk/run speed. */
  addScroll(pixels: number) {
    this.scrollAccum += Math.abs(pixels);
  }

  private playFootsteps(moving: number, surface: number, hopTime: number) {
    const run = this.actions!.run;
    const duration = run.getClip().duration;
    const t = run.time % duration;
    const previous = this.lastRunTime;
    this.lastRunTime = t;
    if (this.footsteps.isEnabled && moving > 0.6) {
      const crossed = (mark: number) => (previous <= t ? previous < mark && t >= mark : previous < mark || t >= mark);
      if (crossed(0.01)) this.footsteps.step(surface, 1, 0.9 * moving);
      if (crossed(0.31)) this.footsteps.step(surface, -1, 0.9 * moving);
    }
    if (this.lastHopTime >= 0 && this.lastHopTime < 0.6 && (hopTime >= 0.6 || hopTime < 0)) this.footsteps.step(surface, 0, 1.4);
    this.lastHopTime = hopTime;
  }

  dispose() {
    if (this.disposed) return;
    this.footsteps.dispose();
    this.milestones.dispose();
    this.disposed = true;
    this.loadAbort.abort();
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("click", this.onClick);
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.timer.dispose();
    this.mixer?.stopAllAction();
    if (this.character.children[0]) this.mixer?.uncacheRoot(this.character.children[0]);
    disposeObjects(this.scene, ...(this.pendingModel ? [this.pendingModel] : []));
    this.pendingModel = null;
    this.environmentTarget.dispose();
    this.renderer.dispose();
  }
}
