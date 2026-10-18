import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { changelog } from "@/data/changelog";
import { portfolio } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Nhật ký phát triển — Sussy",
  description: "Những gì đã thay đổi trên portfolio Sussy qua từng phiên bản.",
};

const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function ChangelogPage() {
  return (
    <div className="site changelog-page">
      <header className="changelog-header">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <strong>{portfolio.character.toUpperCase()} / LOG</strong>
        </a>
        <a className="outline-button" href="/"><ArrowLeft aria-hidden="true" size={16} /> Về portfolio</a>
      </header>
      <main className="changelog-main">
        <p className="eyebrow">NHẬT KÝ <span className="eyebrow-line" aria-hidden="true" /> {changelog.length} PHIÊN BẢN</p>
        <h1>Website này<br />không bao giờ xong.</h1>
        <p className="lede">Mỗi lần nâng cấp được ghi lại ở đây, mới nhất ở trên cùng.</p>
        <ol className="release-list">
          {changelog.map((release) => (
            <li key={release.version} className="release">
              <div className="release-meta">
                <span className="release-version">v{release.version}</span>
                <time dateTime={release.date}>{formatDate(release.date)}</time>
              </div>
              <div className="release-body">
                <h2>{release.title}</h2>
                <ul>{release.notes.map((note) => <li key={note}>{note}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
