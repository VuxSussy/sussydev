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
export const techVisibility = (story: number) => smoothstep(0.72, 1.05, story) * (1 - smoothstep(1.92, 2.12, story));

/** 0 = dark studio, 1 = sunset hill. */
export const sunsetMix = (story: number) => smoothstep(2.3, 3.2, story);

/**
 * The journey (Work chapter onwards): Sussy runs out of the studio, walks past the project screens and runs on to
 * the tree. Road positions are x in studs (the road runs from the studio at 0 towards -X).
 *   doorFlood    the doorway's light floods the screen as Sussy steps through (Sussy is in the door at DOOR_STORY)
 *   worldReveal  0→1 the meadow comes up behind that light, never in plain view
 *   studioExit   0→1 studio floor, doorway, conveyor and Roblox props go, also behind the light
 *   journeyX     Sussy's x on the road
 *   arriveMix    0→1 Sussy turns round at the tree to face the camera
 */
export const ROAD = {
  door: -9,
  /** First and last project screen stop; after the door there is a clear run before the first one. */
  firstStop: -42,
  /** 26 studs between stops: a stretch of open road between one big screen and the next. */
  lastStop: -120,
  /** Where Sussy sits under the tree. */
  sit: -146,
} as const;
export const DOOR_STORY = 2.3;
/**
 * The showcase: Sussy walks from the first stop (start) to the last (end). The page measures where its project cards
 * sit and calls `setShowcase`, so screen i is beside Sussy while card i is in the middle of the viewport.
 */
export const SHOWCASE = { start: 2.5, end: 2.92 };
const SHOWCASE_DEFAULT = { ...SHOWCASE };
export function setShowcase(start: number, end: number) {
  // A clear run after the door's light (gone at ~2.46), and the last stop before the contact chapter.
  SHOWCASE.start = Math.min(Math.max(start, 2.5), 2.7);
  SHOWCASE.end = Math.min(Math.max(end, SHOWCASE.start + 0.12), 2.95);
}
export const resetShowcase = () => setShowcase(SHOWCASE_DEFAULT.start, SHOWCASE_DEFAULT.end);
/** Sussy is on the showcase stretch (a little before the first screen to a little after the last). */
export const showcaseActive = (story: number) => story >= SHOWCASE.start - 0.035 && story <= SHOWCASE.end + 0.03;
/** The project whose screen Sussy is at (or walking to): the nearest stop. */
export const showcaseIndex = (story: number, count: number) =>
  count > 1 ? Math.min(count - 1, Math.max(0, Math.round(((story - SHOWCASE.start) / (SHOWCASE.end - SHOWCASE.start)) * (count - 1)))) : 0;
/** Story value at which Sussy stands at stop `index` of `count`. */
export const stopStory = (index: number, count: number) =>
  SHOWCASE.start + (SHOWCASE.end - SHOWCASE.start) * (count > 1 ? index / (count - 1) : 0);

export function doorFlood(story: number) {
  return {
    /** 0→1 how far the light has spread from the doorway (it widens, then stays wide while it fades). */
    spread: smootherstep(clamp01((story - 2.12) / 0.14)),
    /** Light strength: builds as Sussy nears the door, holds while Sussy is inside it, then eases away outdoors. */
    strength: smoothstep(2.15, 2.255, story) * (1 - smoothstep(2.305, 2.46, story)),
  };
}
export const worldReveal = (story: number) => smoothstep(2.25, 2.3, story);
export const studioExit = (story: number) => smoothstep(2.255, 2.3, story);

/** Cubic Hermite from (s0, x0, velocity v0) to (s1, x1, v1); velocities in studs per story unit. */
function hermite(s: number, s0: number, x0: number, v0: number, s1: number, x1: number, v1: number) {
  const h = s1 - s0;
  const t = clamp01((s - s0) / h);
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * x0 + (t3 - 2 * t2 + t) * h * v0 + (-2 * t3 + 3 * t2) * x1 + (t3 - t2) * h * v1;
}

/** How much the pace eases off in front of each screen (0 = even, 1 = full stop); light, so a steady scroll keeps a steady gait. */
const SHOWCASE_DWELL = 0.3;
const JOURNEY_START = 2.06;
/** Sussy reaches the tree. */
export const ARRIVE_STORY = 3.3;
const DOOR_SPEED = 95;

/**
 * Sussy's x on the road: to the door and on past it (a clear stretch so the first screen is not in the door's
 * light), past the screens easing off a little at each, then on to the tree. Walk or run follows the scroll speed.
 * @param stops number of project screens
 */
export function journeyX(story: number, stops: number) {
  const n = Math.max(stops, 1);
  const span = SHOWCASE.end - SHOWCASE.start;
  const average = (ROAD.lastStop - ROAD.firstStop) / span;
  // Pace at a screen (the slowest point of the walk), so the run hands over to the walk without a jolt.
  const atStop = n > 1 ? average * (1 - SHOWCASE_DWELL) : 0;
  if (story <= JOURNEY_START) return 0;
  if (story < DOOR_STORY) return hermite(story, JOURNEY_START, 0, 0, DOOR_STORY, ROAD.door, -DOOR_SPEED);
  if (story < SHOWCASE.start) return hermite(story, DOOR_STORY, ROAD.door, -DOOR_SPEED, SHOWCASE.start, ROAD.firstStop, atStop);
  if (story < SHOWCASE.end && n > 1) {
    const u = ((story - SHOWCASE.start) / span) * (n - 1);
    const f = u - Math.floor(u);
    const eased = Math.floor(u) + f - (SHOWCASE_DWELL * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
    return ROAD.firstStop + ((ROAD.lastStop - ROAD.firstStop) * eased) / (n - 1);
  }
  const from = n > 1 ? ROAD.lastStop : ROAD.firstStop;
  return hermite(story, SHOWCASE.end, from, atStop, ARRIVE_STORY, ROAD.sit, 0);
}
export const arriveMix = (story: number) => smoothstep(3.22, 3.42, story);

/** 0 = running, 1 = seated under the tree. */
export const sitMix = (story: number) => smoothstep(3.4, 3.62, story);

/**
 * Chapter shown on the rail: a sticky chapter counts once its copy is up (0.35 early); the long Work chapter is
 * read to its end, so Contact starts only as the contact panel arrives.
 */
export const chapterIndex = (story: number) => (story < 0.65 ? 0 : story < 1.65 ? 1 : story < 2.94 ? 2 : 3);

/** Where chapter navigation (rail, J/K, header link) lands: just inside a chapter, or seated for the last one. */
export const chapterTarget = (index: number) => (index <= 0 ? 0 : index >= CHAPTERS.length - 1 ? CHAPTERS.length - 0.25 : index + 0.18);

/**
 * Story values at which Sussy says the chapter's chat line: hello, the tech stack, at the studio door, and only once
 * seated under the tree (the contact chapter starts while Sussy is still running down the road).
 */
const SPEECH_BEATS = [0, 0.65, 1.98, 3.55] as const;
export const speechBeat = (story: number) => SPEECH_BEATS.reduce<number>((beat, start, index) => (story >= start ? index : beat), 0);

/** Scrub a chapter hop from scroll progress so the same frame also plays backwards. */
export function chapterJumpTime(story: number) {
  const chapter = chapterIndex(story);
  const local = story - (chapter - 0.35);
  return chapter > 0 && local >= 0 && local <= 0.18 ? (local / 0.18) * 0.95 : -1;
}
