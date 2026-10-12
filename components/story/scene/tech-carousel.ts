import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { TechGroup, TechStack } from "@/data/portfolio";
import { TECH_LOGOS } from "@/data/tech-logos";
import { smoothstep } from "@/lib/story";
import { buildLogo, fallbackSpec, LOGO_SIZE } from "./tech-logo";

const SPACING = 3.3;
/** The lane runs in front of Sussy (towards the camera), far enough that no logo ever touches the character. */
const LANE_Z = 6.2;
/** Top face of the plinth. */
export const PLINTH_TOP = 0.24;
/** Largest focus scale of a logo (see update()). */
const FOCUS_SCALE = 1.12;
/**
 * Logo centre height: the lowest point of a focused (scaled-up) logo still clears the plinth by 0.16 studs,
 * so no mark ever sinks into the grey base. Kept low otherwise, so the logos read as "under Sussy's feet".
 */
export const LOGO_Y = PLINTH_TOP + 0.16 + (LOGO_SIZE / 2) * FOCUS_SCALE;
/** Extra space (in slots) between the Language, Framework and Tool shelves. */
const GROUP_GAP = 0.75;
/** Shelf colours, shared with the chips (app/globals.css `.tech-group`). */
export const GROUP_COLORS: Record<TechGroup, string> = { language: "#ffb86b", framework: "#6ee7ff", tool: "#c3a6ff" };
const GROUP_LABELS: Record<TechGroup, string> = { language: "LANGUAGE", framework: "FRAMEWORK", tool: "TOOL" };

/** Slot of each tech along the lane: its index plus a gap before every new group. */
export function laneSlots(techs: readonly Pick<TechStack, "group">[]) {
  let gaps = 0;
  return techs.map((tech, index) => {
    if (index > 0 && tech.group !== techs[index - 1].group) gaps++;
    return index + gaps * GROUP_GAP;
  });
}

/** Floor label for the first tech of a shelf: neon group name, read from the raised camera. */
function labelTexture(group: TechGroup) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const color = GROUP_COLORS[group];
  ctx.font = "700 54px 'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillRect(8, 30, 14, 36);
  ctx.fillText(`${GROUP_LABELS[group]}`, 40, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

type Item = {
  root: THREE.Group;
  logo: THREE.Mesh;
  logoMaterial: THREE.MeshStandardMaterial;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  stripMaterial: THREE.MeshBasicMaterial;
  label?: THREE.MeshBasicMaterial;
  color: THREE.Color;
  slot: number;
};

export class TechCarousel {
  readonly group = new THREE.Group();
  readonly pickables: THREE.Object3D[] = [];
  private items: Item[] = [];
  private position = 0;
  private plinthGeometry = new RoundedBoxGeometry(2.4, 0.24, 2.4, 3, 0.09);
  private ringGeometry = new THREE.RingGeometry(1.32, 1.4, 64);
  private plinthMaterial = new THREE.MeshStandardMaterial({ color: "#1c1c20", roughness: 0.55, metalness: 0.2 });
  private stripGeometry = new THREE.BoxGeometry(2.2, 0.06, 0.08);
  private labelGeometry = new THREE.PlaneGeometry(4.6, 4.6 * (96 / 512));
  private textures: THREE.Texture[] = [];
  private slots: number[];

  constructor(techs: readonly TechStack[], accent = "#f3b47c") {
    this.group.position.z = LANE_Z;
    this.slots = laneSlots(techs);
    techs.forEach((tech, index) => {
      const root = new THREE.Group();
      root.userData.index = index;
      const plinth = new THREE.Mesh(this.plinthGeometry, this.plinthMaterial);
      plinth.position.y = 0.12;
      plinth.userData.index = index;
      // The real full-colour mark when we have one, else the one-colour simple-icons path.
      const { geometry, accent: color } = buildLogo(TECH_LOGOS[tech.name] ?? fallbackSpec(tech.icon, tech.color));
      // Plastic-like and non-metallic: metal reflects the grey studio and washes the colours out. Colours live in the
      // vertices and `color` only dims or brightens the whole mark. No tone mapping: AgX turns brand colours pastel
      // under the bright studio key, so the material is kept dim enough not to clip instead.
      const logoMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0, envMapIntensity: 0.3, emissive: color, emissiveIntensity: 0, toneMapped: false });
      const logo = new THREE.Mesh(geometry, logoMaterial);
      logo.position.y = LOGO_Y;
      logo.rotation.x = -0.12;
      logo.userData.index = index;
      const ringMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
      const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      // Shelf colour along the plinth's front edge, and the shelf's name on the floor before its first tech.
      const stripMaterial = new THREE.MeshBasicMaterial({ color: GROUP_COLORS[tech.group], toneMapped: false, transparent: true });
      const strip = new THREE.Mesh(this.stripGeometry, stripMaterial);
      strip.position.set(0, 0.2, 1.22);
      root.add(plinth, logo, ring, strip);
      let label: THREE.MeshBasicMaterial | undefined;
      if (index === 0 || techs[index - 1].group !== tech.group) {
        const texture = labelTexture(tech.group);
        this.textures.push(texture);
        label = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
        const plate = new THREE.Mesh(this.labelGeometry, label);
        plate.rotation.x = -Math.PI / 2;
        plate.position.set(-1.2 + 2.3, 0.02, 2.15);
        root.add(plate);
      }
      this.pickables.push(logo, plinth);
      this.group.add(root);
      this.items.push({ root, logo, logoMaterial, ring, ringMaterial, stripMaterial, label, color, slot: this.slots[index] });
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
    // The lane scrolls through slots (gaps between shelves included) while focus still steps tech by tech.
    const last = this.slots.length - 1;
    const below = Math.min(last, Math.max(0, Math.floor(position)));
    const above = Math.min(last, below + 1);
    const here = this.slots[below] + (this.slots[above] - this.slots[below]) * Math.min(1, Math.max(0, position - below));
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const offset = item.slot - here;
      const distance = Math.abs(offset);
      const f = Math.max(1 - Math.abs(i - position), hovered === i ? 0.75 : 0);
      const edge = 1 - smoothstep(2.2, 4.2, distance);
      item.root.position.x = offset * SPACING;
      item.root.position.z = -Math.pow(distance, 1.6) * 0.35;
      item.root.scale.setScalar(Math.max(edge, 0.001) * (0.86 + 0.14 * rise));
      item.root.visible = edge > 0.01;
      item.logo.position.y = LOGO_Y + f * 0.22 + Math.sin(time * 1.4 + i) * 0.05;
      item.logo.scale.setScalar(0.92 + f * (FOCUS_SCALE - 0.92));
      item.logo.rotation.y = Math.sin(time * 0.6 + i * 0.8) * 0.18 * (1 - f) + offset * -0.12;
      // Unfocused logos keep their hue and only dim; the focused one glows a little.
      item.logoMaterial.color.setScalar(0.34 + 0.16 * f);
      item.logoMaterial.emissiveIntensity = 0.02 + f * 0.05;
      item.ringMaterial.opacity = f * 0.85 * rise;
      item.stripMaterial.opacity = (0.45 + 0.55 * f) * rise;
      if (item.label) item.label.opacity = 0.9 * rise;
    }
  }

  dispose() {
    this.plinthGeometry.dispose();
    this.ringGeometry.dispose();
    this.plinthMaterial.dispose();
    this.stripGeometry.dispose();
    this.labelGeometry.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const item of this.items) {
      item.logo.geometry.dispose();
      item.logoMaterial.dispose();
      item.ringMaterial.dispose();
      item.stripMaterial.dispose();
      item.label?.dispose();
    }
  }
}
