# Handoff — Sussy portfolio (Claude Code → Codex)

Owner language: Vietnamese. Model for Codex: **gpt-6.1-sol, reasoning `xhigh`** (see `.codex/config.toml`).

## Branches

| Branch | State |
|---|---|
| `main` | Original light portfolio (untouched). |
| `feat/roblox-runner-upgrade` | Scroll story with Sussy: intro → tech conveyor → work → sunset contact. Build/lint/tsc clean. |
| `feat/dual-portfolio` | Branched from the above. Adds `/roblox` (Roblox Dev portfolio), header Dev/Roblox switch, night-baseplate theme, chapter-change jumps in Roblox mode. **Latest work — continue here (or branch from it).** |

Nothing has been pushed or merged.

## Done

- `.rbxm` animation extraction (no Studio needed) → `public/anims/*.json`; web uses `run-v4`, `idle-v2`, `jump`, `normal-land` + a code-authored sit pose.
- Sussy imported from Roblox Studio with original meshes/textures, polished in Blender. Source is now the R6 model `R6_SussySuspector_1265476893` (classic R6 blocks + accessories), meshopt GLB (~255 KB).
- Single WebGL stage: AgX tone mapping, PMREM env, blob shadow, adaptive DPR, pause when hidden, three.js code-split.
- Tech conveyor under Sussy's feet (12 dev techs incl. Python & C++; 10 Roblox tools), focus ring + hover/click + keyboard chips.
- Sunset hill with tree, wind grass, fireflies, sky shader; Sussy walks over and sits facing the sun; contact panel.
- Loading screen: Sussy's head as a 2D sprite spinning like a coin (`public/brand/sussy-head.png`).
- Reduced-motion toggle, mobile framing (375 px), fallback poster when WebGL fails.

## Needs the owner (do not invent)

- Real name, phone, Gmail, LinkedIn, Facebook, GitHub in `data/portfolio.ts` (Roblox profile already set).
- Real projects/experience text for both profiles (current copy is placeholder-ish).
- The ShirtGraphic decal (silver cross necklace, asset 124270113664331) is auth-locked; currently rebuilt as geometry.
  If the owner exports it from Studio, map it on the torso front instead.
- Deploy target/credentials (Cloudflare via wrangler is configured but never deployed).

## Roadmap (suggested order)

1. **Smoothness/perf pass**: measure FPS on a mid laptop + phone; Lighthouse (target Perf ≥ 85, A11y ≥ 95). Consider KTX2 textures, preloading the scene chunk after LCP, lowering grass count on low tiers.
2. **Transitions**: animate the Dev ↔ Roblox switch (camera fly-out + loader head), keep scroll chapter when switching.
3. **Case-study pages** per project (`/du-an/[slug]`, `/roblox/du-an/[slug]`) with the same visual language.
4. **Roblox mode set dressing**: SpawnLocation, a few baseplate props that rise per chapter, leaderstats-style HUD readout.
5. **Footstep audio** from the pack (muted by default, toggle in header), synced to run cycle.
6. **Tests**: vitest for `lib/story.ts`, `lib/rbx/rig.ts` (clip building) and `scripts/extract-rbxm-anims.ts` (parse the bundled `.rbxm` fixture).
7. **i18n** EN toggle (copy in `data/portfolio.ts`).
8. Clean up dev-only hooks (`window.__sussyScene`, `debugView`) behind a `?debug` flag if they bother anyone.

## Gotchas

- Scene only renders when the page is visible; see AGENTS.md for the hidden-pane inspection snippet.
- `storyFromSections` sums each chapter's 0→1 progress at the viewport centre; chapter heights live in CSS
  (`.chapter-intro/tech/contact`), the tech chapter scales with `--tech-count`.
- Camera keyframes (`KEYS` in `story-scene.ts`) are tuned for 1440×900 and 375×812 (portrait branch in `sampleKeys`).
- Grayscale/1-bit PNGs must be re-encoded RGBA before glTF export (handled in `build-sussy.py`).
