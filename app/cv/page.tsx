import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/story/print-button";
import { portfolio } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "CV — Sussy",
  description: "CV một trang, tạo tự động từ nội dung portfolio Dev và Roblox. In hoặc lưu PDF.",
};

const profiles = [portfolio.profiles.dev, portfolio.profiles.roblox];
const skills = [...new Map(profiles.flatMap((p) => p.techStack).map((tech) => [tech.name, tech])).values()];
const experience = profiles.flatMap((p) => p.experience);
const projects = profiles.flatMap((p) => p.projects);
const contacts = portfolio.contacts.filter((contact) => contact.value);

export default function CvPage() {
  return (
    <div className="site cv-page">
      <header className="changelog-header cv-toolbar">
        <Link prefetch={false} className="outline-button" href="/"><ArrowLeft aria-hidden="true" size={16} /> Về portfolio</Link>
        <PrintButton label="In / Lưu PDF" />
      </header>
      <main className="cv-sheet">
        <header className="cv-head">
          <div>
            <h1>{portfolio.name}</h1>
            <p className="cv-role">{profiles.map((p) => p.role).join(" · ")}</p>
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
          <div>{profiles.map((p) => <p key={p.mode}>{p.about[0]}</p>)}</div>
        </section>

        <section className="cv-section" aria-labelledby="cv-experience">
          <h2 id="cv-experience">Kinh nghiệm</h2>
          <ol className="cv-list">
            {experience.map((item) => (
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
            {projects.map((project) => (
              <li key={project.slug}>
                <p className="cv-when">{project.year}</p>
                <div><h3>{project.title} <span>· {project.category}</span></h3><p>{project.summary}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cv-section" aria-labelledby="cv-skills">
          <h2 id="cv-skills">Kỹ năng</h2>
          <ul className="cv-skills">{skills.map((tech) => <li key={tech.name}>{tech.name}</li>)}</ul>
        </section>
      </main>
    </div>
  );
}
