"use client";

import { useEffect, useRef } from "react";
import type { StoryScene } from "./scene/story-scene";

type ChatBubbleProps = {
  /** Text to show; changing `id` restarts the pop-in animation. */
  text: string;
  id: number;
  scene: React.RefObject<StoryScene | null>;
};

/** Page content the bubble must never cover (it would hide text or controls). */
const CONTENT = ".glass-card, .contact-panel, .chapter-copy > *, .work-inner > h2, .work-inner > .eyebrow, .hud-header > *, .hud-footer > *";

/** True when any of the given screen points lands on page content (the bubble itself ignores pointer events). */
function overContent(points: [number, number][]) {
  return points.some(([x, y]) => document.elementFromPoint(x, y)?.closest(CONTENT));
}

/**
 * Roblox-style chat bubble that follows Sussy's head (positioned each frame, no React re-render).
 * It fades out while Sussy is behind text (e.g. the project cards on phones) instead of covering it.
 */
export function ChatBubble({ text, id, scene }: ChatBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bubble = ref.current;
    if (!bubble) return;
    let frame = 0;
    let count = 0;
    // Infinity (not NaN, which compares false) so the first frame always places the bubble.
    let lastX = Number.POSITIVE_INFINITY;
    let lastY = Number.POSITIVE_INFINITY;
    // The bubble's size comes from a ResizeObserver, so the per-frame loop only writes a transform and never
    // reads layout back (reading the rect right after moving it forced a synchronous layout every frame).
    const size = { width: bubble.offsetWidth, height: bubble.offsetHeight };
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      size.width = box ? box.inlineSize : bubble.offsetWidth;
      size.height = box ? box.blockSize : bubble.offsetHeight;
    });
    observer.observe(bubble);
    const follow = () => {
      frame = requestAnimationFrame(follow);
      const point = scene.current?.headScreenPosition();
      bubble.style.visibility = point ? "visible" : "hidden";
      if (!point) return;
      const moved = Math.abs(point.x - lastX) > 0.25 || Math.abs(point.y - lastY) > 0.25;
      if (moved) {
        bubble.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -100%)`;
        lastX = point.x;
        lastY = point.y;
      }
      // Hit-testing is the costly part: every 4th frame is plenty for a fade that takes 250 ms.
      if (++count % 4 !== 0) return;
      const left = point.x - size.width / 2;
      const right = point.x + size.width / 2;
      const top = point.y - size.height;
      const bottom = point.y;
      const covered = overContent([
        [point.x, point.y + 12],
        [left + 4, top + 4], [right - 4, top + 4], [left + 4, bottom - 8], [right - 4, bottom - 8],
        [point.x, (top + bottom) / 2],
      ]);
      bubble.classList.toggle("is-covered", covered);
    };
    frame = requestAnimationFrame(follow);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scene]);

  return (
    <div ref={ref} className="chat-bubble" aria-hidden="true">
      <p key={id}>{text}</p>
    </div>
  );
}
