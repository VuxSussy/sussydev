"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Copy, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { caseStudies } from "@/data/case-studies";
import { currentVersion } from "@/data/changelog";
import { chatLines, contactLabel, localizedProfile, ui, type Locale } from "@/data/i18n";
import { portfolio, TECH_GROUPS, type ContactLink } from "@/data/portfolio";
import { CHAPTERS, chapterIndex, chapterTarget, scrollTopForStory, setDemo, demoActive, demoIndex, speechBeat, stopStory, storyForTech, storyFromSections, techPosition } from "@/lib/story";
import type { StoryScene } from "./scene/story-scene";
import { BrandIcon } from "./brand-icon";
import { ChatBubble } from "./chat-bubble";
import { LOADER_MAX_MS, LOADER_MIN_MS, LoadingScreen } from "./loading-screen";
/** A lost WebGL context that has not come back after this long falls back to the static page. */
const CONTEXT_RESTORE_MS = 4000;

const LOCALE_KEY = "sussy-locale";
const LOCALE_EVENT = "sussy-locale-change";

/** Interface language: the visitor's remembered choice, Vietnamese by default. */
function readLocale(): Locale {
  try {
    return window.localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

function subscribeLocale(callback: () => void) {
  window.addEventListener(LOCALE_EVENT, callback);
  return () => window.removeEventListener(LOCALE_EVENT, callback);
}

const MOTION_KEY = "sussy-reduced-motion";
const MOTION_EVENT = "sussy-motion-change";

/** Reduced motion: the user's remembered toggle, else the OS preference. */
function readReducedMotion() {
  try {
    const stored = window.localStorage.getItem(MOTION_KEY);
    if (stored !== null) return stored === "1";
  } catch { /* storage unavailable */ }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  window.addEventListener(MOTION_EVENT, callback);
  return () => {
    query.removeEventListener("change", callback);
    window.removeEventListener(MOTION_EVENT, callback);
  };
}

function contactHref(contact: ContactLink) {
  if (!contact.value) return undefined;
  if (contact.kind === "phone") return `tel:${contact.value.replace(/\s+/g, "")}`;
  if (contact.kind === "gmail") return `mailto:${contact.value}`;
  return contact.value;
}

function contactText(contact: ContactLink) {
  if (!contact.value) return "Đang cập nhật";
  return contact.value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

// The 3D scene and scroll maths use the source tech list; only the copy is localised.
const techs = portfolio.profile.techStack;

export function PortfolioStory() {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "vi" as Locale);
  const profile = useMemo(() => localizedProfile(locale), [locale]);
  const t = ui[locale];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const sceneRef = useRef<StoryScene | null>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const chipsRef = useRef<HTMLFieldSetElement>(null);
  const stopsRef = useRef<HTMLOListElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  const reducedRef = useRef(reducedMotion);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [techIndex, setTechIndex] = useState(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [demoOn, setDemoOn] = useState(false);
  const [hoveredTech, setHoveredTech] = useState(-1);
  const [copied, setCopied] = useState(false);
  const studsRef = useRef<HTMLSpanElement>(null);

  // Roblox leaderstats: poll the scene's running distance a few times per second (no React re-render).
  useEffect(() => {
    const timer = window.setInterval(() => {
      const studs = sceneRef.current?.studsRun ?? 0;
      if (studsRef.current) studsRef.current.textContent = Math.floor(studs).toLocaleString("vi-VN");
    }, 250);
    return () => window.clearInterval(timer);
  }, []);
  // Footstep audio is off by default; turning it on is the user gesture that unlocks Web Audio.
  const [sound, setSound] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  // The roadside screens show the project basics in the current language.
  useEffect(() => {
    if (ready) sceneRef.current?.setProjects(profile.projects);
  }, [ready, profile]);

  // Sussy says a short line at each story beat (after the loader), then the bubble fades away.
  const [beat, setBeat] = useState(0);
  const greeted = useRef(false);
  useEffect(() => {
    if (!ready || webglFailed) return;
    // The first line waits for the loading screen to finish fading out (~0.9 s + fade).
    const delay = greeted.current ? 350 : 1500;
    const show = window.setTimeout(() => {
      greeted.current = true;
      setBubble({ text: chatLines[locale][beat], id: Date.now() });
      // Hello on arrival, goodbye once seated at the sunset.
      if (beat === 0 || beat === CHAPTERS.length - 1) sceneRef.current?.wave();
    }, delay);
    const hide = window.setTimeout(() => setBubble(null), delay + 4250);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [beat, ready, webglFailed, locale]);

  const toggleLocale = () => {
    try { window.localStorage.setItem(LOCALE_KEY, locale === "vi" ? "en" : "vi"); } catch { /* ignore */ }
    window.dispatchEvent(new Event(LOCALE_EVENT));
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    sceneRef.current?.setSound(next);
  };

  useEffect(() => {
    reducedRef.current = reducedMotion;
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const toggleMotion = () => {
    try { window.localStorage.setItem(MOTION_KEY, reducedMotion ? "0" : "1"); } catch { /* ignore */ }
    window.dispatchEvent(new Event(MOTION_EVENT));
  };

  const scrollToStory = useCallback((story: number) => {
    const top = scrollTopForStory(story, sectionRefs.current, window.innerHeight, window.scrollY);
    if (top !== null) window.scrollTo({ top, behavior: reducedRef.current ? "instant" : "smooth" });
  }, []);

  const selectTech = useCallback((index: number) => scrollToStory(storyForTech(index, techs.length) + 0.001), [scrollToStory]);

  // Keyboard shortcuts: J / K next / previous chapter, H makes Sussy hop. Ignored while typing or with modifiers.
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
    const key = event.key.toLowerCase();
    if (key === "j" && chapter < CHAPTERS.length - 1) scrollToStory(chapterTarget(chapter + 1));
    else if (key === "k" && chapter > 0) scrollToStory(chapterTarget(chapter - 1));
    else if (key === "h") sceneRef.current?.hop();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const selectSceneTech = useEffectEvent(selectTech);
  // Line the roadside screens up with the demo's stop markers: screen i is beside Sussy while marker i is
  // mid-viewport (the story value is read at the viewport's centre line, so a marker's centre is its story value).
  useEffect(() => {
    const list = stopsRef.current;
    const section = sectionRefs.current[2];
    if (!list || !section) return;
    const measure = () => {
      const cards = list.children;
      if (!cards.length) return;
      // Stops measured from the page, so the side panel switches exactly as Sussy reaches the next screen.
      const box = section.getBoundingClientRect();
      const storyAt = (card: Element) => {
        const rect = card.getBoundingClientRect();
        return 2 + (rect.top + rect.height / 2 - box.top) / Math.max(box.height, 1);
      };
      setDemo(storyAt(cards[0]), storyAt(cards[cards.length - 1]));
      sceneRef.current?.refresh();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Scroll → story value → scene + overlay state.
  useEffect(() => {
    let frame = 0;
    let lastY = window.scrollY;
    const update = () => {
      frame = 0;
      // Scroll distance drives Sussy's pace (walk on a gentle scroll, run on a fast one); instant jumps
      // (chapter links, restored position) are not scrolling.
      const delta = window.scrollY - lastY;
      if (Math.abs(delta) < window.innerHeight * 1.5) sceneRef.current?.addScroll(delta);
      lastY = window.scrollY;
      const story = storyFromSections(sectionRefs.current, window.innerHeight);
      sceneRef.current?.setStory(story);
      setChapter(chapterIndex(story));
      setBeat(speechBeat(story));
      setTechIndex(Math.round(techPosition(story, techs.length)));
      setProjectIndex(demoIndex(story, portfolio.profile.projects.length));
      setDemoOn(demoActive(story));
      if (readoutRef.current) readoutRef.current.textContent = `${String(Math.round((story / CHAPTERS.length) * 100)).padStart(3, "0")}%`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Mount the WebGL scene (code-split so text renders first).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let scene: StoryScene | null = null;
    let readyTimer: number | undefined;
    let lostTimer: number | undefined;
    const start = performance.now();
    // On a slow network the copy should not wait behind the loader forever: lift it anyway (the scene keeps
    // loading and fades in on its own).
    const maxTimer = window.setTimeout(() => !disposed && setReady(true), LOADER_MAX_MS);
    import("./scene/story-scene")
      .then(async ({ StoryScene }) => {
        if (disposed) return;
        scene = new StoryScene({
          canvas,
          techs,
          reducedMotion: reducedRef.current,
          onProgress: (value) => !disposed && setProgress(value),
          onTechHover: (index) => !disposed && setHoveredTech(index),
          onTechSelect: (index) => selectSceneTech(index),
          onContextLost: () => {
            window.clearTimeout(lostTimer);
            lostTimer = window.setTimeout(() => {
              if (disposed) return;
              setWebglFailed(true);
              setReady(true);
            }, CONTEXT_RESTORE_MS);
          },
          onContextRestored: () => {
            window.clearTimeout(lostTimer);
            if (!disposed) setWebglFailed(false);
          },
        });
        sceneRef.current = scene;
        if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("debug")) {
          const debug = window as unknown as { __sussyScene?: StoryScene; __go?: (story: number, seconds?: number) => number };
          debug.__sussyScene = scene;
          // __go(3.9): scroll the copy to a story value and settle the scene there (for screenshots).
          debug.__go = (story, seconds) => {
            const top = scrollTopForStory(story, sectionRefs.current, window.innerHeight, window.scrollY);
            if (top !== null) window.scrollTo({ top, behavior: "instant" });
            scene?.seek(story, seconds);
            return story;
          };
        }
        scene.setStory(storyFromSections(sectionRefs.current, window.innerHeight));
        await scene.load();
        if (disposed) return;
        // The loader's roll takes at least LOADER_MIN_MS (less when motion is reduced).
        const wait = Math.max(0, (reducedRef.current ? 400 : LOADER_MIN_MS) - (performance.now() - start));
        readyTimer = window.setTimeout(() => !disposed && setReady(true), wait);
      })
      .catch(() => {
        if (disposed) return;
        scene?.dispose();
        sceneRef.current = null;
        setWebglFailed(true);
        setReady(true);
      });
    return () => {
      disposed = true;
      window.clearTimeout(readyTimer);
      window.clearTimeout(lostTimer);
      window.clearTimeout(maxTimer);
      scene?.dispose();
      sceneRef.current = null;
      const debug = window as unknown as { __sussyScene?: StoryScene };
      if (debug.__sussyScene === scene) delete debug.__sussyScene;
    };
  }, []);

  async function copyEmail(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${value}`;
    }
  }

  const focusIndex = Math.min(Math.max(hoveredTech >= 0 ? hoveredTech : techIndex, 0), profile.techStack.length - 1);
  const focusTech = profile.techStack[focusIndex];
  const currentProject = profile.projects[projectIndex] ?? profile.projects[0];

  // Keep the active chip centred when the chip row scrolls horizontally (mobile).
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelectorAll("button")[focusIndex];
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    // Measured against the row itself: the chips sit inside their group, so offsetLeft is no longer row-relative.
    const left = row.scrollLeft + chip.getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollTo({ left: left - row.clientWidth / 2 + chip.offsetWidth / 2, behavior: reducedRef.current ? "auto" : "smooth" });
  }, [focusIndex]);
  const gmail = portfolio.contacts.find((c) => c.kind === "gmail")?.value ?? "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const atEnd = chapter === CHAPTERS.length - 1;

  return (
    <div className="site" data-reduced-motion={reducedMotion}>
      <LoadingScreen progress={progress} done={ready} reducedMotion={reducedMotion} label={profile.loadingLabel} />
      <a className="skip-link" href="#main">{t.skip}</a>

      <div className={`stage${webglFailed ? " is-fallback" : ""}`} aria-hidden="true">
        <canvas ref={canvasRef} />
        {webglFailed && <Image className="stage-poster" src="/brand/sussy-poster.webp" alt="" width={720} height={960} unoptimized />}
      </div>

      {bubble && <ChatBubble text={bubble.text} id={bubble.id} scene={sceneRef} />}

      <header className="hud-header">
        <a className="brand" href="#mo-dau" aria-label={`${portfolio.character} — ${t.toTop}`}>
          <span className="brand-mark" aria-hidden="true" />
          <strong>{portfolio.character.toUpperCase()} / {profile.code}</strong>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-sub">{profile.brandSub}</span>
        </a>
        <div className="hud-actions">
          <button type="button" className="lang-toggle" onClick={toggleLocale} aria-label={`${t.language}: ${locale === "vi" ? "English" : "Tiếng Việt"}`}>
            <span aria-hidden="true" data-active={locale === "vi"}>VI</span>
            <span aria-hidden="true" data-active={locale === "en"}>EN</span>
          </button>
          <button type="button" className="motion-toggle" aria-pressed={sound} onClick={toggleSound} title={t.soundTitle}>
            {sound ? <Volume2 aria-hidden="true" size={15} /> : <VolumeX aria-hidden="true" size={15} />}
            <span>{sound ? t.soundOff : t.soundOn}</span>
          </button>
          <button type="button" className="motion-toggle" aria-pressed={reducedMotion} onClick={toggleMotion}>
            {reducedMotion ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
            <span>{reducedMotion ? t.motionOn : t.motionOff}</span>
          </button>
          <a className="outline-button" href="#lien-he" onClick={(event) => { event.preventDefault(); scrollToStory(chapterTarget(CHAPTERS.length - 1)); }}>{t.contact} <ArrowUpRight aria-hidden="true" size={16} /></a>
        </div>
      </header>

      <aside className="leaderstats" aria-label="Leaderstats">
        <div className="ls-row ls-head"><span>{t.player}</span><span>Stage</span><span>Studs</span></div>
        <div className="ls-row"><span>{portfolio.character}</span><span>{chapter + 1}</span><span ref={studsRef}>0</span></div>
      </aside>

      <nav className="chapter-rail" aria-label={t.chapters}>
        <ol>
          {CHAPTERS.map((item, index) => (
            <li key={item.id}>
              <button type="button" aria-current={chapter === index ? "step" : undefined} onClick={() => scrollToStory(chapterTarget(index))}>
                {chapter === index && <span className="rail-label">{t.chapterLabels[index]}</span>}
                <span className="rail-index">{pad(index + 1)}</span>
                <span className="rail-line" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <main id="main" className="story">
        <section id="mo-dau" ref={(el) => { sectionRefs.current[0] = el; }} className="chapter chapter-intro" aria-labelledby="intro-title">
          <div className="chapter-sticky">
            <div className="chapter-copy">
              <p className="eyebrow">01 / 04 <span className="eyebrow-line" aria-hidden="true" /> {portfolio.character.toUpperCase()}</p>
              <h1 id="intro-title">{profile.headline[0]}<br />{profile.headline[1]}</h1>
              <p className="lede">{profile.intro}</p>
              <p className="meta">{profile.role} · {t.location}</p>
              <p className="meta hint">{t.hint(portfolio.character)}</p>
            </div>
          </div>
        </section>

        <section id="tech-stack" ref={(el) => { sectionRefs.current[1] = el; }} className="chapter chapter-tech" style={{ "--tech-count": techs.length } as React.CSSProperties} aria-labelledby="tech-title">
          <div className="chapter-sticky">
            <div className="chapter-copy chapter-copy-top">
              <p className="eyebrow">02 / 04 <span className="eyebrow-line" aria-hidden="true" /> TECH STACK</p>
              <h2 id="tech-title">{profile.techTitle[0]}<br />{profile.techTitle[1]}</h2>
              <fieldset className="tech-chips" ref={chipsRef}>
                <legend className="sr-only">{t.chooseTech}</legend>
                {TECH_GROUPS.map((group) => (
                  <fieldset key={group} className="tech-group" data-group={group}>
                    <legend className="tech-group-label">{t.techGroups[group]}</legend>
                    <div className="tech-group-chips">
                      {techs.map((tech, index) => tech.group !== group ? null : (
                        <button
                          key={tech.name}
                          type="button"
                          aria-pressed={focusIndex === index}
                          onClick={() => selectTech(index)}
                          onKeyDown={(event) => {
                            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                            event.preventDefault();
                            const next = (index + (event.key === "ArrowRight" ? 1 : -1) + techs.length) % techs.length;
                            chipsRef.current?.querySelectorAll("button")[next]?.focus();
                            selectTech(next);
                          }}
                        >
                          {tech.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </fieldset>
              <div className="tech-caption" aria-live="polite">
                <p className="eyebrow">{pad(focusIndex + 1)} / {pad(techs.length)} <span className="eyebrow-line" aria-hidden="true" /> <span className="tech-kind" data-group={focusTech.group}>{t.techGroups[focusTech.group]}</span> · {focusTech.category.toUpperCase()}</p>
                <p className="tech-name" style={{ "--tech-color": focusTech.color } as React.CSSProperties}>{focusTech.name}</p>
                <p className="tech-blurb">{focusTech.blurb}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="du-an" ref={(el) => { sectionRefs.current[2] = el; }} className="chapter chapter-work" aria-labelledby="work-title">
          <div className="work-inner">
            <p className="eyebrow">03 / 04 <span className="eyebrow-line" aria-hidden="true" /> {t.workEyebrow}</p>
            <h2 id="work-title">{profile.workTitle[0]}<br />{profile.workTitle[1]}</h2>
            <div className="glass-card about-card">
              <h3 className="card-title">{t.about}</h3>
              {profile.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <div className="glass-card experience-card">
              <h3 className="card-title">{t.experience}</h3>
              <ol>
                {profile.experience.map((item) => (
                  <li key={`${item.period}-${item.company}`}>
                    <span className="exp-period">{item.period}</span>
                    <div><strong>{item.role}</strong> · {item.company}<p>{item.description}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="demo">
              {/* Slides in from the left while Sussy is on the demo stretch, and out again after the last screen. */}
              <div className={`demo-dock${demoOn ? " is-active" : ""}`} aria-hidden={!demoOn} inert={!demoOn}>
                <aside className="demo-panel" aria-labelledby="demo-title">
                  <p className="eyebrow">{t.project} {pad(projectIndex + 1)} / {pad(profile.projects.length)} <span className="eyebrow-line" aria-hidden="true" /></p>
                  <div className="demo-body" key={projectIndex} aria-live="polite">
                    <p className="card-meta"><span>{currentProject.year}</span><span>{currentProject.category}</span></p>
                    <h3 id="demo-title">{currentProject.title}</h3>
                    {currentProject.summary && <p className="demo-summary">{currentProject.summary}</p>}
                    {caseStudies[currentProject.slug] ? (
                      <p className="card-foot"><Link prefetch={false} href={`/du-an/${currentProject.slug}`}>{t.readCase}</Link></p>
                    ) : (
                      currentProject.impact && <p className="card-foot">{currentProject.impact}</p>
                    )}
                  </div>
                  <nav className="demo-dots" aria-label={t.projectsNav}>
                    {profile.projects.map((project, index) => (
                      <button
                        key={project.slug}
                        type="button"
                        aria-label={`${pad(index + 1)} · ${project.title}`}
                        aria-current={index === projectIndex ? "true" : undefined}
                        onClick={() => scrollToStory(stopStory(index, profile.projects.length) + 0.0005)}
                      />
                    ))}
                  </nav>
                </aside>
              </div>
              {/* One marker per roadside screen: their positions set where Sussy stops (see setDemo). */}
              <ol className="demo-stops" ref={stopsRef} aria-hidden="true">
                {profile.projects.map((project) => <li key={project.slug} />)}
              </ol>
            </div>
          </div>
        </section>

        <section id="lien-he" ref={(el) => { sectionRefs.current[3] = el; }} className="chapter chapter-contact" aria-labelledby="contact-title">
          <div className="chapter-sticky">
            <div className="contact-panel">
              <p className="eyebrow">04 / 04 <span className="eyebrow-line" aria-hidden="true" /> {t.sunsetEyebrow}</p>
              <h2 id="contact-title">{t.contactTitle[0]}<br />{t.contactTitle[1]}</h2>
              <p className="lede">{t.contactLede(t.availability)}</p>
              <ul className="contact-list">
                {portfolio.contacts.map((contact) => {
                  const href = contactHref(contact);
                  const external = href?.startsWith("http");
                  return (
                    <li key={contact.kind}>
                      {href ? (
                        <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
                          <BrandIcon kind={contact.kind} />
                          <span className="contact-label">{contactLabel(contact, locale)}</span>
                          <span className="contact-value">{contactText(contact)}</span>
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </a>
                      ) : (
                        <span className="contact-pending" aria-disabled="true">
                          <BrandIcon kind={contact.kind} />
                          <span className="contact-label">{contactLabel(contact, locale)}</span>
                          <span className="contact-value">{t.pending}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {gmail && (
                <button type="button" className="copy-button" onClick={() => copyEmail(gmail)}>
                  {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                  {copied ? t.copiedEmail : t.copyEmail}
                </button>
              )}
              <span className="sr-only" aria-live="polite">{copied ? t.copiedAnnounce : ""}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="hud-footer">
        <div className="hud-meta">
          <strong>{profile.footerMeta}</strong>
          <span>R6 · {portfolio.character} · <Link prefetch={false} href="/nhat-ky">v{currentVersion} · {t.changelog}</Link> · <Link prefetch={false} href="/cv">CV</Link></span>
        </div>
        <button type="button" className="hud-next" onClick={() => (atEnd ? window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }) : scrollToStory(chapterTarget(chapter + 1)))}>
          {atEnd ? <>{t.restart} <ArrowUp aria-hidden="true" size={16} /></> : <>{t.scrollWith(portfolio.character)} <ArrowDown aria-hidden="true" size={16} /></>}
        </button>
        <p className="hud-readout"><span>STORY</span><span ref={readoutRef}>000%</span></p>
        <p className="sr-only">© {new Date().getFullYear()} {portfolio.name}. {t.footnote(portfolio.character)}</p>
      </footer>
    </div>
  );
}
