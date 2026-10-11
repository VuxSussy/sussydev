// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { changelog, currentVersion } from "../data/changelog";
import * as THREE from "three";
import { bakedGeometry, createRobloxProps } from "../components/story/scene/environment";

it("lists releases newest first and exposes the latest as the current version", () => {
  const versions = changelog.map((release) => Number(release.version));
  expect([...versions].sort((a, b) => b - a)).toEqual(versions);
  expect(currentVersion).toBe(changelog[0].version);
  for (const release of changelog) {
    expect(release.notes.length).toBeGreaterThan(0);
    expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

it("hides Roblox props outside Roblox mode and sinks them while fading", () => {
  const props = createRobloxProps();
  props.update(1, 0);
  expect(props.group.visible).toBe(false);
  props.update(1, 1);
  expect(props.group.visible).toBe(true);
  const shown = props.group.children.map((child) => child.position.y);
  props.update(1, 0.5);
  props.group.children.forEach((child, index) => expect(child.position.y).toBeLessThan(shown[index]));
});

it("gives every project a unique slug and only writes case studies for real projects", async () => {
  const { portfolio } = await import("../data/portfolio");
  const { caseStudies } = await import("../data/case-studies");
  const slugs = [...portfolio.profiles.dev.projects, ...portfolio.profiles.roblox.projects].map((project) => project.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
  for (const slug of Object.keys(caseStudies)) expect(slugs).toContain(slug);
  for (const study of Object.values(caseStudies)) expect(study.sections.length).toBeGreaterThan(0);
});

it("localises every profile string while keeping icons, colours and slugs from the source", async () => {
  const { portfolio } = await import("../data/portfolio");
  const { localizedProfile } = await import("../data/i18n");
  for (const mode of ["dev", "roblox"] as const) {
    const vi = portfolio.profiles[mode];
    const en = localizedProfile(mode, "en");
    expect(localizedProfile(mode, "vi")).toBe(vi);
    expect(en.techStack.map((tech) => [tech.name, tech.icon, tech.color])).toEqual(vi.techStack.map((tech) => [tech.name, tech.icon, tech.color]));
    en.techStack.forEach((tech, index) => expect(tech.blurb).not.toBe(vi.techStack[index].blurb));
    expect(en.projects.map((project) => project.slug)).toEqual(vi.projects.map((project) => project.slug));
    en.projects.forEach((project, index) => expect(project.summary).not.toBe(vi.projects[index].summary));
    expect(en.intro).not.toBe(vi.intro);
  }
});

it("has a chat line for every chapter in both languages and modes", async () => {
  const { chatLines } = await import("../data/i18n");
  const { CHAPTERS } = await import("../lib/story");
  for (const locale of ["vi", "en"] as const) {
    for (const mode of ["dev", "roblox"] as const) {
      expect(chatLines[locale][mode]).toHaveLength(CHAPTERS.length);
      for (const line of chatLines[locale][mode]) expect(line.length).toBeLessThan(40);
    }
  }
});

it("plants one static milestone per project along the road once the outdoor world is revealed", async () => {
  const { Milestones } = await import("../components/story/scene/milestones");
  const { portfolio } = await import("../data/portfolio");
  const path = (story: number) => [-(story - 2) * 50, 0] as const;
  const milestones = new Milestones(portfolio.profiles.dev.projects, "#f0b07a");
  milestones.update(1.5, 0, path);
  expect(milestones.group.visible).toBe(false);
  milestones.update(2.5, 1, path);
  expect(milestones.group.visible).toBe(true);
  expect(milestones.group.children).toHaveLength(portfolio.profiles.dev.projects.length);
  const xs = milestones.group.children.map((post) => post.position.x);
  milestones.update(2.8, 1, path);
  expect(milestones.group.children.map((post) => post.position.x)).toEqual(xs);
  expect(xs[0]).toBeGreaterThan(xs[xs.length - 1]);
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
  const milestones = new Milestones(portfolio.profiles.dev.projects, "#fff");
  const out = new THREE.Vector3();
  const path = (story: number) => [-(story - 2) * 40, 0] as const;
  milestones.update(1, 0, path);
  expect(milestones.nearestBoard(0, out)).toBe(Infinity); // hidden before the outdoor world rises
  milestones.update(2.6, 1, path);
  const near = milestones.nearestBoard(path(2.5)[0], out);
  expect(near).toBeLessThan(3);
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
