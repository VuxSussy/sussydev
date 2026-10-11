import * as THREE from "three";

/**
 * The journey: Sussy leaves the studio at the origin through a doorway and runs along a dirt road towards -X,
 * ending at a tree where Sussy sits facing the camera with the sunset behind. Units are Roblox studs.
 */
export const ROAD_START = new THREE.Vector2(0, 0);
/** Where Sussy sits (HumanoidRootPart x/z), at the end of the road. */
export const SIT_SPOT = new THREE.Vector2(-64, 0);
/** Studio exit doorway along the road. */
export const DOOR_X = -9;
export const SUN_DIRECTION = new THREE.Vector3(0.26, 0.05, -1).normalize();
/** Tree right behind the seated Sussy (Sussy faces +Z, towards the camera). */
const TREE_BASE = new THREE.Vector3(SIT_SPOT.x - 3.4, 0, SIT_SPOT.y - 3.6);

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
  // Flat corridor along the road (z ~ 0) and around the tree; rolling meadow further out, falling away far off.
  const fromRoad = Math.abs(z);
  // The camera side (+Z) stays flatter for longer so hills never rise between the camera and Sussy's feet.
  const corridor = z > 0 ? smoothstep(14, 30, z) : smoothstep(4, 16, fromRoad);
  const roll = (Math.sin(x * 0.13 + 1.3) * Math.sin(z * 0.11) * 1.1 + Math.sin(x * 0.05 - z * 0.04) * 0.8) * corridor;
  const fall = -Math.pow(Math.max(fromRoad - 34, 0), 1.25) * 0.06;
  return roll + fall;
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function createGround() {
  const geometry = new THREE.PlaneGeometry(260, 200, 160, 120);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(-40, 0, -30);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const meadow = new THREE.Color("#5f6b37");
  const dry = new THREE.Color("#8a7a42");
  const far = new THREE.Color("#3a3446");
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    const patch = 0.5 + 0.5 * Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2);
    tmp.copy(meadow).lerp(dry, patch * 0.35).lerp(far, Math.min(1, Math.max(0, (Math.abs(z) - 20) / 70)));
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
}

/** Packed-dirt road from the studio doorway to the tree, slightly wobbly, with soft edges. */
function createRoad() {
  const length = ROAD_START.x - SIT_SPOT.x + 10;
  const geometry = new THREE.PlaneGeometry(length, 3.6, 120, 6);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(ROAD_START.x + 4 - length / 2, 0, 0);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 4);
  const dirt = new THREE.Color("#7a5b3d");
  const dust = new THREE.Color("#a07a52");
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + Math.sin(x * 0.18) * 0.35;
    pos.setZ(i, z);
    pos.setY(i, groundHeight(x, z) + 0.03);
    const edge = Math.abs(pos.getZ(i) - Math.sin(x * 0.18) * 0.35) / 1.8;
    tmp.copy(dirt).lerp(dust, 0.5 + 0.5 * Math.sin(x * 1.3) * Math.cos(z * 3.1));
    colors.set([tmp.r, tmp.g, tmp.b, 1 - smoothstep(0.55, 1, edge)], i * 4);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 1, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;
  return mesh;
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
    const width = 460;
    shape.moveTo(-width / 2, -40);
    for (let i = 0; i <= 140; i++) {
      const x = -width / 2 + (i / 140) * width;
      const y = layer.height * (0.55 + 0.3 * Math.sin(x * 0.021 + layer.seed) + 0.15 * Math.sin(x * 0.067 + layer.seed * 2.3)) - 6;
      shape.lineTo(x, y);
    }
    shape.lineTo(width / 2, -40);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: layer.color, fog: true }));
    mesh.position.set(-40, 0, layer.z);
    group.add(mesh);
  }
  return group;
}

/**
 * Studio exit: a dark frame with warm light spilling through, standing across the road. Sussy runs through it
 * at the start of the Work chapter; it fades with the studio.
 */
export function createStudioDoor() {
  const group = new THREE.Group();
  group.position.set(DOOR_X, 0, 0);
  // Turned towards the camera so the glowing opening reads as a doorway (still wide enough to run through).
  group.rotation.y = 0.85;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#1d1d22", roughness: 0.5, metalness: 0.3, transparent: true });
  const post = new THREE.BoxGeometry(0.5, 7.2, 0.5);
  for (const z of [-2.6, 2.6]) {
    const mesh = new THREE.Mesh(post, frameMaterial);
    mesh.position.set(0, 3.6, z);
    group.add(mesh);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 5.7), frameMaterial);
  lintel.position.y = 7.2;
  group.add(lintel);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: "#ffbf86", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 6.95), glowMaterial);
  glow.rotation.y = Math.PI / 2;
  glow.position.y = 3.5;
  group.add(glow);
  // Warm light spilling through the opening onto the studio floor (studio side = local +X), widening and fading.
  const rows = 8;
  const columns = [-1, -0.55, 0, 0.55, 1];
  const columnFade = [0, 0.75, 1, 0.75, 0];
  const spillPositions: number[] = [];
  const spillColors: number[] = [];
  const spillIndex: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const x = 0.25 + t * 8;
    const half = 2.3 + t * 2.4;
    columns.forEach((c, k) => {
      spillPositions.push(x, 0.03, c * half);
      const a = Math.pow(1 - t, 1.6) * columnFade[k];
      spillColors.push(1 * a, 0.68 * a, 0.42 * a);
    });
  }
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < columns.length - 1; k++) {
      const a = r * columns.length + k;
      const b = a + columns.length;
      spillIndex.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const spillGeometry = new THREE.BufferGeometry();
  spillGeometry.setAttribute("position", new THREE.Float32BufferAttribute(spillPositions, 3));
  spillGeometry.setAttribute("color", new THREE.Float32BufferAttribute(spillColors, 3));
  spillGeometry.setIndex(spillIndex);
  const spillMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(spillGeometry, spillMaterial));
  return {
    group,
    update(visibility: number, time: number) {
      group.visible = visibility > 0.002;
      frameMaterial.opacity = visibility;
      const flicker = 0.4 + 0.08 * Math.sin(time * 2.1);
      glowMaterial.opacity = flicker * visibility;
      spillMaterial.opacity = flicker * 1.3 * visibility;
    },
  };
}

/** Wind sway for instanced foliage (vertex Y is height above the root). */
function addWind(material: THREE.Material, uniforms: { uTime: { value: number } }, strength: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float bend = position.y * position.y;
        vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        transformed.x += sin(uTime * 1.6 + root.x * 0.45 + root.z * 0.3) * ${strength.toFixed(3)} * bend;
        transformed.z += cos(uTime * 1.2 + root.x * 0.3) * ${(strength * 0.45).toFixed(3)} * bend;`,
      );
  };
}

/** Float copy of a (possibly meshopt-quantised) glTF mesh geometry with its world transform applied. */
export function bakedGeometry(mesh: THREE.Mesh) {
  const source = mesh.geometry;
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const { count, itemSize } = attribute;
    const array = new Float32Array(count * itemSize);
    for (let i = 0; i < count; i++) for (let k = 0; k < itemSize; k++) array[i * itemSize + k] = attribute.getComponent(i, k);
    geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }
  if (source.index) geometry.setIndex(source.index.clone());
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingSphere();
  return geometry;
}

function scatter(
  geometry: THREE.BufferGeometry, material: THREE.Material, count: number,
  place: (rand: () => number) => { x: number; z: number; scale: number } | null, seed: number,
) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let state = seed;
  const rand = () => ((state = (state * 16807) % 2147483647) / 2147483647);
  let n = 0;
  for (let tries = 0; n < count && tries < count * 4; tries++) {
    const spot = place(rand);
    if (!spot) continue;
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    m.compose(new THREE.Vector3(spot.x, groundHeight(spot.x, spot.z) - 0.04, spot.z), q, new THREE.Vector3(spot.scale, spot.scale * (0.85 + rand() * 0.35), spot.scale));
    mesh.setMatrixAt(n++, m);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createFireflies(count: number) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([TREE_BASE.x + (Math.random() - 0.5) * 14, 0.6 + Math.random() * 4.5, TREE_BASE.z + (Math.random() - 0.3) * 10], i * 3);
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

/** Projected size: world-space size * FOCAL / depth (tuned for the ~40° story camera at ~900 CSS px tall). */
const FOCAL = 1250;

/** A few leaves drifting down from the canopy, tumbling as they fall (point sprites shaped in the fragment shader). */
function createFallingLeaves(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 4.2;
    positions.set([TREE_BASE.x + 0.5 + Math.cos(a) * r, 0, TREE_BASE.z + Math.sin(a) * r], i * 3);
    seeds.set([0.55 + Math.random() * 0.5, Math.random(), (Math.random() - 0.5) * 5, 0.4 + Math.random() * 0.22], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 seed; uniform float uTime; uniform float uPixelRatio;
      varying float vAngle; varying float vFade; varying vec3 vColor;
      const float TOP = 7.6;
      void main() {
        float t = fract(uTime * seed.x / TOP + seed.y);
        vec3 p = position;
        p.y = TOP * (1.0 - t);
        p.x += sin(uTime * 1.3 + seed.y * 20.0) * 0.6 * t + t * 1.8;
        p.z += cos(uTime * 0.9 + seed.y * 13.0) * 0.5 * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAngle = uTime * seed.z + seed.y * 6.2832;
        vFade = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.88, 1.0, t));
        vColor = mix(vec3(0.42, 0.26, 0.05), vec3(0.62, 0.22, 0.05), fract(seed.y * 7.0));
        gl_PointSize = seed.w * ${FOCAL.toFixed(1)} * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vAngle; varying float vFade; varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vAngle), k = cos(vAngle);
        c = mat2(k, -s, s, k) * c;
        c.x *= 1.0 + 1.2 * abs(sin(vAngle * 0.7)); // tumbling: the leaf turns edge-on and back
        float d = length(vec2(c.x * 2.1, c.y));
        float a = (1.0 - smoothstep(0.36, 0.46, d)) * vFade * uOpacity;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // the shader moves them far from their attribute positions
  return { points, material };
}

/** A small flock crossing the sunset sky: V-shaped silhouettes with flapping wings, drawn as point sprites. */
function createBirds(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    // Loose V formation behind a leader.
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    positions.set([SIT_SPOT.x - rank * 2.6, 23 + rank * 0.9 * side * 0.4 + Math.random() * 0.6, -78 + side * rank * 2.2], i * 3);
    seeds.set([3.2, 0.35, 7 + Math.random() * 2.5, 2.6 + Math.random() * 0.5], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 seed; uniform float uTime; uniform float uPixelRatio; varying float vFlap;
      const float SPAN = 150.0;
      void main() {
        vec3 p = position;
        p.x += mod(uTime * seed.x + seed.y * SPAN, SPAN) - SPAN * 0.5;
        p.y += sin(uTime * 0.6 + p.x * 0.05) * 0.8;
        vFlap = sin(uTime * seed.z + position.x);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = seed.w * ${FOCAL.toFixed(1)} * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vFlap;
      float segment(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
      }
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        p.y = -p.y;
        float tip = 0.08 + 0.2 * vFlap;
        vec2 body = vec2(0.0, -0.06);
        float d = min(segment(p, body, vec2(-0.44, tip)), segment(p, body, vec2(0.44, tip)));
        float a = (1.0 - smoothstep(0.022, 0.055, d)) * uOpacity;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.045, 0.03, 0.04), a);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, material };
}

/**
 * Outdoor world (meadow, road, ridges, fireflies, falling leaves, a flock of birds). Vegetation modelled in Blender (public/models/nature/nature.glb)
 * is added once it loads via `addVegetation`.
 */
export function createSunsetWorld({ grassCount }: { grassCount: number }) {
  const group = new THREE.Group();
  const ground = createGround();
  const road = createRoad();
  const ridges = createRidges();
  const fireflies = createFireflies(60);
  const leaves = createFallingLeaves(28);
  const birds = createBirds(7);
  const wind = { uTime: { value: 0 } };
  let canopy: THREE.Object3D | null = null;
  group.add(ground, road, ridges, fireflies.points, leaves.points, birds.points);
  return {
    group,
    /** Instance the Blender-made tree, bushes, grass tufts and ferns. */
    addVegetation(source: THREE.Object3D) {
      source.updateMatrixWorld(true);
      const find = (name: string) => {
        const node = source.getObjectByName(name);
        let mesh: THREE.Mesh | undefined;
        node?.traverse((child) => {
          if (!mesh && (child as THREE.Mesh).isMesh) mesh = child as THREE.Mesh;
        });
        return mesh ? { geometry: bakedGeometry(mesh), material: mesh.material as THREE.Material } : undefined;
      };
      // meshopt keeps the dequantisation transform on the node, so geometry is baked before re-placing it.
      const trunk = find("TreeTrunk");
      const leaves = find("TreeCanopy");
      if (trunk && leaves) {
        const tree = new THREE.Group();
        canopy = new THREE.Mesh(leaves.geometry, leaves.material);
        tree.add(new THREE.Mesh(trunk.geometry, trunk.material), canopy);
        tree.position.copy(TREE_BASE);
        tree.rotation.y = 0.6;
        tree.scale.setScalar(1.0);
        group.add(tree);
      }
      const near = (x: number, z: number, r: number) => Math.hypot(x - TREE_BASE.x, z - TREE_BASE.z) < r;
      // Nothing tall between the camera and the seated Sussy.
      const sightline = (x: number, z: number) => Math.abs(x - SIT_SPOT.x - 0.5) < 4.5 && z > SIT_SPOT.y - 1.5 && z < SIT_SPOT.y + 14;
      const onRoad = (x: number, z: number) => Math.abs(z - Math.sin(x * 0.18) * 0.35) < 2.2 && x > SIT_SPOT.x - 4;
      const grass = find("GrassClump");
      if (grass) {
        const material = grass.material.clone();
        addWind(material, wind, 0.18);
        group.add(scatter(grass.geometry, material, grassCount, (rand) => {
          const alongRoad = rand() < 0.65;
          const x = alongRoad ? SIT_SPOT.x - 18 + rand() * (ROAD_START.x - SIT_SPOT.x + 10) : SIT_SPOT.x + (rand() - 0.5) * 36;
          const z = alongRoad ? (rand() < 0.5 ? -1 : 1) * (2.1 + Math.pow(rand(), 1.6) * 14) : SIT_SPOT.y + (rand() - 0.6) * 30;
          if (onRoad(x, z) || near(x, z, 1.2) || (x > DOOR_X + 2 && Math.abs(z) < 16)) return null;
          // Keep the spot where Sussy sits (and the camera's view of it) clear.
          if (Math.hypot(x - SIT_SPOT.x, z - SIT_SPOT.y - 2) < 2.6) return null;
          // The camera looks down from +Z: short grass on that side keeps Sussy's feet and the road in view.
          const nearSide = z > 0 && z < 12 ? 0.5 : 1;
          return { x, z, scale: (0.8 + rand() * 0.8) * nearSide };
        }, 11));
      }
      const fern = find("Fern");
      if (fern) {
        const material = fern.material.clone();
        addWind(material, wind, 0.08);
        group.add(scatter(fern.geometry, material, Math.round(grassCount / 18), (rand) => {
          const aroundTree = rand() < 0.45;
          const a = rand() * Math.PI * 2;
          const x = aroundTree ? TREE_BASE.x + Math.cos(a) * (1.4 + rand() * 4) : SIT_SPOT.x - 10 + rand() * (ROAD_START.x - SIT_SPOT.x + 2);
          // Roadside ferns grow on the far verge only; the camera-side verge keeps short grass.
          const z = aroundTree ? TREE_BASE.z + Math.sin(a) * (1.2 + rand() * 3) : -(2.4 + rand() * 3.5);
          if (onRoad(x, z) || x > DOOR_X + 2 || sightline(x, z)) return null;
          return { x, z, scale: 1.2 + rand() * 0.9 };
        }, 23));
      }
      const bush = find("Bush");
      if (bush) {
        group.add(scatter(bush.geometry, bush.material, 26, (rand) => {
          const x = SIT_SPOT.x - 20 + rand() * (ROAD_START.x - SIT_SPOT.x + 8);
          // Mostly on the far side; the few on the camera side stay small and close to the verge,
          // so none of them ends up as a huge blob right in front of the lens.
          const nearSide = rand() < 0.3;
          const z = nearSide ? 4.5 + rand() * 3.5 : -(5 + rand() * 14);
          if (x > DOOR_X + 2 || near(x, z, 3) || sightline(x, z)) return null;
          return { x, z, scale: nearSide ? 0.45 + rand() * 0.3 : 0.9 + rand() * 1.1 };
        }, 31));
      }
    },
    /** @param glow 0..1 sunset progress (fireflies come out near the end) */
    update(time: number, visibility: number, pixelRatio: number, glow = visibility) {
      group.visible = visibility > 0.001;
      if (!group.visible) return;
      wind.uTime.value = time;
      if (canopy) canopy.rotation.z = Math.sin(time * 0.5) * 0.008;
      fireflies.material.uniforms.uTime.value = time;
      fireflies.material.uniforms.uOpacity.value = smoothstep(0.6, 1, glow);
      fireflies.material.uniforms.uPixelRatio.value = pixelRatio;
      for (const { material } of [leaves, birds]) {
        material.uniforms.uTime.value = time;
        material.uniforms.uPixelRatio.value = pixelRatio;
      }
      leaves.material.uniforms.uOpacity.value = smoothstep(0.4, 0.9, glow) * (canopy ? 1 : 0);
      birds.material.uniforms.uOpacity.value = smoothstep(0.3, 0.8, glow);
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
