// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolio } from "../data/portfolio";
import { resetDemo, stopStory, storyForTech } from "../lib/story";
import type { StorySceneOptions } from "../components/story/scene/story-scene";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const scene = vi.hoisted(() => ({
  constructor: vi.fn(), load: vi.fn(async () => {}), dispose: vi.fn(), setStory: vi.fn(),
  setReducedMotion: vi.fn(), setProjects: vi.fn(), refresh: vi.fn(), addScroll: vi.fn(), wave: vi.fn(), headScreenPosition: vi.fn(() => null),
}));
let options: StorySceneOptions;

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("next/link", () => ({ default: ({ scroll: _scroll, children, ...props }: ComponentProps<"a"> & { scroll?: boolean }) => <a {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ priority: _priority, unoptimized: _unoptimized, ...props }: ComponentProps<"img"> & { priority?: boolean; unoptimized?: boolean }) => createElement("img", props) }));
vi.mock("../components/story/scene/story-scene", () => ({ StoryScene: class {
  constructor(value: StorySceneOptions) { options = value; scene.constructor(); }
  load = scene.load;
  dispose = scene.dispose;
  setStory = scene.setStory;
  setReducedMotion = scene.setReducedMotion;
  setProjects = scene.setProjects;
  refresh = scene.refresh;
  addScroll = scene.addScroll;
  wave = scene.wave;
  headScreenPosition = scene.headScreenPosition;
} }));

import { PortfolioShell } from "../components/story/portfolio-shell";

let root: Root;
let host: HTMLDivElement;
const SECTIONS: Record<string, [number, number]> = { "mo-dau": [0, 1500], "tech-stack": [1500, 4200], "du-an": [5700, 6000], "lien-he": [11700, 1900] };
const topForStory = (story: number) => {
  const [top, height] = Object.values(SECTIONS)[Math.floor(story)];
  return top + (story % 1) * height - 500;
};

async function renderRoute(path: string) {
  navigation.pathname = path;
  await act(async () => { root.render(<PortfolioShell>{null}</PortfolioShell>); });
}

async function scrollToStory(story: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: topForStory(story) });
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(32);
  });
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  resetDemo();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  vi.spyOn(window, "scrollTo").mockImplementation((input: number | ScrollToOptions) => {
    if (typeof input === "object") Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: input.top ?? 0 });
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const [top, height] = SECTIONS[this.id] ?? [0, 0];
    return { top: top - window.scrollY, height } as DOMRect;
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await renderRoute("/");
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("portfolio story", () => {
  it("keeps the loader up for its minimum roll, then hands the scene its projects", async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(host.querySelector(".loader")?.classList.contains("is-done")).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(host.querySelector(".loader")?.classList.contains("is-done")).toBe(true);
    expect(scene.setProjects).toHaveBeenCalledWith(portfolio.profile.projects);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(host.querySelector(".loader")).toBeNull();
  });

  it("scrolls to a tech picked in the scene and reuses one canvas and scene", async () => {
    const canvas = host.querySelector("canvas");
    const count = portfolio.profile.techStack.length;
    await act(async () => { options.onTechSelect?.(count - 1); });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 1500 + (storyForTech(count - 1, count) + 0.001 - 1) * 4200 - 500, behavior: "smooth" });
    await renderRoute("/");
    expect(scene.constructor).toHaveBeenCalledTimes(1);
    expect(host.querySelector("canvas")).toBe(canvas);
  });

  it("shows the project Sussy is at in the side panel, and its dots jump between projects", async () => {
    const projects = portfolio.profile.projects;
    const title = () => host.querySelector(".demo-panel h3")?.textContent;
    await scrollToStory(stopStory(0, projects.length));
    expect(title()).toBe(projects[0].title);
    await scrollToStory(stopStory(projects.length - 1, projects.length));
    expect(title()).toBe(projects[projects.length - 1].title);
    const dots = host.querySelectorAll<HTMLButtonElement>(".demo-dots button");
    expect(dots).toHaveLength(projects.length);
    expect(dots[projects.length - 1].getAttribute("aria-current")).toBe("true");
    await act(async () => { dots[1].click(); });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: expect.closeTo(topForStory(stopStory(1, projects.length) + 0.0005), 6), behavior: "smooth" });
  });

  it("disposes the scene when the layout leaves the portfolio", async () => {
    await renderRoute("/du-an/demo-1");
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it("releases a failed scene and exposes the poster fallback", async () => {
    await act(async () => { root.render(null); });
    scene.dispose.mockClear();
    scene.load.mockRejectedValueOnce(new Error("Asset unavailable"));
    await renderRoute("/");
    await act(async () => { await vi.advanceTimersByTimeAsync(32); });
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(host.querySelector(".stage")?.classList.contains("is-fallback")).toBe(true);
    expect(host.querySelector(".stage-poster")).not.toBeNull();
  });
  it("lifts the loader after its cap even if the scene is still loading", async () => {
    await act(async () => { root.render(null); });
    scene.load.mockImplementationOnce(() => new Promise(() => {}));
    await renderRoute("/");
    await act(async () => { await vi.advanceTimersByTimeAsync(14_000); });
    expect(host.querySelector(".loader")?.classList.contains("is-done")).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_100); });
    expect(host.querySelector(".loader")?.classList.contains("is-done")).toBe(true);
    expect(host.querySelector(".stage")?.classList.contains("is-fallback")).toBe(false);
  });

  it("falls back to the poster only when a lost WebGL context does not come back", async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    const stage = () => host.querySelector(".stage")!;
    await act(async () => { options.onContextLost?.(); await vi.advanceTimersByTimeAsync(2000); });
    await act(async () => { options.onContextRestored?.(); await vi.advanceTimersByTimeAsync(5000); });
    expect(stage().classList.contains("is-fallback")).toBe(false);
    await act(async () => { options.onContextLost?.(); await vi.advanceTimersByTimeAsync(4100); });
    expect(stage().classList.contains("is-fallback")).toBe(true);
    await act(async () => { options.onContextRestored?.(); });
    expect(stage().classList.contains("is-fallback")).toBe(false);
  });
});
