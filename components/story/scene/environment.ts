import * as THREE from "three";

/** Where Sussy sits on the hill (Roblox studs, HumanoidRootPart x/z). */
export const SIT_SPOT = new THREE.Vector2(-1.2, -1.0);
export const SUN_DIRECTION = new THREE.Vector3(0.26, 0.05, -1).normalize();
/** Tree beside Sussy's left shoulder, so the trunk frames the seated silhouette. */
const TREE_BASE = new THREE.Vector3(SIT_SPOT.x - 1.7, 0, SIT_SPOT.y - 0.35);

export type SceneTheme = "dev" | "roblox";

/** Studio look per portfolio: neutral charcoal for Dev, a night-time Roblox baseplate for Roblox. */
const THEMES = {
  dev: {
    skyBottom: [0.043, 0.043, 0.05], skyTop: [0.085, 0.085, 0.095], skyGlow: [0.07, 0.066, 0.06],
    floorNear: [0.11, 0.11, 0.122], floorFar: [0.06, 0.06, 0.068], line: [1, 1, 1], lineStrength: 0.06, studs: 0,
  },
  roblox: {
    skyBottom: [0.03, 0.045, 0.075], skyTop: [0.07, 0.105, 0.17], skyGlow: [0.06, 0.12, 0.22],
    floorNear: [0.1, 0.135, 0.2], floorFar: [0.045, 0.065, 0.105], line: [0.42, 0.66, 1.0], lineStrength: 0.12, studs: 1,
  },
} satisfies Record<SceneTheme, Record<string, number[] | number>>;

const vec3 = (v: number[]) => new THREE.Vector3(v[0], v[1], v[2]);

const dither = /* glsl */ `
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

/** Sky dome blending the dark studio backdrop into a soft sunset. Colours are display-referred. */
export function createSky(theme: SceneTheme) {
  const t = THEMES[theme];
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uMix: { value: 0 }, uSunDir: { value: SUN_DIRECTION.clone() }, uNight: { value: 0 }, uTime: { value: 0 },
      uBottom: { value: vec3(t.skyBottom) }, uTop: { value: vec3(t.skyTop) }, uGlow: { value: vec3(t.skyGlow) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uMix; uniform vec3 uSunDir; uniform vec3 uBottom; uniform vec3 uTop; uniform vec3 uGlow; varying vec3 vDir;
      uniform float uNight; uniform float uTime;
      ${dither}
      float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 studio = mix(uBottom, uTop, smoothstep(-0.25, 0.55, h));
        studio += uGlow * pow(max(dot(d, normalize(vec3(0.0, 0.18, -1.0))), 0.0), 5.0);

        // Dusk deepens the palette while Sussy lingers at the sunset (uNight 0..1).
        vec3 zenith = mix(vec3(0.12, 0.11, 0.22), vec3(0.05, 0.06, 0.14), uNight);
        vec3 mid = mix(vec3(0.45, 0.30, 0.42), vec3(0.2, 0.15, 0.28), uNight);
        vec3 horizon = mix(vec3(0.96, 0.62, 0.42), vec3(0.72, 0.4, 0.34), uNight);
        float t = clamp(h, 0.0, 1.0);
        vec3 sunset = mix(horizon, mid, smoothstep(0.0, 0.2, t));
        sunset = mix(sunset, zenith, smoothstep(0.16, 0.7, t));
        sunset = mix(sunset, vec3(0.2, 0.12, 0.17), smoothstep(0.0, -0.3, h));
        float s = max(dot(d, uSunDir), 0.0);
        sunset += vec3(1.0, 0.72, 0.46) * (pow(s, 10.0) * 0.32 + pow(s, 160.0) * 0.6);
        sunset = mix(sunset, vec3(1.0, 0.92, 0.78), smoothstep(0.99935, 0.9997, s));

        // Stars: one per hashed direction cell, fading in near the zenith as dusk falls.
        vec3 cell = floor(d * 120.0);
        float seed = hash13(cell);
        float star = step(0.992, seed) * (1.0 - smoothstep(0.05, 0.38, length(fract(d * 120.0) - 0.5)));
        float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + seed * 2.0) + seed * 90.0);
        sunset += vec3(0.88, 0.9, 1.0) * star * twinkle * uNight * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.6, 0.98, s));

        vec3 col = mix(studio, sunset, uMix);
        col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, material, setTheme(theme: SceneTheme) {
    const t = THEMES[theme];
    material.uniforms.uBottom.value.set(...t.skyBottom);
    material.uniforms.uTop.value.set(...t.skyTop);
    material.uniforms.uGlow.value.set(...t.skyGlow);
  } };
}

/** Unlit studio floor with a soft radial falloff and a grid that scrolls like a treadmill. */
export function createStudioFloor(theme: SceneTheme) {
  const t = THEMES[theme];
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uOpacity: { value: 1 }, uOffset: { value: new THREE.Vector2() },
      uNear: { value: vec3(t.floorNear) }, uFar: { value: vec3(t.floorFar) }, uLine: { value: vec3(t.line) },
      uLineStrength: { value: t.lineStrength }, uStuds: { value: t.studs },
    },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec2 uOffset; uniform vec3 uNear; uniform vec3 uFar; uniform vec3 uLine;
      uniform float uLineStrength; uniform float uStuds; varying vec2 vPos;
      ${dither}
      float grid(vec2 p, float size, float width) {
        vec2 g = abs(fract(p / size - 0.5) - 0.5) * size;
        vec2 fw = fwidth(p);
        vec2 l = 1.0 - smoothstep(vec2(width) - fw, vec2(width) + fw, g);
        return max(l.x, l.y);
      }
      void main() {
        float r = length(vPos * vec2(1.0, 1.25));
        float fade = 1.0 - smoothstep(5.0, 24.0, r);
        vec3 base = mix(uNear, uFar, smoothstep(0.0, 16.0, r));
        vec2 p = vPos + uOffset;
        float near = 1.0 - smoothstep(3.0, 18.0, r);
        float lines = grid(p, uStuds > 0.5 ? 4.0 : 2.0, 0.025) * uLineStrength * near;
        // Roblox baseplate studs: a soft dot per stud, fading out before it can alias.
        vec2 cell = fract(p) - 0.5;
        float stud = (1.0 - smoothstep(0.16, 0.24, length(cell))) * uStuds * 0.035 * (1.0 - smoothstep(2.0, 11.0, r));
        vec3 col = base + uLine * (lines + stud) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(col, fade * uOpacity);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -5;
  return { mesh, material, setTheme(theme: SceneTheme) {
    const t = THEMES[theme];
    material.uniforms.uNear.value.set(...t.floorNear);
    material.uniforms.uFar.value.set(...t.floorFar);
    material.uniforms.uLine.value.set(...t.line);
    material.uniforms.uLineStrength.value = t.lineStrength;
    material.uniforms.uStuds.value = t.studs;
  } };
}

/** Soft contact shadow that follows the character (cheaper and softer than shadow maps). */
export function createBlobShadow() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.62)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.3)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.renderOrder = -4;
  return { mesh, material };
}

/** Gentle hilltop: flat where Sussy sits, rolling down towards the horizon. */
export function groundHeight(x: number, z: number) {
  const dx = x - SIT_SPOT.x;
  const dz = z - SIT_SPOT.y;
  const r = Math.sqrt(dx * dx + dz * dz);
  const slope = -Math.pow(Math.max(r - 5, 0), 1.35) * 0.09;
  const roll = Math.sin(x * 0.13 + 1.3) * Math.sin(z * 0.11) * 0.7 * Math.min(1, Math.max(r - 6, 0) / 10);
  return slope + roll;
}

function createGround() {
  const geometry = new THREE.PlaneGeometry(240, 240, 140, 140);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const near = new THREE.Color("#5d6a3a");
  const far = new THREE.Color("#3a3446");
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    const d = Math.min(1, Math.hypot(x - SIT_SPOT.x, z - SIT_SPOT.y) / 70);
    tmp.copy(near).lerp(far, d).multiplyScalar(0.92 + Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.06);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
}

/** Layered distant ridges for depth (display-referred colours, fogged). */
function createRidges() {
  const group = new THREE.Group();
  const layers = [
    { z: -70, height: 9, color: "#5e3f58", seed: 1.7 },
    { z: -105, height: 14, color: "#7d5065", seed: 4.1 },
    { z: -150, height: 19, color: "#a8696c", seed: 8.3 },
  ];
  for (const layer of layers) {
    const shape = new THREE.Shape();
    const width = 420;
    shape.moveTo(-width / 2, -40);
    for (let i = 0; i <= 120; i++) {
      const x = -width / 2 + (i / 120) * width;
      const y = layer.height * (0.55 + 0.3 * Math.sin(x * 0.021 + layer.seed) + 0.15 * Math.sin(x * 0.067 + layer.seed * 2.3)) - 6;
      shape.lineTo(x, y);
    }
    shape.lineTo(width / 2, -40);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: layer.color, fog: true }));
    mesh.position.z = layer.z;
    group.add(mesh);
  }
  return group;
}

function createTree() {
  const group = new THREE.Group();
  group.position.copy(TREE_BASE);
  const bark = new THREE.MeshStandardMaterial({ color: "#3a2a24", roughness: 0.92 });
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0.12, 1.4, 0.05), new THREE.Vector3(-0.1, 3.0, 0.1), new THREE.Vector3(0.25, 4.6, -0.15),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 24, 0.46, 10), bark));
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, 0.9, 10), bark);
  flare.position.y = -0.1;
  group.add(flare);
  const branches = [
    [new THREE.Vector3(0.2, 3.8, -0.1), new THREE.Vector3(1.4, 5.2, -0.9), new THREE.Vector3(2.2, 6.0, -1.3)],
    [new THREE.Vector3(0.1, 4.2, 0), new THREE.Vector3(-1.0, 5.6, 0.4), new THREE.Vector3(-1.8, 6.4, 0.6)],
    [new THREE.Vector3(0.25, 4.5, -0.1), new THREE.Vector3(0.6, 6.0, -0.4), new THREE.Vector3(0.7, 7.1, -0.6)],
  ];
  for (const points of branches) {
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.17, 7), bark));
  }

  const canopy = new THREE.Group();
  const clumps = 38;
  const leaf = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
    clumps,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < clumps; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    p.set(0.7 + Math.cos(a) * r * 3.4, 6.5 + (rand() - 0.35) * 2.2, -0.4 + Math.sin(a) * r * 2.8);
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    const k = 0.95 + rand() * 0.95;
    s.set(k * 1.15, k * 0.85, k);
    m.compose(p, q, s);
    leaf.setMatrixAt(i, m);
    leaf.setColorAt(i, c.set("#4f6b3a").lerp(new THREE.Color("#8a8a3f"), rand() * 0.55));
  }
  canopy.add(leaf);
  group.add(canopy);
  return { group, canopy };
}

function createGrass(count: number) {
  const blade = new THREE.PlaneGeometry(0.09, 0.75, 1, 4);
  blade.translate(0, 0.375, 0);
  const pos = blade.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * (1 - pos.getY(i) / 0.8));
  blade.computeVertexNormals();
  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({ color: "#7d8a45", roughness: 0.8, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float bend = position.y * position.y;
        vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        transformed.x += sin(uTime * 1.6 + root.x * 0.45 + root.z * 0.3) * 0.16 * bend;
        transformed.z += cos(uTime * 1.2 + root.x * 0.3) * 0.07 * bend;`,
      );
  };
  const mesh = new THREE.InstancedMesh(blade, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.2 + Math.sqrt(rand()) * 22;
    const x = SIT_SPOT.x + Math.cos(a) * r;
    const z = SIT_SPOT.y + Math.sin(a) * r;
    if (Math.hypot(x - TREE_BASE.x, z - TREE_BASE.z) < 1.1) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
    const k = 0.6 + rand() * 0.9;
    m.compose(new THREE.Vector3(x, groundHeight(x, z) - 0.05, z), q, new THREE.Vector3(k, k * (0.8 + rand() * 0.6), k));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set("#6d7c3c").lerp(new THREE.Color("#b09a52"), rand() * 0.5));
  }
  return { mesh, uniforms };
}

function createFireflies(count: number) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([TREE_BASE.x + (Math.random() - 0.3) * 12, 0.6 + Math.random() * 4.5, TREE_BASE.z + (Math.random() - 0.7) * 10], i * 3);
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float phase; uniform float uTime; uniform float uPixelRatio; varying float vGlow;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.5 + phase) * 0.6, sin(uTime * 0.8 + phase * 2.0) * 0.35, cos(uTime * 0.4 + phase) * 0.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vGlow = 0.45 + 0.55 * sin(uTime * 2.2 + phase * 3.0);
        gl_PointSize = 34.0 * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vGlow * uOpacity;
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * a, a);
      }`,
  });
  return { points: new THREE.Points(geometry, material), material };
}

export function createSunsetWorld({ grassCount }: { grassCount: number }) {
  const group = new THREE.Group();
  const ground = createGround();
  const ridges = createRidges();
  const tree = createTree();
  const grass = createGrass(grassCount);
  const fireflies = createFireflies(60);
  group.add(ground, ridges, tree.group, grass.mesh, fireflies.points);
  return {
    group,
    update(time: number, visibility: number, pixelRatio: number) {
      group.visible = visibility > 0.001;
      if (!group.visible) return;
      grass.uniforms.uTime.value = time;
      tree.canopy.rotation.z = Math.sin(time * 0.55) * 0.012;
      tree.canopy.rotation.x = Math.sin(time * 0.4 + 1) * 0.008;
      fireflies.material.uniforms.uTime.value = time;
      fireflies.material.uniforms.uOpacity.value = visibility;
      fireflies.material.uniforms.uPixelRatio.value = pixelRatio;
    },
  };
}

/** Canvas-drawn texture; falls back to a blank texture where 2D canvas is unavailable (tests, old browsers). */
function drawnTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Stud texture for classic Roblox parts: soft round studs on a neutral tile (tinted by material colour). */
function studTexture() {
  const texture = drawnTexture(64, (ctx, size) => {
    ctx.fillStyle = "#d8d8d8";
    ctx.fillRect(0, 0, size, size);
    const gradient = ctx.createRadialGradient(size * 0.45, size * 0.42, 2, size / 2, size / 2, size * 0.32);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.7, "#e2e2e2");
    gradient.addColorStop(1, "#bdbdbd");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** SpawnLocation emblem: Roblox's spawn ring drawn on the pad's top face. */
function spawnTexture() {
  return drawnTexture(256, (ctx, size) => {
    ctx.fillStyle = "#3d4656";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#cfd8e6";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#cfd8e6";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Roblox-mode set dressing: a SpawnLocation behind Sussy and a few classic studded parts drifting in the
 * background like a Toolbox showcase. Colours are the classic BrickColors, desaturated to stay calm.
 */
export function createRobloxProps() {
  const group = new THREE.Group();
  const studs = studTexture();
  const brick = (color: string, size: [number, number, number]) => {
    const map = studs.clone();
    map.repeat.set(size[0], size[2]);
    map.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color("#8a93a3"), 0.35), map, roughness: 0.7 });
    return new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  };

  const spawn = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.4, 6),
    [
      ...Array.from({ length: 2 }, () => new THREE.MeshStandardMaterial({ color: "#3d4656", roughness: 0.6 })),
      new THREE.MeshStandardMaterial({ map: spawnTexture(), roughness: 0.55 }),
      ...Array.from({ length: 3 }, () => new THREE.MeshStandardMaterial({ color: "#3d4656", roughness: 0.6 })),
    ],
  );
  spawn.position.set(0, 0.2, -6.5);
  group.add(spawn);

  const floaters = [
    { color: "#c4281c", size: [4, 1.2, 2] as [number, number, number], pos: [-20, 9, -36] },
    { color: "#0d69ac", size: [2, 2, 2] as [number, number, number], pos: [17, 12, -40] },
    { color: "#f5cd30", size: [6, 1.2, 2] as [number, number, number], pos: [-4, 15, -48] },
    { color: "#4b974b", size: [2, 4, 2] as [number, number, number], pos: [24, 6, -32] },
    { color: "#a34b4b", size: [1, 1, 4] as [number, number, number], pos: [-26, 5, -30] },
  ].map((item, index) => {
    const mesh = brick(item.color, item.size);
    mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
    mesh.rotation.set(index * 0.7, index * 1.3, index * 0.4);
    mesh.userData.base = mesh.position.y;
    mesh.userData.spin = { x: mesh.rotation.x, y: mesh.rotation.y, dir: index % 2 ? 1 : -1 };
    group.add(mesh);
    return mesh;
  });

  return {
    group,
    update(time: number, visibility: number) {
      group.visible = visibility > 0.001;
      if (!group.visible) return;
      const sink = (1 - visibility) * 8;
      spawn.position.y = 0.2 - sink * 0.2;
      floaters.forEach((mesh, index) => {
        mesh.position.y = (mesh.userData.base as number) + Math.sin(time * 0.5 + index * 1.7) * 0.35 - sink;
        const spin = mesh.userData.spin as { x: number; y: number; dir: number };
        mesh.rotation.y = spin.y + time * 0.09 * spin.dir;
        mesh.rotation.x = spin.x + time * 0.05;
      });
    },
  };
}
