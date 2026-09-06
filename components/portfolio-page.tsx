"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Copy, Menu, X } from "lucide-react";
import { portfolio } from "@/data/portfolio";

const navigation = [
  { label: "Giới thiệu", href: "#gioi-thieu" }, { label: "Dự án", href: "#du-an" },
  { label: "Kinh nghiệm", href: "#kinh-nghiem" }, { label: "Liên hệ", href: "#lien-he" },
];

export function PortfolioPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const sections = ["gioi-thieu", "du-an", "kinh-nghiem", "lien-he"]
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActiveSection(entry.target.id)),
      { rootMargin: "-35% 0px -55%" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); }
      if (event.key === "Tab") {
        const focusable = menuRef.current?.querySelectorAll<HTMLElement>("a, button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [menuOpen]);

  async function copyEmail() {
    try { await navigator.clipboard.writeText(portfolio.email); setCopied(true); window.setTimeout(() => setCopied(false), 2400); }
    catch { window.location.href = `mailto:${portfolio.email}`; }
  }
  function closeMenu() { setMenuOpen(false); menuButtonRef.current?.focus(); }

  return <>
    <a className="skip-link" href="#main">Chuyển đến nội dung chính</a>
    <header className="site-header"><div className="container header-inner">
      <a className="wordmark" href="#top" aria-label={`${portfolio.name}, về đầu trang`}>{portfolio.initials}<span aria-hidden="true">/</span></a>
      <nav className="desktop-nav" aria-label="Điều hướng chính">{navigation.map((item) => <a className={activeSection === item.href.slice(1) ? "active" : ""} aria-current={activeSection === item.href.slice(1) ? "location" : undefined} key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <a className="small-cta" href={`mailto:${portfolio.email}`}>Hãy trò chuyện</a>
      <button ref={menuButtonRef} className="menu-button" type="button" aria-label="Mở menu" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" size={21} /></button>
    </div></header>

    {menuOpen && <dialog ref={menuRef} className="mobile-menu" id="mobile-menu" open aria-modal="true" aria-label="Menu điều hướng">
      <div className="mobile-menu-top"><span className="wordmark">{portfolio.initials}<span aria-hidden="true">/</span></span><button ref={closeButtonRef} type="button" aria-label="Đóng menu" onClick={closeMenu}><X aria-hidden="true" size={24} /></button></div>
      <nav aria-label="Điều hướng mobile">{navigation.map((item, index) => <a key={item.href} href={item.href} onClick={closeMenu}><span>0{index + 1}</span>{item.label}</a>)}</nav>
      <p>{portfolio.availability}</p>
    </dialog>}

    <main id="main">
      <section className="hero container" id="top" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">{portfolio.role} · {portfolio.location}</p><h1 id="hero-title">Thiết kế rõ ràng.<br />Xây dựng có chủ đích.</h1><p className="hero-intro">{portfolio.shortIntro}</p>
          <div className="hero-actions"><a className="button button-dark" href="#du-an">Xem dự án <ArrowDown aria-hidden="true" size={17} /></a><a className="button button-light" href={`mailto:${portfolio.email}`}>Liên hệ với tôi</a></div>
        </div>
        <div className="hero-mark" aria-hidden="true"><span>01</span><strong>{portfolio.initials}</strong><p>Clarity<br />over noise</p></div>
        <div className="hero-footer"><span>{portfolio.availability}</span><span>Cuộn để khám phá</span></div>
      </section>

      <section className="section container" id="du-an" aria-labelledby="work-title"><div className="section-heading"><p className="eyebrow">02 — Dự án tiêu biểu</p><h2 id="work-title">Một vài công việc<br />được chọn lọc.</h2></div>
        <div className="project-list">{portfolio.projects.map((project, index) => <article className="project" key={project.title}>
          <div className={`project-visual visual-${index + 1}`} aria-hidden="true"><span>0{index + 1}</span><strong>{project.title.split(" ")[0]}</strong></div>
          <div className="project-content"><div className="project-meta"><span>0{index + 1}</span><span>{project.year} · {project.category}</span></div><h3>{project.title}</h3><p>{project.summary}</p><div className="project-status">{project.impact}<span>Case study sắp ra mắt</span></div></div>
        </article>)}</div>
      </section>

      <section className="section about-section" id="gioi-thieu" aria-labelledby="about-title"><div className="container about-grid">
        <div><p className="eyebrow inverse-muted">03 — Giới thiệu</p><h2 id="about-title">Làm đúng việc,<br />theo cách rõ ràng.</h2></div>
        <div className="about-copy">{portfolio.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{portfolio.resumeUrl && <a href={portfolio.resumeUrl}>Xem CV <ArrowUpRight aria-hidden="true" size={17} /></a>}</div>
        <div className="skills-grid">{portfolio.skillGroups.map((group) => <div key={group.title}><h3>{group.title}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div>
      </div></section>

      <section className="section container" id="kinh-nghiem" aria-labelledby="experience-title"><div className="section-heading section-heading-split"><p className="eyebrow">04 — Kinh nghiệm</p><h2 id="experience-title">Từ ý tưởng<br />đến sản phẩm.</h2></div>
        <div className="experience-list">{portfolio.experience.map((item) => <article key={`${item.period}-${item.company}`}><p>{item.period}</p><h3>{item.company}</h3><div><strong>{item.role}</strong><p>{item.description}</p></div></article>)}</div>
      </section>

      <section className="section principles container" aria-labelledby="principles-title"><div className="section-heading section-heading-split"><p className="eyebrow">05 — Cách tôi làm việc</p><h2 id="principles-title">Ba điều tôi<br />luôn giữ vững.</h2></div>
        <ol><li><span>01</span><div><h3>Rõ ràng trước hào nhoáng</h3><p>Mỗi lựa chọn thiết kế phải giúp người dùng hiểu hoặc hành động tốt hơn.</p></div></li><li><span>02</span><div><h3>Đẹp phải đi cùng hiệu quả</h3><p>Thẩm mỹ, tốc độ và khả năng sử dụng được giải quyết cùng nhau.</p></div></li><li><span>03</span><div><h3>Làm việc minh bạch</h3><p>Giao tiếp sớm, đưa lý do rõ ràng và cải tiến dựa trên phản hồi.</p></div></li></ol>
      </section>

      <section className="contact" id="lien-he" aria-labelledby="contact-title"><div className="container"><p className="eyebrow inverse-muted">06 — Liên hệ</p><h2 id="contact-title">Bạn có một dự án<br />đáng để cùng làm?</h2>
        <div className="contact-row"><a href={`mailto:${portfolio.email}`}>{portfolio.email}</a><div className="contact-actions"><button type="button" onClick={copyEmail}>{copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}{copied ? "Đã sao chép" : "Sao chép email"}</button><a className="button button-inverse" href={`mailto:${portfolio.email}`}>Gửi email <ArrowUpRight aria-hidden="true" size={17} /></a></div><span className="sr-only" aria-live="polite">{copied ? "Đã sao chép địa chỉ email" : ""}</span></div>
        <div className="socials">{Object.entries(portfolio.socials).filter(([, url]) => url).map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{name}<ArrowUpRight aria-hidden="true" size={14} /></a>)}</div>
      </div></section>
    </main>
    <footer><div className="container footer-inner"><p>© {new Date().getFullYear()} {portfolio.name}. Làm kỹ, nói thật.</p><a href="#top">Về đầu trang <span aria-hidden="true">↑</span></a></div></footer>
  </>;
}
