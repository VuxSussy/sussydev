import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LogoSpec } from "@/data/tech-logos";

/** Largest side of a logo, in studs. */
export const LOGO_SIZE = 1.6;
/** Extrusion in "icon units" (a 24-unit icon box), so thin and chunky marks get the same thickness. */
const BASE_DEPTH = 2.2;
/** Each later SVG layer stands this much prouder than the one under it. */
const LAYER_STEP = 0.55;

type Built = { geometry: THREE.BufferGeometry; accent: THREE.Color };
const hsl = { h: 0, s: 0, l: 0 };

/** Near-black marks (Three.js, a dark Roblox) would vanish on the dark studio floor: lift them to warm off-white. */
function readable(color: THREE.Color) {
  color.getHSL(hsl);
  return hsl.l < 0.12 ? new THREE.Color("#ece8e0") : color;
}

/**
 * A small saturation boost (and a touch darker) so shaded sides keep the brand hue instead of going grey.
 * Greys and white stay as they are.
 */
export function vivid(color: THREE.Color, out = new THREE.Color()) {
  color.getHSL(hsl);
  if (hsl.s < 0.08) return out.copy(color);
  return out.setHSL(hsl.h, Math.min(1, hsl.s * 1.15 + 0.08), hsl.l * 0.9);
}

function paint(geometry: THREE.BufferGeometry, colorAt: (x: number, y: number) => THREE.Color) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    vivid(colorAt(position.getX(i), position.getY(i)), c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.deleteAttribute("uv");
  return geometry;
}

/** One extruded layer per filled SVG shape; later shapes stand proud of earlier ones (TS letters on the square). */
function svgLayers(spec: Extract<LogoSpec, { kind: "svg" }>) {
  const data = new SVGLoader().parse(spec.svg);
  const layers: { shapes: THREE.Shape[]; fill: string }[] = [];
  const box = new THREE.Box2();
  for (const path of data.paths) {
    const style = path.userData?.style as { fill?: string; fillOpacity?: number } | undefined;
    const fill = style?.fill ?? "#000";
    if (fill === "none" || fill === "transparent" || spec.fills?.[fill] === null) continue;
    const shapes = path.toShapes();
    if (!shapes.length) continue;
    for (const shape of shapes) for (const p of shape.getPoints()) box.expandByPoint(p);
    layers.push({ shapes, fill });
  }
  const size = box.getSize(new THREE.Vector2());
  const unit = Math.max(size.x, size.y) / 24;
  let area = -1;
  let accent = new THREE.Color("#ffffff");
  const parts = layers.map((layer, index) => {
    const depth = (BASE_DEPTH + index * LAYER_STEP) * unit;
    const bevel = (index === 0 ? 0.28 : 0.12) * unit;
    const geometry = new THREE.ExtrudeGeometry(layer.shapes, {
      depth, bevelEnabled: true, bevelThickness: bevel * 1.4, bevelSize: bevel, bevelSegments: 2, curveSegments: 10,
    });
    // Back faces share one plane; after the flip below the fronts face the camera.
    geometry.translate(0, 0, -depth);
    const gradient = spec.fills?.[layer.fill];
    if (gradient) {
      const [from, to, angle] = gradient;
      const a = new THREE.Color(from);
      const b = new THREE.Color(to);
      const dir = new THREE.Vector2(Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180));
      const lb = new THREE.Box2();
      for (const shape of layer.shapes) for (const p of shape.getPoints()) lb.expandByPoint(p);
      const corners = [lb.min, lb.max, new THREE.Vector2(lb.min.x, lb.max.y), new THREE.Vector2(lb.max.x, lb.min.y)].map((p) => p.dot(dir));
      const lo = Math.min(...corners);
      const span = Math.max(...corners) - lo || 1;
      const tmp = new THREE.Color();
      paint(geometry, (x, y) => tmp.copy(a).lerp(b, THREE.MathUtils.clamp((x * dir.x + y * dir.y - lo) / span, 0, 1)));
      const shapeArea = Math.abs(lb.getSize(new THREE.Vector2()).x * lb.getSize(new THREE.Vector2()).y);
      if (shapeArea > area) [area, accent] = [shapeArea, a.clone().lerp(b, 0.5)];
    } else {
      const color = readable(new THREE.Color().setStyle(layer.fill === "white" ? "#ffffff" : layer.fill));
      paint(geometry, () => color);
      const lb = new THREE.Box2();
      for (const shape of layer.shapes) for (const p of shape.getPoints()) lb.expandByPoint(p);
      const s = lb.getSize(new THREE.Vector2());
      if (s.x * s.y > area) [area, accent] = [s.x * s.y, color];
    }
    return geometry;
  });
  return { parts, accent, flipY: true };
}

/** Pixel art: one bevel-less voxel per pixel; outline pixels sit a little prouder so the face reads in 3D. */
function pixelLayers(spec: Extract<LogoSpec, { kind: "pixels" }>) {
  const counts = new Map<string, number>();
  const parts: THREE.BufferGeometry[] = [];
  spec.rows.forEach((row, y) => {
    // Palette keys are single ASCII letters, so splitting by UTF-16 unit is exact.
    row.split("").forEach((key, x) => {
      const hex = spec.palette[key];
      if (!hex) return;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
      const outline = key === "a" || key === "b";
      const depth = outline ? 2.2 : 1.6;
      const voxel = new THREE.BoxGeometry(1, 1, depth).toNonIndexed();
      voxel.translate(x + 0.5, y + 0.5, -depth / 2);
      const color = new THREE.Color(hex);
      parts.push(paint(voxel, () => color));
    });
  });
  const accent = new THREE.Color([...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? "#ffffff");
  return { parts, accent, flipY: true };
}

/**
 * Builds a logo as one merged, vertex-coloured geometry (one draw call): centred, LOGO_SIZE wide at most, facing +Z.
 * `accent` is the dominant colour (for the focus glow).
 */
export function buildLogo(spec: LogoSpec): Built {
  const { parts, accent } = spec.kind === "svg" ? svgLayers(spec) : pixelLayers(spec);
  const merged = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(1, 1, 1);
  for (const part of parts) part.dispose();
  // SVG y points down: a half turn about X turns it upright and brings the proud layers to +Z.
  merged.rotateX(Math.PI);
  merged.computeBoundingBox();
  const box = merged.boundingBox as THREE.Box3;
  const size = box.getSize(new THREE.Vector3());
  const scale = LOGO_SIZE / Math.max(size.x, size.y);
  merged.center();
  merged.scale(scale, scale, scale);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return { geometry: merged, accent };
}

/** One-colour fallback from a 24×24 simple-icons path. */
export function fallbackSpec(path: string, color: string): LogoSpec {
  return { kind: "svg", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${path}"/></svg>` };
}
