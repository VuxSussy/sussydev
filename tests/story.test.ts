import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterIndex, chapterTarget, DOOR_STORY, doorFlood, journeyX, resetDemo, ROAD, setDemo, DEMO, demoIndex, speechBeat, stopStory, clamp01, damp, studioExit, worldReveal, scrollTopForStory, sitMix, smoothstep, smootherstep, storyForTech, storyFromSections, sunsetMix, techPosition, techVisibility } from "../lib/story";

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
    // The long Work chapter (road + demo) is read to its end before the rail moves on to Contact.
    expect([-1, 0, 0.64, 0.65, 1.65, 2.65, 2.93, 2.94, 4, 10].map(chapterIndex)).toEqual([0, 0, 0, 1, 2, 2, 2, 3, 3, 3]);
    // Chat beats: the door line waits for the door, the goodbye waits until Sussy has sat down (sitMix ~ 1).
    expect([0, 0.7, 1.9, 2.0, 2.9, 3.54, 3.55, 4].map(speechBeat)).toEqual([0, 1, 1, 2, 2, 2, 3, 3]);
    expect(sitMix(3.55)).toBeGreaterThan(0.5);
    // Navigation lands inside each chapter, and on the seated pose for the last one.
    expect([0, 1, 2, 3].map(chapterTarget)).toEqual([0, 1.18, 2.18, 3.75]);
    expect([0, 1, 2, 3].map((i) => chapterIndex(chapterTarget(i)))).toEqual([0, 1, 2, 3]);
    expect(sitMix(chapterTarget(3))).toBe(1);
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

  it("swaps the studio for the meadow only while the doorway light covers the screen", () => {
    expect(doorFlood(2.1)).toEqual({ spread: 0, strength: 0 });
    expect(doorFlood(2.47).strength).toBe(0);
    // Studio and meadow change hands entirely under full light (Sussy is in the doorway at DOOR_STORY).
    for (let s = 2.255; s <= 2.305; s += 0.005) expect(doorFlood(s).strength).toBeGreaterThan(0.99);
    expect(worldReveal(2.25)).toBe(0);
    expect(worldReveal(2.255)).toBeLessThan(0.05);
    expect([2.3, 2.305].map(worldReveal)).toEqual([1, 1]);
    expect([2.255, DOOR_STORY].map(studioExit)).toEqual([0, 1]);
    expect(journeyX(DOOR_STORY, 4)).toBeCloseTo(ROAD.door);
    // The light widens to cover the screen before the swap and stays wide while it fades.
    expect(doorFlood(2.255).spread).toBeGreaterThan(0.97);
    expect(doorFlood(2.4).spread).toBe(1);
  });

  it("runs clear of the door's light before the first project screen, then on to the tree", () => {
    resetDemo();
    const n = 4;
    // The first stop comes after the light has gone, with a long stretch of road from the door.
    expect(doorFlood(stopStory(0, n)).strength).toBe(0);
    expect(ROAD.door - ROAD.firstStop).toBeGreaterThan(25);
    for (let i = 0; i < n; i++) expect(journeyX(stopStory(i, n), n)).toBeCloseTo(ROAD.firstStop + ((ROAD.lastStop - ROAD.firstStop) * i) / (n - 1));
    expect(journeyX(4, n)).toBe(ROAD.sit);
    // Always moving forward (towards -X) and continuous: no jumps between the stretches.
    let previous = journeyX(2, n);
    for (let s = 2; s <= 3.5; s += 0.001) {
      const x = journeyX(s, n);
      expect(x).toBeLessThanOrEqual(previous + 1e-9);
      expect(previous - x).toBeLessThan(0.35);
      previous = x;
    }
    // Pace eases off at each screen but never stops, so a steady scroll keeps a steady gait.
    const pace = (s: number) => (journeyX(s - 0.001, n) - journeyX(s + 0.001, n)) / 0.002;
    const between = pace((stopStory(0, n) + stopStory(1, n)) / 2);
    expect(pace(stopStory(1, n))).toBeGreaterThan(between * 0.4);
    expect(pace(stopStory(1, n))).toBeLessThan(between);
  });

  it("lines the demo up with the page and switches the panel at the nearest stop", () => {
    setDemo(2.4, 3.2);
    // Clamped: after the door's light, and before the contact chapter.
    expect(DEMO).toEqual({ start: 2.5, end: 2.95 });
    setDemo(2.55, 2.91);
    expect([2.4, 2.55, 2.6, 2.67, 2.91, 3.2].map((s) => demoIndex(s, 4))).toEqual([0, 0, 0, 1, 3, 3]);
    expect(stopStory(3, 4)).toBeCloseTo(2.91);
    resetDemo();
  });
});
