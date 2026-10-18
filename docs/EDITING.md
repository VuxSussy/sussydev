# Editing the site's content

Everything a visitor reads lives in a few data files, so changing your info never means touching the 3D scene.
The site opens in English; Vietnamese is the toggle.

| What you want to change | File | Field |
| --- | --- | --- |
| Your real name (CV title, page footer, search results) | `data/portfolio.ts` | `name` (still the placeholder "Tên của bạn") |
| Header text "Sussy \| Aspiring Roblox Developer" | `data/portfolio.ts` | `character` and `profile.brandSub` |
| Phone, Gmail, LinkedIn, Facebook, GitHub, Roblox | `data/portfolio.ts` | `contacts[].value` (empty shows "Coming soon") |
| City and availability, **Vietnamese** | `data/portfolio.ts` | `location`, `availability` |
| City and availability, **English** | `data/i18n.ts` | `ui.en.location`, `ui.en.availability` |
| Headline, intro, section titles, About, Experience, **Vietnamese** | `data/portfolio.ts` | `profile.headline`, `intro`, `techTitle`, `workTitle`, `about`, `experience` |
| The same texts in **English** | `data/i18n.ts` | the `en` object (`headline`, `intro`, `about`, `experience`, …) |
| Tech stack (chips and 3D conveyor) | `data/portfolio.ts` | `profile.techStack` (+ the English blurb in `data/i18n.ts` → `en.tech`, + a logo in `data/tech-logos.ts`) |
| Projects on the roadside screens | `data/portfolio.ts` | `profile.projects` (`title`, `year`, `category`, `summary`, `impact`, `url`, `image`) |
| A project's English text | `data/i18n.ts` | `en.projects["<slug>"]` |
| A project's screen picture | `public/projects/` | a 16:9 `.webp`, then `image: "/projects/<file>.webp"` |
| A long case study page (`/du-an/<slug>`) | `data/case-studies.ts` | an entry keyed by the project's `slug` |
| Sussy's chat bubbles | `data/i18n.ts` | `chatLines` |
| Buttons and small labels | `data/i18n.ts` | `ui.vi` / `ui.en` |
| Changelog page (`/nhat-ky`) | `data/changelog.ts` | add a release at the top of `changelog` |
| Browser tab title and search/social description | `app/layout.tsx` | `title`, `description` |
| Background music and breeze | `public/audio/` | see `assets-src/audio/README.md` |

After editing, run `npm run dev -- --port 3002` and open http://localhost:3002 to check, then commit and push: Vercel deploys `main`
automatically.

Notes:

- Each project needs a unique `slug`; it is the URL of its page and the key for its English text and case study.
- Keep `data/portfolio.ts` and `data/i18n.ts` in step: a field missing from the English side falls back to Vietnamese.
- Use plain `<a href>` for links between pages, not Next's `<Link>`: client-side navigation fails in the production
  build of this framework (vinext), so internal links do a normal page load.
