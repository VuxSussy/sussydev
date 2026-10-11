import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterIndex, chapterJumpTime, clamp01, damp, scrollTopForStory, sitMix, smoothstep, smootherstep, storyForTech, storyFromSections, sunsetMix, techPosition, techVisibility } from "../lib/story";

const section = (top: number, height: number) => ({ getBoundingClientRect: () => ({ top, height }) }) as HTMLElement;

describe("scroll story", () => {
  it("adds section progress at the viewport centre and ignores missing sections", () => {
    expect(storyFromSections([section(-500, 1000), section(500, 2000), null], 1000)).toBe(1);
    expect(storyFromSections([section(-1500, 1000), section(-500, 2000)], 1000)).toBe(1.5);
    expect(storyFromSections([section(1500, 1000)], 1000)).toBe(0);
    expect(storyFromSections([section(-1, 0)], 0)).toBe(1);
    expect(storyFromSections([], 1000)).toBe(0);
  });

  it("clamps the chapter rail including the final chapter", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["mo-dau", "tech-stack", "du-an", "lien-he"]);
    expect([-1, 0, 0.64, 0.65, 1.65, 2.65, 4, 10].map(chapterIndex)).toEqual([0, 0, 0, 1, 2, 3, 3, 3]);
  });

  it("restores the same story when the destination chapters have different heights", () => {
    for (const techHeight of [4200, 3600]) {
      const heights = [1500, techHeight, 2500, 1900];
      const tops = [0, 1500, 1500 + techHeight, 4000 + techHeight];
      for (const value of [0.5, 1.45, 1.89, 2.4, 3.5]) {
        const sections = heights.map((height, i) => section(tops[i], height));
        const scrollY = scrollTopForStory(value, sections, 1000, 0)!;
        expect(storyFromSections(heights.map((height, i) => section(tops[i] - scrollY, height)), 1000)).toBeCloseTo(value, 10);
      }
    }
    expect(scrollTopForStory(-1, [section(0, 1500)], 1000, 0)).toBe(0);
    expect(scrollTopForStory(4, [null, null, null, section(5000, 1900)], 1000, 100)).toBe(6500);
    expect(scrollTopForStory(1, [], 1000, 0)).toBeNull();
  });

  it("eases monotonically with fixed endpoints", () => {
    expect([-2, 0, 0.5, 1, 2].map(clamp01)).toEqual([0, 0, 0.5, 1, 1]);
    expect([-1, 0, 0.5, 1, 2].map((s) => smoothstep(0, 1, s))).toEqual([0, 0, 0.5, 1, 1]);
    expect([0, 0.5, 1].map(smootherstep)).toEqual([0, 0.5, 1]);
    for (let i = 1; i <= 100; i++) expect(smootherstep(i / 100)).toBeGreaterThanOrEqual(smootherstep((i - 1) / 100));
  });

  it("damps independently of the number of frames", () => {
    const oneFrame = damp(0, 4, 4.5, 1 / 30);
    expect(damp(damp(0, 4, 4.5, 1 / 60), 4, 4.5, 1 / 60)).toBeCloseTo(oneFrame, 12);
    expect(damp(2, 4, 4.5, 0)).toBe(2);
    expect(damp(4, 0, 4.5, 1)).toBeGreaterThan(0);
    expect(damp(4, 0, 4.5, 1)).toBeLessThan(4);
  });
});

describe("tech conveyor and sunset", () => {
  it.each([1, 10, 12])("centres every tech for a %i-item stack", (count) => {
    for (let i = 0; i < count; i++) expect(techPosition(storyForTech(i, count), count)).toBeCloseTo(i, 10);
    expect(techPosition(-5, count)).toBe(0);
    expect(techPosition(10, count)).toBe(count - 1);
  });

  it("keeps conveyor motion continuous, monotone, and reversible", () => {
    const values = Array.from({ length: 1001 }, (_, i) => techPosition(i / 250, 12));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      expect(values[i] - values[i - 1]).toBeLessThan(0.12);
    }
    expect([...values].reverse()).toEqual(Array.from({ length: 1001 }, (_, i) => techPosition((1000 - i) / 250, 12)));
  });

  it("reveals the conveyor only in the stack chapter", () => {
    expect([0, 0.72, 1.05, 1.9, 2.12, 4].map(techVisibility)).toEqual([0, 0, 1, 1, 0, 0]);
  });

  it("finishes the sunset before seating the character", () => {
    expect([0, 2.3, 3.2, 4].map(sunsetMix)).toEqual([0, 0, 1, 1]);
    expect([0, 3.4, 3.62, 4].map(sitMix)).toEqual([0, 0, 1, 1]);
    expect(sunsetMix(2.75)).toBeCloseTo(0.5);
    expect(sitMix(3.51)).toBeCloseTo(0.5);
  });

  it("scrubs chapter hops from story rather than elapsed frames", () => {
    for (const boundary of [0.65, 1.65, 2.65]) {
      expect(chapterJumpTime(boundary - 0.01)).toBe(-1);
      expect(chapterJumpTime(boundary)).toBeCloseTo(0);
      expect(chapterJumpTime(boundary + 0.09)).toBeCloseTo(0.475);
      expect(chapterJumpTime(boundary + 0.181)).toBe(-1);
    }
    const steps = Array.from({ length: 401 }, (_, i) => i / 100);
    const forward = steps.map(chapterJumpTime);
    expect([...steps].reverse().map(chapterJumpTime).reverse()).toEqual(forward);
    expect(chapterJumpTime(3.5)).toBe(-1);
  });
});
