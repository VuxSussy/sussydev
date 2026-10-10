import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { TechStack } from "@/data/portfolio";
import { smoothstep } from "@/lib/story";

const SPACING = 3.3;
const LANE_Z = 2.0;
const DIM = new THREE.Color("#2b2b30");

type Item = {
  root: THREE.Group;
  logo: THREE.Mesh;
  logoMaterial: THREE.MeshStandardMaterial;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  color: THREE.Color;
  focus: number;
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

/** Muted brand colour so logos sit calmly in the dark studio. */
function soften(hex: string) {
  return new THREE.Color(hex).lerp(new THREE.Color("#cfccc6"), 0.22);
}

export class TechCarousel {
  readonly group = new THREE.Group();
  private items: Item[] = [];
  private plinthGeometry = new RoundedBoxGeometry(2.4, 0.24, 2.4, 3, 0.09);
  private ringGeometry = new THREE.RingGeometry(1.32, 1.4, 64);
  private plinthMaterial = new THREE.MeshStandardMaterial({ color: "#1c1c20", roughness: 0.55, metalness: 0.2 });

  constructor(techs: readonly TechStack[]) {
    this.group.position.z = LANE_Z;
    techs.forEach((tech, index) => {
      const root = new THREE.Group();
      root.userData.index = index;
      const plinth = new THREE.Mesh(this.plinthGeometry, this.plinthMaterial);
      plinth.position.y = 0.12;
      plinth.userData.index = index;
      const color = soften(tech.color);
      const logoMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.35, emissive: color, emissiveIntensity: 0 });
      const logo = new THREE.Mesh(logoGeometry(tech.icon), logoMaterial);
      logo.position.y = 1.35;
      logo.rotation.x = -0.12;
      logo.userData.index = index;
      const ringMaterial = new THREE.MeshBasicMaterial({ color: "#f3b47c", transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
      const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      root.add(plinth, logo, ring);
      this.group.add(root);
      this.items.push({ root, logo, logoMaterial, ring, ringMaterial, color, focus: 0 });
    });
  }

  /** Meshes the pointer can hover/click. */
  get pickables() {
    return this.items.flatMap((item) => [item.logo, item.root.children[0]]);
  }

  /**
   * @param position continuous index of the tech under Sussy's feet
   * @param visibility 0..1 conveyor visibility
   * @param hovered index under the pointer, or -1
   */
  update(position: number, visibility: number, hovered: number, time: number, dt: number) {
    this.group.visible = visibility > 0.002;
    if (!this.group.visible) return;
    const rise = 1 - Math.pow(1 - visibility, 3);
    this.group.position.y = -3.2 * (1 - rise);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const offset = i - position;
      const distance = Math.abs(offset);
      const target = Math.max(1 - distance, hovered === i ? 0.75 : 0);
      item.focus += (target - item.focus) * (1 - Math.exp(-10 * dt));
      const f = item.focus;
      const edge = 1 - smoothstep(2.2, 4.2, distance);
      item.root.position.x = offset * SPACING;
      item.root.position.z = -Math.pow(distance, 1.6) * 0.35;
      item.root.scale.setScalar(Math.max(edge, 0.001) * (0.86 + 0.14 * rise));
      item.root.visible = edge > 0.01;
      item.logo.position.y = 1.35 + f * 0.4 + Math.sin(time * 1.4 + i) * 0.05;
      item.logo.scale.setScalar(1 + f * 0.28);
      item.logo.rotation.y = Math.sin(time * 0.6 + i * 0.8) * 0.18 * (1 - f) + offset * -0.12;
      item.logoMaterial.color.copy(DIM).lerp(item.color, 0.35 + 0.65 * f);
      item.logoMaterial.emissiveIntensity = 0.04 + f * 0.32;
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
