import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Project } from "@/data/portfolio";
import { smoothstep, stopStory } from "@/lib/story";

const SIDE_Z = -4.6;
/** The screen stands ahead of the spot where Sussy slows down, so Sussy waits beside it rather than in front. */
const AHEAD = 8.8;

/** A big 16:9 outdoor TV showing the demo frame (the project's details are in the page's side panel). */
const SCREEN_W = 14;
const SCREEN_H = SCREEN_W * (9 / 16);
const SCREEN_Y = 9.1;
/** TV bezel around the picture. */
const BEZEL = 0.42;
/** Housing depth; the picture, neon strips and LED sit just in front of its face. */
const DEPTH = 0.6;
const FACE = DEPTH / 2 + 0.012;
/** Two legs carry the TV; their height reaches the bezel's lower edge. */
const POST_H = SCREEN_Y - SCREEN_H / 2 - BEZEL;
const POST_X = SCREEN_W / 2 - 2.2;
const FONT = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
/** Canvas size of the screen picture. */
const CANVAS_W = 1280;
const CANVAS_H = 720;

type Palette = { neon: string; hot: string };

/** Canvas texture helper; falls back to an empty texture where 2D canvas is unavailable (tests). */
function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** "Coming soon" static for a project without a demo frame (no invented visuals). */
function drawPlaceholder(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, palette: Palette) {
  ctx.fillStyle = "#07070c";
  ctx.fillRect(x, 0, w, h);
  ctx.strokeStyle = "rgba(88, 200, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let gx = x; gx <= x + w; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
  for (let gy = 0; gy <= h; gy += 32) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + rand() * 0.08})`;
    ctx.fillRect(x + rand() * w, rand() * h, 10 + rand() * 110, 2 + rand() * 5);
  }
  ctx.textAlign = "center";
  ctx.font = `700 92px ${FONT}`;
  ctx.fillStyle = palette.hot;
  ctx.fillText("DEMO", x + w / 2 + 7, h / 2 + 4);
  ctx.fillStyle = palette.neon;
  ctx.fillText("DEMO", x + w / 2, h / 2);
  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = "#d8f9ff";
  ctx.fillText("// COMING SOON", x + w / 2, h / 2 + 62);
  ctx.textAlign = "left";
}

/** The screen picture: the demo frame drawn "cover", or coming-soon static with the project's number and title. */
function drawScreen(ctx: CanvasRenderingContext2D, index: number, project: Project, palette: Palette, image?: CanvasImageSource & { width: number; height: number }) {
  const W = CANVAS_W;
  const H = CANVAS_H;
  ctx.clearRect(0, 0, W, H);
  if (image && image.width) {
    const scale = Math.max(W / image.width, H / image.height);
    const sw = W / scale;
    const sh = H / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, W, H);
    return;
  }
  drawPlaceholder(ctx, 0, W, H, palette);
  ctx.textAlign = "center";
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = "rgba(216, 249, 255, 0.55)";
  ctx.fillText(`${String(index + 1).padStart(2, "0")} · ${project.title}`.toUpperCase(), W / 2, H - 60);
  ctx.textAlign = "left";
}

const screenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

// CRT-style cyberpunk screen: power-on line, scanlines, rolling bar, RGB split and row glitches in short bursts,
// vignette and a neon rim. Unlit and not tone mapped, so it glows at dusk.
const screenFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uPower;
  uniform float uSeed;
  uniform vec3 uNeon;
  uniform vec3 uHot;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    float t = uTime + uSeed * 17.0;
    // Power-on: a bright line opens vertically into the picture.
    float open = smoothstep(0.0, 0.7, uPower);
    float visible = step(abs(uv.y - 0.5), 0.5 * open + 0.004);
    float burst = step(0.9, hash(floor(t * 2.7)));
    float row = floor(uv.y * 28.0);
    float shift = burst * (hash(row * 12.9 + floor(t * 24.0)) - 0.5) * 0.08;
    vec2 g = vec2(uv.x + shift, uv.y);
    float split = 0.0009 + burst * 0.01;
    vec3 col = vec3(texture2D(uMap, g + vec2(split, 0.0)).r, texture2D(uMap, g).g, texture2D(uMap, g - vec2(split, 0.0)).b);
    // Cyberpunk grade: teal shadows, hot highlights.
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * mix(uNeon, uHot, smoothstep(0.35, 0.9, luma)) * 1.35, 0.2);
    col *= 0.86 + 0.14 * sin(uv.y * 420.0 - t * 6.0);
    float bar = 1.0 - smoothstep(0.0, 0.06, abs(fract(uv.y + t * 0.12) - 0.5));
    col += uNeon * 0.07 * bar;
    vec2 d = uv - 0.5;
    col *= 1.0 - dot(d * vec2(1.0, 1.6), d * vec2(1.0, 1.6)) * 0.7;
    float edge = 1.0 - smoothstep(0.0, 0.018, min(min(uv.x, 1.0 - uv.x) * 0.5625, min(uv.y, 1.0 - uv.y)));
    col = mix(col, uNeon * 1.4, edge * 0.85);
    col *= 0.93 + 0.07 * sin(t * 47.0) * burst;
    // The power-on line itself.
    col += uNeon * (1.0 - open) * (1.0 - smoothstep(0.0, 0.01, abs(uv.y - 0.5))) * step(0.01, uPower);
    gl_FragColor = vec4(col * visible * min(1.0, uPower * 1.6), 1.0);
    #include <colorspace_fragment>
  }`;

type Post = {
  root: THREE.Group;
  screen: THREE.ShaderMaterial;
  glow: THREE.MeshBasicMaterial;
  /** Redraws the screen picture (after the demo frame loads, the fonts arrive or the language changes). */
  draw: (project: Project) => void;
};

/**
 * Roadside stops for the Work chapter: one post per project with a cyberpunk screen showing its demo frame
 * (`Project.image`), or honest "coming soon" static. The project's details are in the page's side panel.
 */
export class Milestones {
  readonly group = new THREE.Group();
  private posts: Post[] = [];
  private postGeometry = new THREE.CylinderGeometry(0.2, 0.28, POST_H, 12);
  private housingGeometry = new RoundedBoxGeometry(SCREEN_W + BEZEL * 2, SCREEN_H + BEZEL * 2, DEPTH, 3, 0.18);
  /** Small power LED on the bezel's bottom edge. */
  private ledGeometry = new THREE.SphereGeometry(0.06, 10, 8);
  private screenGeometry = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  private glowGeometry = new THREE.PlaneGeometry(SCREEN_W + 2.4, SCREEN_H + 2);
  private stripGeometry = new THREE.BoxGeometry(SCREEN_W - 1.2, 0.05, 0.05);
  private metal = new THREE.MeshStandardMaterial({ color: "#16161c", roughness: 0.45, metalness: 0.6 });
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];
  private projects: readonly Project[];

  constructor(projects: readonly Project[]) {
    this.projects = projects;
    const palette: Palette = { neon: "#58c8ff", hot: "#7b6cff" };
    const glowTexture = canvasTexture(128, 128, (ctx) => {
      const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,0.9)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    });
    this.textures.push(glowTexture);
    projects.forEach((project, index) => {
      const root = new THREE.Group();
      const poles = [-POST_X, POST_X].map((x) => {
        const pole = new THREE.Mesh(this.postGeometry, this.metal);
        pole.position.set(x, POST_H / 2, -0.12);
        return pole;
      });
      const housing = new THREE.Mesh(this.housingGeometry, this.metal);
      housing.position.y = SCREEN_Y;
      // One canvas per screen; the demo frame is composited into it once loaded.
      const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
      const ctx = canvas?.getContext("2d") ?? null;
      let texture: THREE.Texture = new THREE.Texture();
      let image: HTMLImageElement | undefined;
      if (canvas && ctx) {
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
      }
      this.textures.push(texture);
      const draw = (current: Project) => {
        if (!ctx) return;
        drawScreen(ctx, index, current, palette, image);
        texture.needsUpdate = true;
      };
      draw(project);
      if (ctx && project.image) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { image = img; draw(this.projects[index]); };
        img.src = project.image;
      }
      const screen = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture }, uTime: { value: 0 }, uPower: { value: 0 }, uSeed: { value: index * 1.37 },
          uNeon: { value: new THREE.Color(palette.neon) }, uHot: { value: new THREE.Color(palette.hot) },
        },
        vertexShader: screenVertex,
        fragmentShader: screenFragment,
        toneMapped: false,
      });
      const screenMesh = new THREE.Mesh(this.screenGeometry, screen);
      screenMesh.position.set(0, SCREEN_Y, FACE);
      const glow = new THREE.MeshBasicMaterial({
        map: glowTexture, color: palette.neon, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false,
      });
      const glowMesh = new THREE.Mesh(this.glowGeometry, glow);
      glowMesh.position.set(0, SCREEN_Y, -DEPTH / 2 - 0.05);
      const neonTop = new THREE.MeshBasicMaterial({ color: palette.hot, toneMapped: false });
      const neonBottom = new THREE.MeshBasicMaterial({ color: palette.neon, toneMapped: false });
      const top = new THREE.Mesh(this.stripGeometry, neonTop);
      top.position.set(0, SCREEN_Y + SCREEN_H / 2 + BEZEL * 0.55, FACE);
      const bottom = new THREE.Mesh(this.stripGeometry, neonBottom);
      bottom.position.set(0, SCREEN_Y - SCREEN_H / 2 - BEZEL * 0.55, FACE);
      const led = new THREE.Mesh(this.ledGeometry, neonBottom);
      led.position.set(SCREEN_W / 2 - 0.1, SCREEN_Y - SCREEN_H / 2 - BEZEL * 0.55, FACE);
      this.materials.push(screen, glow, neonTop, neonBottom);
      root.add(...poles, housing, screenMesh, glowMesh, top, bottom, led);
      this.group.add(root);
      this.posts.push({ root, screen, glow, draw });
    });
    // Canvas text falls back to a system font until the page fonts arrive; redraw once they have.
    if (typeof document !== "undefined") document.fonts?.ready.then(() => this.posts.forEach((post, i) => post.draw(this.projects[i]))).catch(() => {});
  }

  /** Swap the placeholder titles (same projects, another language). */
  setProjects(projects: readonly Project[]) {
    this.projects = projects;
    this.posts.forEach((post, i) => projects[i] && post.draw(projects[i]));
  }

  /**
   * Posts stand still beside the road, on the far side, screens facing the camera, a little ahead of the spot where
   * Sussy slows down for that project. Screens power on as Sussy approaches.
   * @param story continuous story value
   * @param visibility 0..1 (the outdoor world revealed)
   * @param positionAt Sussy's ground position (x, z) for a story value
   * @param time seconds, for the screen animation
   */
  update(story: number, visibility: number, positionAt: (story: number) => readonly [number, number], time = 0) {
    this.group.visible = visibility > 0.002;
    if (!this.group.visible) return;
    const count = this.posts.length;
    const here = positionAt(story)[0];
    this.posts.forEach((post, index) => {
      const [x, z] = positionAt(stopStory(index, count));
      post.root.position.set(x - AHEAD, 0, z + SIDE_Z);
      post.root.rotation.y = -0.14;
      const distance = Math.abs(post.root.position.x - here);
      const near = 1 - smoothstep(34, 54, distance);
      post.root.scale.setScalar(Math.max(near, 0.001));
      const power = (1 - smoothstep(15, 30, distance)) * visibility;
      post.screen.uniforms.uPower.value = power;
      post.screen.uniforms.uTime.value = time;
      post.glow.opacity = 0.35 * power;
    });
  }

  /**
   * Screen of the post nearest to `x` (written to `out`, the screen's centre) and its horizontal distance;
   * Infinity while the posts are hidden.
   */
  nearestBoard(x: number, out: THREE.Vector3) {
    if (!this.group.visible) return Infinity;
    let best = Infinity;
    for (const { root } of this.posts) {
      const distance = Math.abs(root.position.x - x);
      if (distance < best && root.scale.x > 0.05) {
        best = distance;
        out.set(root.position.x, SCREEN_Y * root.scale.y, root.position.z);
      }
    }
    return best;
  }

  dispose() {
    for (const geometry of [this.postGeometry, this.ledGeometry, this.housingGeometry, this.screenGeometry, this.glowGeometry, this.stripGeometry]) geometry.dispose();
    this.metal.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
  }
}
