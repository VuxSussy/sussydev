// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storyForTech } from "../lib/story";
import type { StorySceneOptions } from "../components/story/scene/story-scene";

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));
const scene = vi.hoisted(() => ({
  constructor: vi.fn(), load: vi.fn(async () => {}), dispose: vi.fn(), setStory: vi.fn(),
  setReducedMotion: vi.fn(), setProfile: vi.fn(), setDeparting: vi.fn(),
}));
let options: StorySceneOptions;

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ push: navigation.push }) }));
vi.mock("next/link", () => ({ default: ({ scroll: _scroll, children, ...props }: ComponentProps<"a"> & { scroll?: boolean }) => <a {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ priority: _priority, unoptimized: _unoptimized, ...props }: ComponentProps<"img"> & { priority?: boolean; unoptimized?: boolean }) => createElement("img", props) }));
vi.mock("../components/story/scene/story-scene", () => ({ StoryScene: class {
  constructor(value: StorySceneOptions) { options = value; scene.constructor(); }
  load = scene.load;
  dispose = scene.dispose;
  setStory = scene.setStory;
  setReducedMotion = scene.setReducedMotion;
  setProfile = scene.setProfile;
  setDeparting = scene.setDeparting;
} }));

import { PortfolioShell } from "../components/story/portfolio-shell";

let root: Root;
let host: HTMLDivElement;

async function clickMode(label: string, ctrlKey = false) {
  const link = [...host.querySelectorAll(".mode-switch a")].find((a) => a.textContent === label)!;
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey });
  await act(async () => { link.dispatchEvent(event); });
  return event;
}

async function renderRoute(path: string) {
  navigation.pathname = path;
  await act(async () => { root.render(<PortfolioShell>{null}</PortfolioShell>); });
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  vi.spyOn(window, "scrollTo").mockImplementation((input: number | ScrollToOptions) => {
    if (typeof input === "object") Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: input.top ?? 0 });
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const techHeight = host?.querySelector(".site")?.getAttribute("data-mode") === "roblox" ? 3600 : 4200;
    const bounds: Record<string, [number, number]> = {
      "mo-dau": [0, 1500], "tech-stack": [1500, techHeight], "du-an": [1500 + techHeight, 2500], "lien-he": [4000 + techHeight, 1900],
    };
    const [top, height] = bounds[this.id] ?? [0, 0];
    return { top: top - window.scrollY, height } as DOMRect;
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await renderRoute("/");
  await act(async () => { await vi.advanceTimersByTimeAsync(1800); });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("portfolio route switch", () => {
  it("keeps the same canvas and scene, restores fractional chapter progress and updates scene tech callbacks", async () => {
    const canvas = host.querySelector("canvas");
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 3100 }); // Story 1.5 in Dev.
    await clickMode("Roblox");
    expect(host.querySelector(".mode-curtain")?.classList.contains("is-active")).toBe(true);
    await clickMode("Roblox");
    await act(async () => { await vi.advanceTimersByTimeAsync(240); });
    expect(navigation.push).toHaveBeenCalledExactlyOnceWith("/roblox", { scroll: false });
    await renderRoute("/roblox");
    await act(async () => { await vi.advanceTimersByTimeAsync(32); });
    expect(window.scrollY).toBe(2800); // Story 1.5 in Roblox.
    expect(scene.constructor).toHaveBeenCalledTimes(1);
    expect(scene.load).toHaveBeenCalledTimes(1);
    expect(scene.dispose).not.toHaveBeenCalled();
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(scene.setProfile).toHaveBeenLastCalledWith("roblox", expect.any(Array), 1.5);
    expect(host.querySelector(".mode-curtain")?.classList.contains("is-active")).toBe(false);
    await act(async () => { options.onTechSelect?.(9); });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 1500 + (storyForTech(9, 10) + 0.001 - 1) * 3600 - 500, behavior: "smooth" });
    await clickMode("Dev");
    await act(async () => { await vi.advanceTimersByTimeAsync(240); });
    await renderRoute("/");
    expect(scene.constructor).toHaveBeenCalledTimes(1);
    expect(window.scrollY).toBeCloseTo(1500 + (storyForTech(9, 10) + 0.001 - 1) * 4200 - 500, 8);
  });

  it("respects reduced motion and leaves modified link clicks to the browser", async () => {
    const modified = await clickMode("Roblox", true);
    expect(modified.defaultPrevented).toBe(false);
    expect(navigation.push).not.toHaveBeenCalled();
    localStorage.setItem("sussy-reduced-motion", "1");
    await act(async () => { window.dispatchEvent(new Event("sussy-motion-change")); });
    await clickMode("Roblox");
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(navigation.push).toHaveBeenCalledExactlyOnceWith("/roblox", { scroll: false });
    expect(scene.setDeparting).toHaveBeenLastCalledWith(false);
    expect(host.querySelector(".site")?.getAttribute("data-reduced-motion")).toBe("true");
  });

  it("cancels queued navigation and disposes the scene when the layout leaves the portfolio", async () => {
    await clickMode("Roblox");
    await renderRoute("/du-an/portfolio-3d");
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(navigation.push).not.toHaveBeenCalled();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });
});
