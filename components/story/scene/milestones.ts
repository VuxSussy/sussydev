import * as THREE from "three";
import type { Project } from "@/data/portfolio";
import { smoothstep } from "@/lib/story";

const SIDE_Z = -3.2;

/** Signboard texture: big project number and year, readable from the camera at a distance. */
function boardTexture(index: number, project: Project, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  ctx.fillStyle = "#16161a";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "rgba(241,239,234,0.18)";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = accent;
  ctx.fillRect(40, 54, 48, 6);
  ctx.fillStyle = "#f1efea";
  ctx.font = "600 120px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(index + 1).padStart(2, "0"), 36, 196);
  ctx.fillStyle = "#a9a69f";
  ctx.font = "500 40px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillText(project.year, 300, 196);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Roadside milestones for the Work chapter: one signpost per project along the road that Sussy runs past.
 */
export class Milestones {
  readonly group = new THREE.Group();
  private posts: THREE.Group[] = [];
  private postGeometry = new THREE.CylinderGeometry(0.1, 0.12, 5.6, 10);
  private boardGeometry = new THREE.BoxGeometry(3.2, 1.6, 0.14);
  private postMaterial = new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.6, metalness: 0.3 });
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];

  constructor(projects: readonly Project[], accent: string) {
    projects.forEach((project, index) => {
      const post = new THREE.Group();
      const pole = new THREE.Mesh(this.postGeometry, this.postMaterial);
      pole.position.y = 2.8;
      const texture = boardTexture(index, project, accent);
      const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 });
      const side = new THREE.MeshStandardMaterial({ color: "#16161a", roughness: 0.6 });
      this.textures.push(texture);
      this.materials.push(face, side);
      const board = new THREE.Mesh(this.boardGeometry, [side, side, side, side, face, side]);
      board.position.y = 5.4;
      post.add(pole, board);
      this.group.add(post);
      this.posts.push(post);
    });
  }

  /**
   * Posts stand still beside the road: post i sits where Sussy passes while project card i is being read,
   * on the far side of the road, boards facing the camera.
   * @param story continuous story value
   * @param visibility 0..1 (the outdoor world rising)
   * @param positionAt Sussy's ground position (x, z) for a story value
   */
  update(story: number, visibility: number, positionAt: (story: number) => readonly [number, number]) {
    this.group.visible = visibility > 0.002;
    if (!this.group.visible) return;
    const count = this.posts.length;
    this.posts.forEach((post, index) => {
      const [x, z] = positionAt(2.12 + 0.72 * (count > 1 ? index / (count - 1) : 0));
      post.position.set(x + 1.6, 0, z + SIDE_Z);
      post.rotation.y = -0.18;
      const near = 1 - smoothstep(24, 40, Math.abs(post.position.x - positionAt(story)[0]));
      post.scale.setScalar(Math.max(near, 0.001));
    });
  }

  dispose() {
    this.postGeometry.dispose();
    this.boardGeometry.dispose();
    this.postMaterial.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
  }
}
