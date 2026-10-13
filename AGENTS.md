# AGENTS.md — Sussy portfolio

Guide for coding agents (Codex, Claude Code) working in this repo. Read `HANDOFF.md` first for the current state and roadmap.

## Model

Use **GPT-6.1-Sol with extra-high reasoning** (`model = "gpt-6.1-sol"`, `model_reasoning_effort = "xhigh"`), as set in
`.codex/config.toml`. The owner asked for this explicitly.

## Commands

```bash
npm install
npm run dev            # http://localhost:3000 (vinext dev, Cloudflare worker runtime)
npm run lint           # oxlint — must be clean (0 errors)
npm test               # Vitest regression + scene/route lifecycle tests
npx tsc --noEmit       # must be clean
npm run build          # vinext build — must succeed
npm run extract:anims -- "<file.rbxm>" public/anims
npm run build:model    # Blender headless build + meshopt optimize → public/models/sussy/sussy-r6.glb
npm run build:nature   # Blender headless tree/bush/grass/fern + meshopt → public/models/nature/nature.glb
npm run build:props    # Blender headless hammers/tools/studded bricks + meshopt → public/models/props/props.glb
```

If the dev server reports "Network connection lost" after adding a route, restart it.

## Stack & layout

- Vinext 1.0 beta (Next.js App Router compatible), React 19, TypeScript, Tailwind 4 (tokens in `app/globals.css`),
  three.js r185 (vanilla, no R3F), lucide-react for UI icons. Tech logos on the conveyor are the real full-colour
  marks (`data/tech-logos.ts`: original SVGs extruded layer by layer, Aseprite as voxels, built in
  `scene/tech-logo.ts`); simple-icons paths are the fallback and the chip icons.
- One portfolio (Roblox Developer) at `/`; `/roblox` permanently redirects there (the Dev and Roblox portfolios were
  merged in v4.0). The root layout's `PortfolioShell` renders `components/story/portfolio-story.tsx` on `/`. Content
  lives only in `data/portfolio.ts` (`portfolio.profile` + contacts), English copy in `data/i18n.ts`.
- The road (`lib/story.ts`): `ROAD` x positions, `journeyX` (Hermite run to the door, eased pass along the TVs, run to
  the tree), `doorFlood` (light covers the studio/meadow swap). The showcase range is measured from the page's
  `.showcase-stops` markers via `setShowcase`; walk vs run always follows scroll speed.
- `components/story/scene/*` is the WebGL layer, code-split via dynamic import. One renderer, fixed canvas.
- `lib/story.ts` holds the scroll math shared by DOM and scene (story value 0..4, tech slideshow, road, sunset/sit mixes).
- `lib/rbx/rig.ts` builds the R6 rig: `Part1 = Part0 * C0 * Transform * C1⁻¹`. Animated nodes are `<Part>Joint`.
- Coordinates are Roblox studs, Y-up, character faces −Z at yaw 0. HumanoidRootPart stands at y = 3.

## Conventions

- Match the surrounding style: compact TSX, comments only for non-obvious "why", Vietnamese UI copy.
- Never invent personal data. Contact fields stay empty until the owner provides them (UI shows "Đang cập nhật").
- Keep the dark, editorial look (reference: "KNOT / 001 — A material study"): Archivo display, Space Grotesk body,
  eyebrow `NN / 04 —— LABEL`, right chapter rail, bottom HUD with readout. `docs/design-dna.json` records the
  tokens, style and 3D effects; check new work against it.
- 3D props never sit over the copy, the header or the HUD: place them with projected screen positions at 1440×810
  and give a `phone` spot (or none) for portrait screens (`FLOATERS` in environment.ts).
- Animate only `transform`/`translate`/`opacity`/`clip-path` in CSS. Per-frame DOM loops write styles only; read
  sizes through a ResizeObserver (see chat-bubble.tsx). All scene motion is a pure function of the damped story value,
  so scrolling backwards must look identical.
- Respect reduced motion (`useSyncExternalStore` toggle + `prefers-reduced-motion`).
- Commit in small steps on a feature branch; do not push or merge to `main` without the owner's OK.

## Verifying visually

The scene pauses while `document.hidden` (hidden browser panes too). In dev, add `?debug`; `window.__sussyScene` exposes the
`StoryScene`; to inspect a frame from a hidden pane:

```js
Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
const s = window.__sussyScene; let T = performance.now() + 5000;
s.setReducedMotion(false);
s.storyTarget = s.story = 1.5; for (let i = 0; i < 90; i++) s.frame((T += 16.7));
s.debugView = { position: [7, 2.5, -1.5], target: [-1.2, 1.6, -1] }; // optional free camera, null to reset
```

Check desktop 1440×900 and mobile 375×812 for every visual change.

## Asset pipeline notes

- Sussy is the R6 model `R6_SussySuspector_1265476893` in the owner's Roblox Studio place. `assets-src/sussy/parts.json` is a
  dump of its part CFrames relative to HumanoidRootPart; meshes in `assets-src/sussy/meshes` are the original
  Roblox meshes (decoded with `scripts/rbxmesh-to-json.mjs`, LOD0 only: v6/v7 COREMESH holds every LOD's faces back
  to back and the LODS chunk gives the offsets; keeping them all draws coarse copies over the mesh). Auth-locked assets
  came from Studio's content cache (`$TMPDIR/Roblox/rbx-storage`, KTX2 textures → `scripts/ktx2png.mjs`).
- `HttpService:PostAsync` from the Studio MCP plugin can fail; `export_rbxm` is the reliable way to get an instance out.
- Blender 5.2 is at `/Applications/Blender.app`. When the Blender MCP addon is running (port 9876),
  `python3 scripts/blender/send-to-blender.py <script.py>` runs a script in the open session.
- Roblox Studio MCP (if connected) can dump more data with `execute_luau`; `HttpService:PostAsync` to a localhost
  listener works for exporting large payloads.
- After `build-sussy.py`, always run `npm run optimize:model` (meshopt). The rig keeps node transforms on meshes
  because they carry meshopt dequantization. Code that re-places glTF nodes (vegetation) must bake them first
  with `bakedGeometry()` (environment.ts), otherwise the geometry collapses to the -1..1 quantised range. Clones of
  glTF nodes keep the node transform and are sized by a parent group (studio props).
- `optimize:props` passes `--palette false`: palette textures would merge the steel, wood and rubber materials and
  break per-prop brick tints.
- Robustness: a lost WebGL context pauses the scene and rebuilds the PMREM environment on restore; if it does not
  come back within 4 s the page shows the static poster. The loader lifts after 15 s even if the scene is still
  loading.
- Agent skills used for this work (installed in `~/.claude/skills`): threejs-* (cloudai-x), gsap-* (greensock),
  design-dna (zanwei), motion-design (LottieFiles), genjutsu (AThevon: cast/paint/design-audit), Blender skills
  (prop-artist, blender-director, export-pipeline... from arjun988; blender-web-pipeline from freshtechbro).
  `python3 -I ~/.claude/skills/_jutsu/design-audit/scripts/audit.py .` is a read-only static audit.

## Copy style

UI copy, changelog and case studies are written plainly: short sentences with concrete facts and numbers. Avoid em
dashes as connectors, "not only... but also", three-item lists used for rhythm, and hype adjectives. Never invent
personal data; empty contacts stay "Đang cập nhật".
