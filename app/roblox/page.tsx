import type { Metadata } from "next";

const title = "Sussy / 002 — Portfolio Roblox Developer";
const description = "Portfolio Roblox: Luau, Roblox Studio, animation R6 và gameplay nhiều người chơi — Sussy chạy qua từng công cụ.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", locale: "vi_VN", images: ["/brand/og-roblox.jpg"] },
  twitter: { card: "summary_large_image", title, description, images: ["/brand/og-roblox.jpg"] },
};

export default function RobloxPortfolio() {
  return null;
}
