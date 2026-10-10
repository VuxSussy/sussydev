// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { portfolio } from "../data/portfolio";
import { TechCarousel } from "../components/story/scene/tech-carousel";

it("reuses pick meshes and restores the same focus and placement when scrolling backwards", () => {
  const carousel = new TechCarousel(portfolio.profiles.dev.techStack);
  const pickables = carousel.pickables;
  expect(pickables).toHaveLength(24);
  expect(carousel.pickables).toBe(pickables);
  carousel.update(4.5, 1, -1, 0);
  const snapshot = () => JSON.stringify(carousel.group.toJSON());
  const initial = snapshot();
  carousel.update(8, 1, -1, 0);
  carousel.update(4.5, 1, -1, 0);
  expect(snapshot()).toBe(initial);
  carousel.update(4.5, 0, -1, 0);
  expect(carousel.group.visible).toBe(false);
  carousel.dispose();
});
