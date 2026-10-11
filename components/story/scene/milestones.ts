import * as THREE from "three";
import type { Project } from "@/data/portfolio";
import { smoothstep } from "@/lib/story";

const SIDE_Z = -4.4;
/** Story values of the first and last roadside stop. */
export const STOPS_START = 2.42;
export const STOPS_SPAN = 0.42;

const SCREEN_W = 6.8;
const SCREEN_H = SCREEN_W * (9 / 16);
const SCREEN_Y = 6.7;
/** Two posts carry the wide screen; their height reaches the housing's lower edge. */
const POST_H = SCREEN_Y - SCREEN_H / 2;
const POST_X = SCREEN_W / 2 - 1.1;
const FONT = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

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

/** Screen content for a project without a demo yet: honest "coming soon" static, no invented visuals. */
function placeholderScreen(index: number, project: Project, palette: Palette) {
  return canvasTexture(640, 360, (ctx) => {
    ctx.fillStyle = "#07070c";
    ctx.fillRect(0, 0, 640, 360);
    ctx.strokeStyle = "rgba(62, 242, 255, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 640; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke(); }
    for (let y = 0; y <= 360; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
    // Static noise blocks.
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * 640, Math.random() * 360, 10 + Math.random() * 90, 2 + Math.random() * 4);
    }
    ctx.textAlign = "center";
    ctx.font = `700 64px ${FONT}`;
    ctx.fillStyle = palette.hot;
    ctx.fillText("DEMO", 326, 172);
    ctx.fillStyle = palette.neon;
    ctx.fillText("DEMO", 320, 168);
    ctx.font = `500 22px ${FONT}`;
    ctx.fillStyle = "#d8f9ff";
    ctx.fillText("// COMING SOON", 320, 214);
    ctx.font = `400 16px ${FONT}`;
    ctx.fillStyle = "rgba(216, 249, 255, 0.55)";
    ctx.fillText(`${String(index + 1).padStart(2, "0")} · ${project.title}`.toUpperCase(), 320, 300);
  });
}

/** Caption strip under the screen: number, year, category and title in neon mono type. */
function captionTexture(index: number, project: Project, palette: Palette) {
  return canvasTexture(1024, 176, (ctx) => {
    ctx.fillStyle = "#0a0a10";
    ctx.fillRect(0, 0, 1024, 176);
    ctx.fillStyle = palette.hot;
    ctx.fillRect(0, 0, 10, 176);
    ctx.font = `700 64px ${FONT}`;
    ctx.fillStyle = palette.neon;
    ctx.fillText(String(index + 1).padStart(2, "0"), 40, 82);
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = "rgba(216, 249, 255, 0.7)";
    ctx.fillText(`${project.year} // ${project.category}`.toUpperCase(), 150, 74);
    ctx.font = `600 40px ${FONT}`;
    ctx.fillStyle = "#f1efea";
    const title = project.title.length > 34 ? `${project.title.slice(0, 33)}…` : project.title;
    ctx.fillText(title, 40, 142);
  });
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
    float split = 0.0025 + burst * 0.012;
    vec3 col = vec3(texture2D(uMap, g + vec2(split, 0.0)).r, texture2D(uMap, g).g, texture2D(uMap, g - vec2(split, 0.0)).b);
    // Cyberpunk grade: teal shadows, hot highlights.
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * mix(uNeon, uHot, smoothstep(0.35, 0.9, luma)) * 1.35, 0.28);
    col *= 0.8 + 0.2 * sin(uv.y * 360.0 - t * 6.0);
    float bar = 1.0 - smoothstep(0.0, 0.06, abs(fract(uv.y + t * 0.12) - 0.5));
    col += uNeon * 0.07 * bar;
    vec2 d = uv - 0.5;
    col *= 1.0 - dot(d, d) * 1.1;
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
};

/**
 * Roadside stops for the Work chapter: one post per project with a cyberpunk screen showing the project's demo
 * frame (`Project.image`) — or honest "coming soon" static — and a neon caption with number, year and title.
 */
export class Milestones {
  readonly group = new THREE.Group();
  private posts: Post[] = [];
  private postGeometry = new THREE.CylinderGeometry(0.13, 0.17, POST_H, 10);
  private housingGeometry = new THREE.BoxGeometry(SCREEN_W + 0.3, SCREEN_H + 0.3, 0.2);
  private screenGeometry = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  private glowGeometry = new THREE.PlaneGeometry(SCREEN_W + 1.6, SCREEN_H + 1.4);
  private captionGeometry = new THREE.PlaneGeometry(SCREEN_W + 0.3, (SCREEN_W + 0.3) * (176 / 1024));
  private stripGeometry = new THREE.BoxGeometry(SCREEN_W + 0.34, 0.05, 0.05);
  private metal = new THREE.MeshStandardMaterial({ color: "#16161c", roughness: 0.45, metalness: 0.6 });
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];

  constructor(projects: readonly Project[], accent: string) {
    const roblox = accent === "#6cb4ff";
    const palette: Palette = { neon: roblox ? "#58c8ff" : "#3ef2ff", hot: roblox ? "#7b6cff" : "#ff3ea5" };
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
        pole.position.set(x, POST_H / 2, -0.32);
        return pole;
      });
      const housing = new THREE.Mesh(this.housingGeometry, this.metal);
      housing.position.y = SCREEN_Y;
      const placeholder = placeholderScreen(index, project, palette);
      this.textures.push(placeholder);
      const screen = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: placeholder }, uTime: { value: 0 }, uPower: { value: 0 }, uSeed: { value: index * 1.37 },
          uNeon: { value: new THREE.Color(palette.neon) }, uHot: { value: new THREE.Color(palette.hot) },
        },
        vertexShader: screenVertex,
        fragmentShader: screenFragment,
        toneMapped: false,
      });
      if (project.image) {
        new THREE.TextureLoader().load(project.image, (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          this.textures.push(texture);
          screen.uniforms.uMap.value = texture;
        }, undefined, () => {});
      }
      const screenMesh = new THREE.Mesh(this.screenGeometry, screen);
      screenMesh.position.set(0, SCREEN_Y, 0.105);
      const glow = new THREE.MeshBasicMaterial({
        map: glowTexture, color: palette.neon, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false,
      });
      const glowMesh = new THREE.Mesh(this.glowGeometry, glow);
      glowMesh.position.set(0, SCREEN_Y, -0.12);
      const captionTex = captionTexture(index, project, palette);
      this.textures.push(captionTex);
      const caption = new THREE.MeshBasicMaterial({ map: captionTex, toneMapped: false });
      const captionMesh = new THREE.Mesh(this.captionGeometry, caption);
      captionMesh.position.set(0, SCREEN_Y - SCREEN_H / 2 - 0.82, 0.06);
      const neonTop = new THREE.MeshBasicMaterial({ color: palette.hot, toneMapped: false });
      const neonBottom = new THREE.MeshBasicMaterial({ color: palette.neon, toneMapped: false });
      const top = new THREE.Mesh(this.stripGeometry, neonTop);
      top.position.set(0, SCREEN_Y + SCREEN_H / 2 + 0.17, 0.08);
      const bottom = new THREE.Mesh(this.stripGeometry, neonBottom);
      bottom.position.set(0, SCREEN_Y - SCREEN_H / 2 - 0.17, 0.08);
      this.materials.push(screen, glow, caption, neonTop, neonBottom);
      root.add(...poles, housing, screenMesh, glowMesh, captionMesh, top, bottom);
      this.group.add(root);
      this.posts.push({ root, screen, glow });
    });
  }

  /**
   * Posts stand still beside the road, on the far side, screens facing the camera, a little ahead of where Sussy
   * stops while project card i is read. Screens power on as Sussy approaches.
   * @param story continuous story value
   * @param visibility 0..1 (the outdoor world rising)
   * @param positionAt Sussy's ground position (x, z) for a story value
   * @param time seconds, for the screen animation
   */
  update(story: number, visibility: number, positionAt: (story: number) => readonly [number, number], time = 0) {
    this.group.visible = visibility > 0.002;
    if (!this.group.visible) return;
    const count = this.posts.length;
    const here = positionAt(story)[0];
    this.posts.forEach((post, index) => {
      // Spread over the first part of the road (while the project cards scroll by), leaving a long empty stretch
      // between the last stop and the tree where Sussy rests.
      const [x, z] = positionAt(STOPS_START + STOPS_SPAN * (count > 1 ? index / (count - 1) : 0));
      // A little ahead of where Sussy stops (the run goes towards -X), so the screen is in view, not behind.
      post.root.position.set(x - 2.4, 0, z + SIDE_Z);
      post.root.rotation.y = -0.18;
      const distance = Math.abs(post.root.position.x - here);
      const near = 1 - smoothstep(24, 40, distance);
      post.root.scale.setScalar(Math.max(near, 0.001));
      const power = (1 - smoothstep(10, 22, distance)) * visibility;
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
    for (const geometry of [this.postGeometry, this.housingGeometry, this.screenGeometry, this.glowGeometry, this.captionGeometry, this.stripGeometry]) geometry.dispose();
    this.metal.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
  }
}
