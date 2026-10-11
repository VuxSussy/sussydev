"use client";

import { usePathname } from "next/navigation";
import { PortfolioStory } from "./portfolio-story";

/** The story (renderer + avatar) lives in the root layout and is shown on the home route. */
export function PortfolioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <>{children}{pathname === "/" && <PortfolioStory />}</>;
}
