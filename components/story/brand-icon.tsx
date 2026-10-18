import { siDiscord, siFacebook, siGithub, siGmail, siRoblox } from "simple-icons";
import type { ContactLink } from "@/data/portfolio";

const PATHS: Partial<Record<ContactLink["kind"], string>> = {
  discord: siDiscord.path,
  facebook: siFacebook.path,
  github: siGithub.path,
  gmail: siGmail.path,
  roblox: siRoblox.path,
};

/** Monochrome contact glyph (simple-icons paths; LinkedIn has no CC0 mark, so it uses a lettermark). */
export function BrandIcon({ kind, size = 18 }: { kind: ContactLink["kind"]; size?: number }) {
  if (kind === "linkedin") {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
        <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <text x="12" y="16.6" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="inherit">in</text>
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={PATHS[kind]} />
    </svg>
  );
}
