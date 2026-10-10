"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type LoadingScreenProps = { progress: number; done: boolean; reducedMotion: boolean };

/** Full-screen loader: Sussy's head as a 2D sprite spinning like a coin while the 3D scene loads. */
export function LoadingScreen({ progress, done, reducedMotion }: LoadingScreenProps) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setHidden(true), reducedMotion ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [done, reducedMotion]);
  if (hidden) return null;
  const percent = Math.round(progress * 100);
  return (
    <output className={`loader${done ? " is-done" : ""}`} aria-live="polite" aria-label={`Đang tải Sussy, ${percent}%`}>
      <div className="loader-stage" aria-hidden="true">
        <Image className="loader-head" src="/brand/sussy-head.png" alt="" width={384} height={384} priority unoptimized />
        <span className="loader-shadow" />
      </div>
      <p className="loader-label">Đang gọi Sussy<span aria-hidden="true">…</span></p>
      <div className="loader-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(progress, 0.04)})` }} /></div>
      <p className="loader-percent" aria-hidden="true">{String(percent).padStart(3, "0")}%</p>
    </output>
  );
}
