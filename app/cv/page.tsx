import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/story/print-button";
import { portfolio, TECH_GROUPS } from "@/data/portfolio";
import { ui } from "@/data/i18n";

export const metadata: Metadata = {
  title: "CV — Sussy",
  description: "CV một trang lấy từ nội dung portfolio. In hoặc lưu PDF ngay trên trình duyệt.",
};

const { profile } = portfolio;
const SKILL_GROUPS = ui.vi.techGroups;
const contacts = portfolio.contacts.filter((contact) => contact.value);

export default function CvPage() {
  return (
    <div className="site cv-page">
      <header className="changelog-header cv-toolbar">
        <a className="outline-button" href="/"><ArrowLeft aria-hidden="true" size={16} /> Về portfolio</a>
        <PrintButton label="In / Lưu PDF" />
      </header>
      <main className="cv-sheet">
        <header className="cv-head">
          <div>
            <h1>{portfolio.name}</h1>
            <p className="cv-role">{profile.role}</p>
            <p className="cv-meta">{portfolio.location} · {portfolio.availability}</p>
          </div>
          <ul className="cv-contacts" aria-label="Liên hệ">
            {contacts.map((contact) => (
              <li key={contact.kind}><span>{contact.label}</span> {contact.value.replace(/^https?:\/\/(www\.)?/, "")}</li>
            ))}
            {contacts.length < portfolio.contacts.length && <li className="cv-pending">Các kênh khác đang cập nhật</li>}
          </ul>
        </header>

        <section className="cv-section" aria-labelledby="cv-about">
          <h2 id="cv-about">Giới thiệu</h2>
          <div>{profile.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </section>

        <section className="cv-section" aria-labelledby="cv-experience">
          <h2 id="cv-experience">Kinh nghiệm</h2>
          <ol className="cv-list">
            {profile.experience.map((item) => (
              <li key={`${item.period}-${item.company}`}>
                <p className="cv-when">{item.period}</p>
                <div><h3>{item.role} · {item.company}</h3><p>{item.description}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cv-section" aria-labelledby="cv-projects">
          <h2 id="cv-projects">Dự án</h2>
          <ol className="cv-list">
            {profile.projects.map((project) => (
              <li key={project.slug}>
                <p className="cv-when">{project.year}</p>
                <div><h3>{project.title} <span>· {project.category}</span></h3><p>{project.summary}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cv-section" aria-labelledby="cv-skills">
          <h2 id="cv-skills">Kỹ năng</h2>
          <dl className="cv-skill-groups">
            {TECH_GROUPS.map((group) => (
              <div key={group}>
                <dt>{SKILL_GROUPS[group]}</dt>
                <dd><ul className="cv-skills">{profile.techStack.filter((tech) => tech.group === group).map((tech) => <li key={tech.name}>{tech.name}</li>)}</ul></dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
