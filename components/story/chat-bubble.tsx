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
    let frame = 0;
    const follow = () => {
      const bubble = ref.current;
      const point = scene.current?.headScreenPosition();
      if (bubble) {
        bubble.style.visibility = point ? "visible" : "hidden";
        if (point) {
          bubble.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -100%)`;
          const r = bubble.getBoundingClientRect();
          const covered = overContent([
            [point.x, point.y + 12],
            [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 8], [r.right - 4, r.bottom - 8],
            [(r.left + r.right) / 2, (r.top + r.bottom) / 2],
          ]);
          bubble.classList.toggle("is-covered", covered);
        }
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [scene]);

  return (
    <div ref={ref} className="chat-bubble" aria-hidden="true">
      <p key={id}>{text}</p>
    </div>
  );
}
