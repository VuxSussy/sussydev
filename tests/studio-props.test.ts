// @vitest-environment happy-dom
import { readFileSync, statSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { beforeAll, expect, it } from "vitest";
import { createStudioProps, FLOATERS } from "../components/story/scene/environment";

const FILE = "public/models/props/props.glb";
let models: THREE.Group;

beforeAll(async () => {
  const buffer = readFileSync(FILE);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");
  models = gltf.scene;
});

const triangles = (root: THREE.Object3D) => {
  let count = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) count += (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) / 3;
  });
  return count;
};

it("ships every floating prop as a light, multi-part model", () => {
  expect(statSync(FILE).size).toBeLessThan(90_000);
  for (const name of new Set(FLOATERS.map((f) => f.model))) {
    const model = models.getObjectByName(name);
    expect(model, name).toBeDefined();
    expect(triangles(model!)).toBeGreaterThan(400);
    expect(triangles(model!)).toBeLessThan(3000);
  }
  // Tools are hammers and tools, not blocks: several materials (steel head, wooden handle, rubber grip...).
  for (const tool of ["ClawHammer", "Sledgehammer", "Screwdriver"]) {
    const materials = new Set<string>();
    models.getObjectByName(tool)!.traverse((o) => { if (o instanceof THREE.Mesh) materials.add((o.material as THREE.Material).name); });
    expect(materials.size, tool).toBeGreaterThanOrEqual(3);
  }
  // Mostly tools now; a few upgraded bricks stay.
  const bricks = FLOATERS.filter((f) => f.model.startsWith("Brick"));
  expect(bricks.length).toBeGreaterThan(0);
  expect(bricks.length).toBeLessThan(FLOATERS.length / 2);
});

it("rises the props in, keeps them in place afterwards and sinks them while the studio fades", () => {
  const props = createStudioProps();
  props.addModels(models, 10);
  expect(props.loaded).toBe(true);
  const holders = props.group.children.slice(1);
  expect(holders).toHaveLength(FLOATERS.length);
  props.update(10, 1);
  const start = holders.map((h) => h.position.y);
  props.update(20, 1);
  const settled = holders.map((h) => h.position.y);
  holders.forEach((_, i) => {
    expect(start[i]).toBeLessThan(settled[i] - 3);
    expect(Math.abs(settled[i] - FLOATERS[i].pos[1])).toBeLessThan(0.4);
  });
  props.update(20, 0.5);
  holders.forEach((h, i) => expect(h.position.y).toBeLessThan(settled[i]));
  props.update(20, 0);
  expect(props.group.visible).toBe(false);
  // Brick tints are per-prop clones; the loaded source keeps its white plastic.
  const plastic = models.getObjectByName("Brick2x4")!.getObjectByProperty("type", "Mesh") as THREE.Mesh;
  expect((plastic.material as THREE.MeshStandardMaterial).color.getHexString()).toBe("ffffff");
});

it("shows the props at once with reduced motion", () => {
  const props = createStudioProps();
  props.addModels(models, -Infinity);
  props.update(0, 1);
  props.group.children.slice(1).forEach((h, i) => {
    expect(h.visible).toBe(true);
    expect(Math.abs(h.position.y - FLOATERS[i].pos[1])).toBeLessThan(0.4);
  });
});

it("keeps only the props with a phone spot on a portrait screen", () => {
  const props = createStudioProps();
  props.addModels(models, -Infinity);
  props.update(0, 1, true);
  const holders = props.group.children.slice(1);
  holders.forEach((h, i) => {
    const phone = FLOATERS[i].phone;
    expect(h.visible).toBe(!!phone);
    if (phone) expect(h.position.x).toBe(phone.pos[0]);
  });
  expect(holders.filter((h) => h.visible).length).toBeLessThanOrEqual(3);
});
