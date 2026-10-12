"use client";

import Image from "next/image";
import { SUSSY_EGG_SRC } from "@/lib/brand";
import { useEffect, useRef, useState } from "react";

type LoadingScreenProps = { progress: number; done: boolean; reducedMotion: boolean; label: string };

/** The loader stays up at least this long, so the roll reads as a moment rather than a flicker. */
export const LOADER_MIN_MS = 3500;
/** ...and at most this long: past it the page shows even if the 3D scene is still streaming in. */
export const LOADER_MAX_MS = 15000;
/** Studs along the track (they light up as the head rolls over them). */
const STUDS = 12;

/**
 * Loader: a dark cover over the page while the 3D scene loads, and in the bottom-right corner Sussy's round head
 * rolling along a row of Roblox studs. The head's position is the progress (never ahead of the minimum duration),
 * so it rolls rather than slides: rotation follows distance in CSS.
 */
export function LoadingScreen({ progress, done, reducedMotion, label }: LoadingScreenProps) {
  const [hidden, setHidden] = useState(false);
  const [shown, setShown] = useState(0);
  const start = useRef<number | null>(null);
  const target = useRef(0);
  useEffect(() => {
    target.current = done ? 1 : progress;
  }, [done, progress]);

  // Ease the shown value towards the real progress, capped by elapsed time over the minimum duration.
  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      start.current ??= now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const cap = reducedMotion ? 1 : Math.min(1, (now - start.current) / LOADER_MIN_MS);
      const goal = Math.min(target.current, cap);
      setShown((value) => (reducedMotion ? goal : value + (goal - value) * (1 - Math.exp(-6 * dt))));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hidden, reducedMotion]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setHidden(true), reducedMotion ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [done, reducedMotion]);

  if (hidden) return null;
  const percent = Math.round(Math.min(shown, progress) * 100);
  const lit = Math.floor(shown * STUDS + 0.35);
  return (
    <output className={`loader${done ? " is-done" : ""}`} aria-live="polite" aria-label={`${label}, ${percent}%`}>
      <p className="loader-brand" aria-hidden="true"><span className="brand-mark" /><strong>SUSSY / 001</strong></p>
      <div className="loader-corner" aria-hidden="true" style={{ "--p": shown } as React.CSSProperties}>
        <div className="loader-track">
          <span className="loader-ball">
            <Image className="loader-ball-face" src={SUSSY_EGG_SRC} alt="" width={256} height={256} priority unoptimized />
          </span>
          <span className="loader-ball-shadow" />
          <ol className="loader-studs">
            {Array.from({ length: STUDS }, (_, i) => <li key={i} data-lit={i < lit} />)}
          </ol>
        </div>
        <p className="loader-meta"><span>{label}</span><span className="loader-percent">{String(percent).padStart(3, "0")}%</span></p>
      </div>
    </output>
  );
}
