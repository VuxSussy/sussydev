// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { changelog, currentVersion } from "../data/changelog";
import * as THREE from "three";
import { bakedGeometry } from "../components/story/scene/environment";

it("lists releases newest first and exposes the latest as the current version", () => {
  const versions = changelog.map((release) => Number(release.version));
  expect([...versions].sort((a, b) => b - a)).toEqual(versions);
  expect(currentVersion).toBe(changelog[0].version);
  for (const release of changelog) {
    expect(release.notes.length).toBeGreaterThan(0);
    expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

it("gives every project a unique slug and only writes case studies for real projects", async () => {
  const { portfolio } = await import("../data/portfolio");
  const { caseStudies } = await import("../data/case-studies");
  const slugs = portfolio.profile.projects.map((project) => project.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
  for (const slug of Object.keys(caseStudies)) expect(slugs).toContain(slug);
  for (const study of Object.values(caseStudies)) expect(study.sections.length).toBeGreaterThan(0);
});

it("localises every profile string while keeping icons, colours and slugs from the source", async () => {
  const { portfolio } = await import("../data/portfolio");
  const { localizedProfile } = await import("../data/i18n");
  const vi = portfolio.profile;
  const en = localizedProfile("en");
  expect(localizedProfile("vi")).toBe(vi);
  expect(en.techStack.map((tech) => [tech.name, tech.group, tech.icon, tech.color])).toEqual(vi.techStack.map((tech) => [tech.name, tech.group, tech.icon, tech.color]));
  en.techStack.forEach((tech, index) => expect(tech.blurb).not.toBe(vi.techStack[index].blurb));
  expect(en.projects.map((project) => project.slug)).toEqual(vi.projects.map((project) => project.slug));
  expect(en.intro).not.toBe(vi.intro);
});

it("has a chat line for every chapter in both languages", async () => {
  const { chatLines } = await import("../data/i18n");
  const { CHAPTERS } = await import("../lib/story");
  for (const locale of ["vi", "en"] as const) {
    expect(chatLines[locale]).toHaveLength(CHAPTERS.length);
    for (const line of chatLines[locale]) expect(line.length).toBeLessThan(40);
  }
});

it("plants one static TV per project along the road, with open road between them", async () => {
  const { Milestones } = await import("../components/story/scene/milestones");
  const { portfolio } = await import("../data/portfolio");
  const { journeyX } = await import("../lib/story");
  const projects = portfolio.profile.projects;
  const path = (story: number) => [journeyX(story, projects.length), 0] as const;
  const milestones = new Milestones(projects);
  milestones.update(1.5, 0, path);
  expect(milestones.group.visible).toBe(false);
  milestones.update(2.6, 1, path);
  expect(milestones.group.visible).toBe(true);
  expect(milestones.group.children).toHaveLength(projects.length);
  const xs = milestones.group.children.map((post) => post.position.x);
  milestones.update(2.8, 1, path);
  expect(milestones.group.children.map((post) => post.position.x)).toEqual(xs);
  // Evenly spaced, each screen (14 studs wide) with a long stretch of open road before the next.
  xs.slice(1).forEach((x, i) => expect(xs[i] - x).toBeGreaterThan(14 + 10));
  milestones.dispose();
});

it("fades a one-shot emote in and out like a Roblox animation track", async () => {
  const { emoteWeight } = await import("../lib/rbx/rig");
  expect(emoteWeight(-0.1, 1.5)).toBe(0);
  expect(emoteWeight(0, 1.5)).toBe(0);
  expect(emoteWeight(0.075, 1.5)).toBeCloseTo(0.5);
  expect(emoteWeight(0.75, 1.5)).toBe(1);
  expect(emoteWeight(1.5, 1.5)).toBeCloseTo(0);
  expect(emoteWeight(1.6, 1.5)).toBe(0);
});

it("finds the roadside board nearest to Sussy", async () => {
  const { Milestones } = await import("../components/story/scene/milestones");
  const { portfolio } = await import("../data/portfolio");
  const milestones = new Milestones(portfolio.profile.projects);
  const out = new THREE.Vector3();
  const { journeyX, stopStory } = await import("../lib/story");
  const count = portfolio.profile.projects.length;
  const path = (story: number) => [journeyX(story, count), 0] as const;
  milestones.update(1, 0, path);
  expect(milestones.nearestBoard(0, out)).toBe(Infinity); // hidden before the outdoor world rises
  milestones.update(2.6, 1, path);
  // At a stop the TV stands just ahead of Sussy (beside, not behind her).
  const near = milestones.nearestBoard(path(stopStory(1, count))[0], out);
  expect(near).toBeLessThan(10);
  expect(out.x).toBeLessThan(path(stopStory(1, count))[0]);
  expect(out.y).toBeGreaterThan(3);
  milestones.dispose();
});

it("bakes a meshopt-quantised node transform into float geometry", () => {
  // meshopt stores positions as normalised int16 and moves the dequantisation scale/offset onto the node.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Int16Array([32767, 0, 0, 0, 32767, 0, 0, 0, -32767]), 3, true));
  const mesh = new THREE.Mesh(geometry);
  mesh.scale.setScalar(4);
  mesh.position.set(0, 2, 0);
  mesh.updateMatrixWorld();
  const baked = bakedGeometry(mesh);
  const position = baked.getAttribute("position");
  expect(position.array).toBeInstanceOf(Float32Array);
  expect([position.getX(0), position.getY(1), position.getZ(2)].map((v) => +v.toFixed(3))).toEqual([4, 6, -4]);
});

it("sorts each tech stack into Language, Framework and Tool shelves with a gap between them", async () => {
  const { portfolio, TECH_GROUPS } = await import("../data/portfolio");
  const { laneSlots } = await import("../components/story/scene/tech-carousel");
  for (const profile of [portfolio.profile]) {
    const order = profile.techStack.map((tech) => TECH_GROUPS.indexOf(tech.group));
    // Grouped in shelf order, so chip order (rendered per group) matches the conveyor's indices.
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(3);
    const slots = laneSlots(profile.techStack);
    slots.slice(1).forEach((slot, i) => {
      const newShelf = profile.techStack[i + 1].group !== profile.techStack[i].group;
      expect(slot - slots[i]).toBeCloseTo(newShelf ? 1.75 : 1);
    });
  }
});

it("keeps only the finest LOD of the Roblox accessory meshes", async () => {
  const { readFileSync } = await import("node:fs");
  // LOD0 face counts from the meshes' LODS chunks (the coarser LODs used to render on top: "two scarves").
  for (const [name, lod0] of [["Scarf", 3144], ["TacBelts", 3643]] as const) {
    const mesh = JSON.parse(readFileSync(`assets-src/sussy/meshes/${name}.json`, "utf8")) as { index: number[] };
    expect(mesh.index.length / 3).toBe(lod0);
  }
});
