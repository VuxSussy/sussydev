/**
 * Scroll story math shared by the DOM overlay and the WebGL scene (no three.js import here).
 *
 * The page is split into four chapters. `story` is a continuous value in [0, 4]:
 * each chapter section contributes 0→1 as it scrolls past the viewport centre line.
 *   0–1 intro · 1–2 tech stack · 2–3 work · 3–4 sunset & contact
 */
export const CHAPTERS = [
  { id: "mo-dau", label: "Mở đầu", short: "Intro" },
  { id: "tech-stack", label: "Tech stack", short: "Stack" },
  { id: "du-an", label: "Dự án", short: "Work" },
  { id: "lien-he", label: "Liên hệ", short: "Sunset" },
] as const;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Story value from the chapter sections' bounding boxes. */
export function storyFromSections(sections: (HTMLElement | null)[], viewportHeight: number) {
  const line = viewportHeight * 0.5;
  let story = 0;
  for (const section of sections) {
    if (!section) continue;
    const rect = section.getBoundingClientRect();
    story += clamp01((line - rect.top) / Math.max(rect.height, 1));
  }
  return story;
}

/** Inverse scroll mapping, also used when the destination portfolio has different section heights. */
export function scrollTopForStory(story: number, sections: (HTMLElement | null)[], viewportHeight: number, scrollY: number) {
  const value = clamp01(story / CHAPTERS.length) * CHAPTERS.length;
  const index = Math.min(CHAPTERS.length - 1, Math.floor(value));
  const section = sections[index];
  if (!section) return null;
  const rect = section.getBoundingClientRect();
  return Math.max(0, scrollY + rect.top + (value - index) * rect.height - viewportHeight * 0.5);
}

/** Window of the tech chapter in which the conveyor slides between items. */
const TECH_START = 1.08;
const TECH_END = 1.9;

/**
 * Continuous conveyor index for a story value. Between items the motion eases so every tech
 * "dwells" under Sussy's feet for a moment, like a slideshow.
 */
export function techPosition(story: number, count: number) {
  const raw = clamp01((story - TECH_START) / (TECH_END - TECH_START)) * (count - 1);
  const base = Math.floor(raw);
  const frac = raw - base;
  const dwell = frac - Math.sin(2 * Math.PI * frac) / (2 * Math.PI);
  return Math.min(count - 1, base + dwell);
}

/** Story value at which a given tech is centred (inverse of techPosition for integer indices). */
export function storyForTech(index: number, count: number) {
  return TECH_START + (index / Math.max(count - 1, 1)) * (TECH_END - TECH_START);
}

/** 0→1 visibility of the tech conveyor. */
export const techVisibility = (story: number) => smoothstep(0.72, 1.05, story) * (1 - smoothstep(1.95, 2.25, story));

/** 0 = dark studio, 1 = sunset hill. */
export const sunsetMix = (story: number) => smoothstep(2.82, 3.4, story);

/** 0 = running, 1 = seated under the tree. */
export const sitMix = (story: number) => smoothstep(3.4, 3.62, story);

export const chapterIndex = (story: number) => Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(story + 0.35)));

/** Scrub a chapter hop from scroll progress so the same frame also plays backwards. */
export function chapterJumpTime(story: number) {
  const chapter = chapterIndex(story);
  const local = story - (chapter - 0.35);
  return chapter > 0 && local >= 0 && local <= 0.18 ? (local / 0.18) * 0.95 : -1;
}
