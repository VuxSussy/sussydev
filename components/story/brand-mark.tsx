import Image from "next/image";

/** Sussy's head (the site favicon) next to the name in the header, loader and sub-pages. */
export function BrandMark() {
  return <Image className="brand-mark" src="/brand/sussy-icon.webp" alt="" width={128} height={128} aria-hidden="true" unoptimized />;
}
