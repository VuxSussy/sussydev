// @vitest-environment happy-dom
import * as THREE from "three";
import { expect, it } from "vitest";
import { portfolio } from "../data/portfolio";
import { TECH_LOGOS } from "../data/tech-logos";
import { LOGO_Y, PLINTH_TOP } from "../components/story/scene/tech-carousel";
import { buildLogo, LOGO_SIZE } from "../components/story/scene/tech-logo";

const colours = (geometry: THREE.BufferGeometry) => {
  const attribute = geometry.getAttribute("color");
  const set = new Set<string>();
  for (let i = 0; i < attribute.count; i++) set.add(new THREE.Color(attribute.getX(i), attribute.getY(i), attribute.getZ(i)).getHexString());
  return set.size;
};

it("has a real logo for every tech on the conveyor", () => {
  for (const tech of portfolio.profile.techStack) expect(TECH_LOGOS[tech.name], tech.name).toBeDefined();
});

it("builds each logo in its original colours, sized to fit the plinth", () => {
  const multi = ["Luau", "TypeScript", "Python", "C++", "roblox-ts", "Blender", "Figma"];
  for (const [name, spec] of Object.entries(TECH_LOGOS)) {
    const { geometry } = buildLogo(spec);
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(Math.max(size.x, size.y), name).toBeCloseTo(LOGO_SIZE, 3);
    expect(size.z, name).toBeLessThan(0.45);
    if (multi.includes(name)) expect(colours(geometry), name).toBeGreaterThanOrEqual(2);
    geometry.dispose();
  }
});

it("keeps every logo clear of the grey plinth, even focused and bobbing", () => {
  const lowest = LOGO_Y - (LOGO_SIZE / 2) * 1.12 - 0.05;
  expect(lowest).toBeGreaterThan(PLINTH_TOP + 0.08);
});
