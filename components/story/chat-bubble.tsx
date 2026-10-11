"use client";

import { useEffect, useRef } from "react";
import type { StoryScene } from "./scene/story-scene";

type ChatBubbleProps = {
  /** Text to show; changing `id` restarts the pop-in animation. */
  text: string;
  id: number;
  scene: React.RefObject<StoryScene | null>;
};

/** Roblox-style chat bubble that follows Sussy's head (positioned each frame, no React re-render). */
export function ChatBubble({ text, id, scene }: ChatBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const follow = () => {
      const bubble = ref.current;
      const point = scene.current?.headScreenPosition();
      if (bubble) {
        bubble.style.visibility = point ? "visible" : "hidden";
        if (point) bubble.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -100%)`;
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
