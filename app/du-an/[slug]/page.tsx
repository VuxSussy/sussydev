import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { caseStudies } from "@/data/case-studies";
import { portfolio, type Mode } from "@/data/portfolio";

type Params = { params: Promise<{ slug: string }> };

const MODES: Mode[] = ["dev", "roblox"];
const entries = MODES.flatMap((mode) => portfolio.profiles[mode].projects.map((project) => ({ mode, project })));
const find = (slug: string) => entries.find((entry) => entry.project.slug === slug);

export function generateStaticParams() {
  return entries.map(({ project }) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = find((await params).slug);
  if (!entry) return {};
  return { title: `${entry.project.title} — Case study · Sussy`, description: entry.project.summary };
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const entry = find(slug);
  if (!entry) notFound();
  const { mode, project } = entry;
  const study = caseStudies[slug];
  const back = mode === "dev" ? "/#du-an" : "/roblox#du-an";
  const others = entries.filter((other) => other.project.slug !== slug && caseStudies[other.project.slug]);

  return (
    <div className="site case-page" data-mode={mode}>
      <header className="changelog-header">
        <Link prefetch={false} className="brand" href={mode === "dev" ? "/" : "/roblox"}>
          <span className="brand-mark" aria-hidden="true" />
          <strong>{portfolio.character.toUpperCase()} / CASE</strong>
        </Link>
        <Link prefetch={false} className="outline-button" href={back}><ArrowLeft aria-hidden="true" size={16} /> Về dự án</Link>
      </header>
      <main className="changelog-main case-main">
        <p className="eyebrow">{project.year} <span className="eyebrow-line" aria-hidden="true" /> {project.category.toUpperCase()}</p>
        <h1>{project.title}</h1>
        <p className="lede">{study?.intro ?? project.summary}</p>
        {study ? (
          <>
            <ul className="case-stack" aria-label="Công nghệ">{study.stack.map((item) => <li key={item}>{item}</li>)}</ul>
            <dl className="case-facts">
              {study.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
            </dl>
            {study.sections.map((section, index) => (
              <section className="case-section" key={section.title} aria-labelledby={`case-${index}`}>
                <h2 id={`case-${index}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
                <div>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              </section>
            ))}
          </>
        ) : (
          <p className="case-pending">Case study cho dự án này đang được viết. Quay lại sau nhé — mọi cập nhật sẽ có trong <Link prefetch={false} href="/nhat-ky">Nhật ký</Link>.</p>
        )}
        {others.length > 0 && (
          <nav className="case-others" aria-label="Case study khác">
            <p className="eyebrow">ĐỌC TIẾP</p>
            <ul>
              {others.map(({ project: other }) => (
                <li key={other.slug}><Link prefetch={false} href={`/du-an/${other.slug}`}><span>{other.title}</span><span>{other.category}</span><ArrowUpRight aria-hidden="true" size={16} /></Link></li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </div>
  );
}
