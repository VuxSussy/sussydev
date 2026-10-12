// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatBubble } from "../components/story/chat-bubble";
import type { StoryScene } from "../components/story/scene/story-scene";

let frames: FrameRequestCallback[] = [];
const step = () => { const run = frames; frames = []; run.forEach((f) => f(performance.now())); };

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => frames.push(f));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

it("places the bubble over Sussy's head from the first frame and only reads layout via its observer", async () => {
  const point = { x: 320, y: 140 };
  const scene = createRef<StoryScene>() as { current: StoryScene | null };
  scene.current = { headScreenPosition: () => point } as unknown as StoryScene;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(<ChatBubble text="gg!" id={1} scene={scene} />); });
  const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
  step();
  const bubble = host.querySelector<HTMLElement>(".chat-bubble")!;
  expect(bubble.style.visibility).toBe("visible");
  expect(bubble.style.transform).toContain("translate3d(320px, 140px, 0)");
  point.x = 400;
  step(); step(); step(); step();
  expect(bubble.style.transform).toContain("translate3d(400px, 140px, 0)");
  expect(rect).not.toHaveBeenCalled();
  scene.current = { headScreenPosition: () => null } as unknown as StoryScene;
  step();
  expect(bubble.style.visibility).toBe("hidden");
  await act(async () => { root.unmount(); });
  host.remove();
});
