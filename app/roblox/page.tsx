import type { Metadata } from "next";
import { PortfolioStory } from "@/components/story/portfolio-story";

const title = "Sussy / 002 — Portfolio Roblox Developer";
const description = "Portfolio Roblox: Luau, Roblox Studio, animation R6 và gameplay nhiều người chơi — Sussy chạy qua từng công cụ.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", locale: "vi_VN", images: ["/brand/sussy-poster.png"] },
  twitter: { card: "summary_large_image", title, description, images: ["/brand/sussy-poster.png"] },
};

export default function RobloxPortfolio() {
  return <PortfolioStory key="roblox" mode="roblox" />;
}
