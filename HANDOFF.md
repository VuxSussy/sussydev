# Handoff — Sussy portfolio (Claude Code → Codex)

Owner language: Vietnamese. Model for Codex: **gpt-6.1-sol, reasoning `xhigh`** (see `.codex/config.toml`).

## Branches

| Branch | State |
|---|---|
| `main` | Original light portfolio (untouched). |
| `feat/roblox-runner-upgrade` | Scroll story with Sussy: intro → tech conveyor → work → sunset contact. Build/lint/tsc clean. |
| `feat/dual-portfolio` | Branched from the above. Adds `/roblox` (Roblox Dev portfolio), header Dev/Roblox switch, night-baseplate theme, chapter-change jumps in Roblox mode. Base for `feat/codex-next`. |
| `feat/sussy-r6` | **Current line, pushed to GitHub (`VuxSussy/sussydev`, branch `feat/sussy-r6`).** Uses the R6 Sussy model (`R6_SussySuspector_1265476893`), click-to-hop, `/nhat-ky` changelog, plus a merge of `feat/codex-next`. Work lives in the worktree `../site-r6`. |
| `feat/codex-next` | Codex continuation (imported from the bundle and merged into `feat/sussy-r6`): Vitest regression suite, persistent scene/mode transitions and a frame/resource performance pass. Working files are updated here; see the Git sandbox note below. |

Only `feat/sussy-r6` is pushed (to `VuxSussy/sussydev`); `main` there is the older vanilla portfolio and is untouched.

### Git sandbox note (Codex, 2026-10-11)

The session permits source edits but makes this checkout's `.git` read-only (`index.lock: Operation not permitted`).
Three small commits were prepared on `feat/codex-next` in a separate Git copy under `/tmp` and exported to
`outputs/codex-next.bundle`. The original branch HEAD remains `8e1f6f7` until the owner imports them.
Run `sh outputs/import-codex-next.sh` outside this sandbox to import the local bundle into **this branch**.
The script verifies the branch/base and refuses staged changes; it updates Git metadata without overwriting working files.
It does not push or merge. `outputs` is already gitignored.

## Done

- `.rbxm` animation extraction (no Studio needed) → `public/anims/*.json`; web uses `run-v4`, `idle-v2`, `jump`, `normal-land` + a code-authored sit pose.
- Sussy imported from Roblox Studio with original meshes/textures, polished in Blender. Source is now the R6 model `R6_SussySuspector_1265476893` (classic R6 blocks + accessories), meshopt GLB (~255 KB).
- Single WebGL stage: AgX tone mapping, PMREM env, blob shadow, adaptive DPR, pause when hidden, three.js code-split.
- Tech conveyor under Sussy's feet (12 dev techs incl. Python & C++; 10 Roblox tools), focus ring + hover/click + keyboard chips.
- Sunset hill with tree, wind grass, fireflies, sky shader; Sussy walks over and sits facing the sun; contact panel.
- Loading screen: Sussy's head as a 2D sprite spinning like a coin (`public/brand/sussy-head.png`).
- Reduced-motion toggle, mobile framing (375 px), fallback poster when WebGL fails.
- Vitest 5 + `npm test` / `npm run test:watch`: 49 tests across story math/inverse scroll mapping, Motor6D matrices,
  rig/clip playback, parser + CLI, route switching, reversible chapter hops/conveyor focus, resource disposal and scene lifecycle.
  `tests/fixtures/r6-movement.rbxm` is the original owner's pack; all 15 sequence metadata entries, motors and all six
  published JSON clips are compared. Corrupt/truncated LZ4 and RBXM inputs now fail explicitly.
- Dev ↔ Roblox transition: a short camera pullback + Sussy-head curtain; same renderer/avatar stay mounted in
  `PortfolioShell` under the shared root layout. Fractional story progress is restored against the new section heights,
  so switching a 12-item Dev stack to a 10-item Roblox stack keeps the reading position. Modified link clicks still work.
- Frame/resource pass: cached lighting colours and pick meshes, shader warmup before scene reveal, no repeated renders
  for unchanged reduced-motion frames; stable DPR recovery uses two four-second samples and ignores initial warmup.
  Animation fetches abort on disposal, late avatars are freed, shared GPU resources are disposed once, and PMREM targets/room
  geometry are released. Failed scene loads release resources before showing the poster.
- Chapter hops and conveyor focus now derive directly from story progress instead of accumulated jump/focus history.
  The motion toggle also disables CSS animation; muted text tokens have more contrast without changing the dark palette.
- The dev scene hook is available only at `/?debug` or `/roblox?debug`, and is removed on unmount.

### Verification for the Codex pass

- `npm test`: **49 passing**; `npm run lint`, `npx tsc --noEmit`, `npm run build`: clean exits.
- Both routes serve the expected SSR content; no changes to `data/portfolio.ts`, model assets, textures or grass counts.
- **Pending visual/hardware verification:** Computer Use was not approved for Chrome/Zen; no connected browser was available.
  The separate headless Lighthouse attempt also failed to launch Chrome (dynamic debugging port never became available).
  Desktop **1440×900**, mobile **375×812**, real FPS and Lighthouse scores have **not** been verified in this session.
  Scene tests use a mocked GPU renderer and cannot certify visual quality or hardware performance.

### Lighthouse baseline (Claude, 2026-10-11, production build via `wrangler dev`, Lighthouse 12)

| Route | Perf | A11y | BP | SEO | LCP (sim / observed) | TBT |
|---|---|---|---|---|---|---|
| `/` desktop | 99 | 100 | 100 | 100 | 0.7 s / 90 ms | 10 ms |
| `/` mobile | 89 | 100 | 100 | 100 | 3.0 s / 61 ms | 110 ms |
| `/roblox` desktop | 99 | 100 | 100 | 100 | 0.7 s / 64 ms | 10 ms |
| `/roblox` mobile | 86 | 100 | 100 | 100 | 3.5 s / 63 ms | 100 ms |

axe-core reports no violations on `/`, `/roblox`, `/nhat-ky`, `/du-an/*` and the 404 page.
The loader head is inlined (`lib/brand.ts`, regenerate from `public/brand/sussy-head.webp` if the sprite changes).

## Needs the owner (do not invent)

- Real name, phone, Gmail, LinkedIn, Facebook, GitHub in `data/portfolio.ts` (Roblox profile already set).
- Real projects/experience text for both profiles (current copy is placeholder-ish).
- The ShirtGraphic decal (silver cross necklace, asset 124270113664331) is auth-locked; currently rebuilt as geometry.
  If the owner exports it from Studio, map it on the torso front instead.
- Deploy target/credentials (Cloudflare via wrangler is configured but never deployed).

## Roadmap (suggested order)

1. **Visual/hardware validation** of the new transitions/performance pass: check 1440×900 and 375×812, keyboard navigation,
   Dev ↔ Roblox at all four chapters, reduced motion, fallback and back/forward. Measure FPS on a mid laptop + phone;
   Lighthouse target Perf ≥ 85, A11y ≥ 95. No scores are claimed yet.
2. **Further loading/perf work** after measurement: consider KTX2 textures and scene-chunk scheduling after LCP. Keep image quality;
   current texture sizes, grass counts and DPR limits were preserved. Mode transition and chapter preservation are implemented.
3. **Case-study pages** per project (`/du-an/[slug]`, `/roblox/du-an/[slug]`) with the same visual language.
4. **Roblox mode set dressing**: SpawnLocation, a few baseplate props that rise per chapter, leaderstats-style HUD readout.
5. **Footstep audio** from the pack (muted by default, toggle in header), synced to run cycle.
6. **Browser regression tests** once browser automation is available; the requested Vitest math/rig/extractor suite is complete.
7. **i18n** EN toggle (copy in `data/portfolio.ts`).
8. Optional automated performance budgets after a trustworthy Lighthouse baseline is recorded. The scene hook is already behind `?debug`.

## Gotchas

- Scene only renders when the page is visible; see AGENTS.md for the hidden-pane inspection snippet.
- Add `?debug` in development before using `window.__sussyScene`. With reduced motion enabled, call `setReducedMotion(false)`
  before manually advancing debug frames; otherwise unchanged frames are intentionally skipped.
- `app/page.tsx` and `app/roblox/page.tsx` now provide schema/metadata; `PortfolioShell` chooses the mode using `usePathname`.
  Keep that shell in the shared layout so mode switches do not recreate the GPU renderer or reload the avatar.
- `storyFromSections` sums each chapter's 0→1 progress at the viewport centre; chapter heights live in CSS
  (`.chapter-intro/tech/contact`), the tech chapter scales with `--tech-count`.
- Camera keyframes (`KEYS` in `story-scene.ts`) are tuned for 1440×900 and 375×812 (portrait branch in `sampleKeys`).
- Grayscale/1-bit PNGs must be re-encoded RGBA before glTF export (handled in `build-sussy.py`).
