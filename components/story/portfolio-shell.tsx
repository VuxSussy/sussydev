"use client";

import { usePathname } from "next/navigation";
import { PortfolioStory } from "./portfolio-story";

/** A shared layout keeps the renderer and loaded avatar alive across portfolio routes. */
export function PortfolioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = pathname === "/" ? "dev" : pathname === "/roblox" ? "roblox" : null;
  return <>{children}{mode && <PortfolioStory mode={mode} />}</>;
}
