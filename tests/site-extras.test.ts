// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { changelog, currentVersion } from "../data/changelog";
import { createRobloxProps } from "../components/story/scene/environment";

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
