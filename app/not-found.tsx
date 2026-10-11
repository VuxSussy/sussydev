import Image from "next/image";
import { SUSSY_EGG_SRC } from "@/lib/brand";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="site lost-page">
      <main className="lost-main">
        <div className="loader-stage" aria-hidden="true">
          <Image className="loader-head" src={SUSSY_EGG_SRC} alt="" width={256} height={256} unoptimized />
          <span className="loader-shadow" />
        </div>
        <p className="eyebrow">404 <span className="eyebrow-line" aria-hidden="true" /> LẠC ĐƯỜNG</p>
        <h1>Sussy chạy lạc<br />khỏi bản đồ rồi.</h1>
        <p className="lede">Trang bạn tìm không tồn tại hoặc đã được dời đi.</p>
        <nav className="lost-links" aria-label="Quay lại">
          <Link prefetch={false} className="outline-button" href="/"><ArrowLeft aria-hidden="true" size={16} /> Portfolio Dev</Link>
          <Link prefetch={false} className="outline-button" href="/roblox">Portfolio Roblox</Link>
          <Link prefetch={false} className="outline-button" href="/nhat-ky">Nhật ký</Link>
        </nav>
      </main>
    </div>
  );
}
