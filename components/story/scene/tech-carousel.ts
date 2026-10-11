import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { TechStack } from "@/data/portfolio";
import { smoothstep } from "@/lib/story";

const SPACING = 3.3;
/** The lane runs in front of Sussy (towards the camera), far enough that no logo ever touches the character. */
const LANE_Z = 6.2;
/** Logo height above the plinth: low, so from the raised camera the logos read as "under Sussy's feet". */
const LOGO_Y = 0.92;

type Item = {
  root: THREE.Group;
  logo: THREE.Mesh;
  logoMaterial: THREE.MeshStandardMaterial;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  color: THREE.Color;
};

/** Extruded simple-icons logo, centred, ~1.8 studs wide, facing +Z. */
function logoGeometry(path: string) {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}"/></svg>`);
  const shapes = svg.paths.flatMap((p) => p.toShapes());
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 2.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.28, bevelSegments: 2, curveSegments: 8,
  });
  geometry.center();
  geometry.scale(0.075, -0.075, -0.075);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Brand colour as is (no grey wash), except near-black marks (Next.js, Three.js, GitHub...) which would vanish
 * on the dark studio floor: those become warm off-white.
 */
function brandColor(hex: string) {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl.l < 0.16 ? new THREE.Color("#ece8e0") : color;
}

export class TechCarousel {
  readonly group = new THREE.Group();
  readonly pickables: THREE.Object3D[] = [];
  private items: Item[] = [];
  private position = 0;
  private plinthGeometry = new RoundedBoxGeometry(2.4, 0.24, 2.4, 3, 0.09);
  private ringGeometry = new THREE.RingGeometry(1.32, 1.4, 64);
  private plinthMaterial = new THREE.MeshStandardMaterial({ color: "#1c1c20", roughness: 0.55, metalness: 0.2 });

  constructor(techs: readonly TechStack[], accent = "#f3b47c") {
    this.group.position.z = LANE_Z;
    techs.forEach((tech, index) => {
      const root = new THREE.Group();
      root.userData.index = index;
      const plinth = new THREE.Mesh(this.plinthGeometry, this.plinthMaterial);
      plinth.position.y = 0.12;
      plinth.userData.index = index;
      const color = brandColor(tech.color);
      // Plastic-like and non-metallic: metal reflects the grey studio and washes the colour out.
      const logoMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, emissive: color, emissiveIntensity: 0 });
      const logo = new THREE.Mesh(logoGeometry(tech.icon), logoMaterial);
      logo.position.y = LOGO_Y;
      logo.rotation.x = -0.12;
      logo.userData.index = index;
      const ringMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
      const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      root.add(plinth, logo, ring);
      this.pickables.push(logo, plinth);
      this.group.add(root);
      this.items.push({ root, logo, logoMaterial, ring, ringMaterial, color });
    });
  }

  /**
   * @param position continuous index of the tech under Sussy's feet
   * @param visibility 0..1 conveyor visibility
   * @param hovered index under the pointer, or -1
   */
  /** World position of the logo nearest the conveyor's focus (where Sussy looks); false while hidden. */
  focusPoint(out: THREE.Vector3) {
    if (!this.group.visible || !this.items.length) return false;
    const index = Math.min(this.items.length - 1, Math.max(0, Math.round(this.position)));
    this.items[index].logo.getWorldPosition(out);
    return true;
  }

  update(position: number, visibility: number, hovered: number, time: number) {
    this.position = position;
    this.group.visible = visibility > 0.002;
    if (!this.group.visible) return;
    const rise = 1 - Math.pow(1 - visibility, 3);
    this.group.position.y = -3.2 * (1 - rise);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const offset = i - position;
      const distance = Math.abs(offset);
      const f = Math.max(1 - distance, hovered === i ? 0.75 : 0);
      const edge = 1 - smoothstep(2.2, 4.2, distance);
      item.root.position.x = offset * SPACING;
      item.root.position.z = -Math.pow(distance, 1.6) * 0.35;
      item.root.scale.setScalar(Math.max(edge, 0.001) * (0.86 + 0.14 * rise));
      item.root.visible = edge > 0.01;
      item.logo.position.y = LOGO_Y + f * 0.22 + Math.sin(time * 1.4 + i) * 0.05;
      item.logo.scale.setScalar(0.92 + f * 0.2);
      item.logo.rotation.y = Math.sin(time * 0.6 + i * 0.8) * 0.18 * (1 - f) + offset * -0.12;
      // Unfocused logos keep their hue and only dim; the focused one glows a little.
      item.logoMaterial.color.copy(item.color).multiplyScalar(0.5 + 0.5 * f);
      item.logoMaterial.emissiveIntensity = 0.06 + f * 0.3;
      item.ringMaterial.opacity = f * 0.85 * rise;
    }
  }

  dispose() {
    this.plinthGeometry.dispose();
    this.ringGeometry.dispose();
    this.plinthMaterial.dispose();
    for (const item of this.items) {
      item.logo.geometry.dispose();
      item.logoMaterial.dispose();
      item.ringMaterial.dispose();
    }
  }
}
