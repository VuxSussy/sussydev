"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Copy, Pause, Play } from "lucide-react";
import { portfolio, type ContactLink } from "@/data/portfolio";
import { CHAPTERS, chapterIndex, storyForTech, storyFromSections, techPosition } from "@/lib/story";
import type { StoryScene } from "./scene/story-scene";
import { BrandIcon } from "./brand-icon";
import { LoadingScreen } from "./loading-screen";

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
const techs = portfolio.techStack;

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

export function PortfolioStory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const sceneRef = useRef<StoryScene | null>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const chipsRef = useRef<HTMLFieldSetElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  const reducedRef = useRef(reducedMotion);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [techIndex, setTechIndex] = useState(0);
  const [hoveredTech, setHoveredTech] = useState(-1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    reducedRef.current = reducedMotion;
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const toggleMotion = () => {
    try { window.localStorage.setItem(MOTION_KEY, reducedMotion ? "0" : "1"); } catch { /* ignore */ }
    window.dispatchEvent(new Event(MOTION_EVENT));
  };

  const scrollToStory = useCallback((story: number) => {
    const index = Math.min(CHAPTERS.length - 1, Math.floor(story));
    const section = sectionRefs.current[index];
    if (!section) return;
    const local = story - index;
    const top = window.scrollY + section.getBoundingClientRect().top + local * section.offsetHeight - window.innerHeight * 0.5;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedRef.current ? "auto" : "smooth" });
  }, []);

  const selectTech = useCallback((index: number) => scrollToStory(storyForTech(index, techs.length) + 0.001), [scrollToStory]);

  // Scroll → story value → scene + overlay state.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const story = storyFromSections(sectionRefs.current, window.innerHeight);
      sceneRef.current?.setStory(story);
      setChapter(chapterIndex(story));
      setTechIndex(Math.round(techPosition(story, techs.length)));
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
    const start = performance.now();
    import("./scene/story-scene")
      .then(async ({ StoryScene }) => {
        if (disposed) return;
        scene = new StoryScene({
          canvas,
          techs,
          reducedMotion: reducedRef.current,
          onProgress: (value) => !disposed && setProgress(value),
          onTechHover: (index) => !disposed && setHoveredTech(index),
          onTechSelect: (index) => selectTech(index),
        });
        sceneRef.current = scene;
        if (process.env.NODE_ENV !== "production") (window as unknown as { __sussyScene?: StoryScene }).__sussyScene = scene;
        scene.setStory(storyFromSections(sectionRefs.current, window.innerHeight));
        await scene.load();
        const wait = Math.max(0, 700 - (performance.now() - start));
        window.setTimeout(() => !disposed && setReady(true), wait);
      })
      .catch(() => {
        if (disposed) return;
        setWebglFailed(true);
        setReady(true);
      });
    return () => {
      disposed = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [selectTech]);

  async function copyEmail(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${value}`;
    }
  }

  const focusIndex = hoveredTech >= 0 ? hoveredTech : techIndex;
  const focusTech = techs[focusIndex];

  // Keep the active chip centred when the chip row scrolls horizontally (mobile).
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelectorAll("button")[focusIndex];
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2, behavior: reducedRef.current ? "auto" : "smooth" });
  }, [focusIndex]);
  const gmail = portfolio.contacts.find((c) => c.kind === "gmail")?.value ?? "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const atEnd = chapter === CHAPTERS.length - 1;

  return (
    <>
      <LoadingScreen progress={progress} done={ready} reducedMotion={reducedMotion} />
      <a className="skip-link" href="#main">Chuyển đến nội dung chính</a>

      <div className={`stage${webglFailed ? " is-fallback" : ""}`} aria-hidden="true">
        <canvas ref={canvasRef} />
        {webglFailed && <Image className="stage-poster" src="/brand/sussy-poster.png" alt="" width={720} height={960} unoptimized />}
      </div>

      <header className="hud-header">
        <a className="brand" href="#mo-dau" aria-label={`${portfolio.character} — về đầu trang`}>
          <span className="brand-mark" aria-hidden="true" />
          <strong>{portfolio.character.toUpperCase()} / 001</strong>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-sub">A PORTFOLIO RUN</span>
        </a>
        <div className="hud-actions">
          <button type="button" className="motion-toggle" aria-pressed={reducedMotion} onClick={toggleMotion}>
            {reducedMotion ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
            <span>{reducedMotion ? "Bật chuyển động" : "Giảm chuyển động"}</span>
          </button>
          <a className="outline-button" href="#lien-he">Liên hệ <ArrowUpRight aria-hidden="true" size={16} /></a>
        </div>
      </header>

      <nav className="chapter-rail" aria-label="Các chương">
        <ol>
          {CHAPTERS.map((item, index) => (
            <li key={item.id}>
              <button type="button" aria-current={chapter === index ? "step" : undefined} onClick={() => scrollToStory(index + (index === 0 ? 0 : 0.18))}>
                {chapter === index && <span className="rail-label">{item.label}</span>}
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
              <h1 id="intro-title">Code gọn.<br />Chạy không ngừng.</h1>
              <p className="lede">{portfolio.shortIntro}</p>
              <p className="meta">{portfolio.role} · {portfolio.location}</p>
            </div>
          </div>
        </section>

        <section id="tech-stack" ref={(el) => { sectionRefs.current[1] = el; }} className="chapter chapter-tech" style={{ "--tech-count": techs.length } as React.CSSProperties} aria-labelledby="tech-title">
          <div className="chapter-sticky">
            <div className="chapter-copy chapter-copy-top">
              <p className="eyebrow">02 / 04 <span className="eyebrow-line" aria-hidden="true" /> TECH STACK</p>
              <h2 id="tech-title">Những công cụ<br />tôi chạy cùng.</h2>
              <fieldset className="tech-chips" ref={chipsRef}>
                <legend className="sr-only">Chọn tech stack</legend>
                {techs.map((tech, index) => (
                  <button
                    key={tech.name}
                    type="button"
                    aria-pressed={focusIndex === index}
                    onClick={() => selectTech(index)}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                      event.preventDefault();
                      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + techs.length) % techs.length;
                      event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
                      selectTech(next);
                    }}
                  >
                    {tech.name}
                  </button>
                ))}
              </fieldset>
              <div className="tech-caption" aria-live="polite">
                <p className="eyebrow">{pad(focusIndex + 1)} / {pad(techs.length)} <span className="eyebrow-line" aria-hidden="true" /> {focusTech.category.toUpperCase()}</p>
                <p className="tech-name" style={{ "--tech-color": focusTech.color } as React.CSSProperties}>{focusTech.name}</p>
                <p className="tech-blurb">{focusTech.blurb}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="du-an" ref={(el) => { sectionRefs.current[2] = el; }} className="chapter chapter-work" aria-labelledby="work-title">
          <div className="work-inner">
            <p className="eyebrow">03 / 04 <span className="eyebrow-line" aria-hidden="true" /> DỰ ÁN & KINH NGHIỆM</p>
            <h2 id="work-title">Những quãng đường<br />đã chạy qua.</h2>
            <div className="work-list">
              {portfolio.projects.map((project, index) => (
                <article className="glass-card project-card" key={project.title}>
                  <p className="card-meta"><span>{pad(index + 1)}</span><span>{project.year} · {project.category}</span></p>
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  {project.impact && <p className="card-foot">{project.impact}</p>}
                </article>
              ))}
            </div>
            <div className="glass-card experience-card">
              <h3 className="card-title">Kinh nghiệm</h3>
              <ol>
                {portfolio.experience.map((item) => (
                  <li key={`${item.period}-${item.company}`}>
                    <span className="exp-period">{item.period}</span>
                    <div><strong>{item.role}</strong> · {item.company}<p>{item.description}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="glass-card about-card">
              <h3 className="card-title">Về tôi</h3>
              {portfolio.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </section>

        <section id="lien-he" ref={(el) => { sectionRefs.current[3] = el; }} className="chapter chapter-contact" aria-labelledby="contact-title">
          <div className="chapter-sticky">
            <div className="contact-panel">
              <p className="eyebrow">04 / 04 <span className="eyebrow-line" aria-hidden="true" /> HOÀNG HÔN</p>
              <h2 id="contact-title">Hết đường chạy rồi.<br />Ngồi lại nói chuyện nhé.</h2>
              <p className="lede">{portfolio.availability}. Nhắn cho tôi qua bất kỳ kênh nào bên dưới.</p>
              <ul className="contact-list">
                {portfolio.contacts.map((contact) => {
                  const href = contactHref(contact);
                  const external = href?.startsWith("http");
                  return (
                    <li key={contact.kind}>
                      {href ? (
                        <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
                          <BrandIcon kind={contact.kind} />
                          <span className="contact-label">{contact.label}</span>
                          <span className="contact-value">{contactText(contact)}</span>
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </a>
                      ) : (
                        <span className="contact-pending" aria-disabled="true">
                          <BrandIcon kind={contact.kind} />
                          <span className="contact-label">{contact.label}</span>
                          <span className="contact-value">Đang cập nhật</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {gmail && (
                <button type="button" className="copy-button" onClick={() => copyEmail(gmail)}>
                  {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                  {copied ? "Đã sao chép email" : "Sao chép email"}
                </button>
              )}
              <span className="sr-only" aria-live="polite">{copied ? "Đã sao chép địa chỉ email" : ""}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="hud-footer">
        <div className="hud-meta">
          <strong>CODE / ROBLOX / MOTION</strong>
          <span>R6 · {portfolio.character} · run v4</span>
        </div>
        <button type="button" className="hud-next" onClick={() => (atEnd ? window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }) : scrollToStory(chapter + 1.18))}>
          {atEnd ? <>Chạy lại từ đầu <ArrowUp aria-hidden="true" size={16} /></> : <>Cuộn để chạy cùng {portfolio.character} <ArrowDown aria-hidden="true" size={16} /></>}
        </button>
        <p className="hud-readout"><span>STORY</span><span ref={readoutRef}>000%</span></p>
      </footer>
      <p className="sr-only">© {new Date().getFullYear()} {portfolio.name}. Nhân vật Roblox {portfolio.character} chạy qua portfolio theo nhịp cuộn trang.</p>
    </>
  );
}
