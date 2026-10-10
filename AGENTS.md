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
npx tsc --noEmit       # must be clean
npm run build          # vinext build — must succeed
npm run extract:anims -- "<file.rbxm>" public/anims
npm run build:model    # Blender headless build + meshopt optimize → public/models/sussy/sussy-r6.glb
```

If the dev server reports "Network connection lost" after adding a route, restart it.

## Stack & layout

- Vinext 1.0 beta (Next.js App Router compatible), React 19, TypeScript, Tailwind 4 (tokens in `app/globals.css`),
  three.js r185 (vanilla, no R3F), simple-icons for tech logos, lucide-react for UI icons.
- Routes: `/` = Dev portfolio, `/roblox` = Roblox Dev portfolio. Both render `components/story/portfolio-story.tsx`
  with `mode`. Content lives only in `data/portfolio.ts` (`portfolio.profiles.dev|roblox` + shared contacts).
- `components/story/scene/*` is the WebGL layer, code-split via dynamic import. One renderer, fixed canvas.
- `lib/story.ts` holds the scroll math shared by DOM and scene (story value 0..4, tech slideshow, sunset/sit mixes).
- `lib/rbx/rig.ts` builds the R6 rig: `Part1 = Part0 * C0 * Transform * C1⁻¹`. Animated nodes are `<Part>Joint`.
- Coordinates are Roblox studs, Y-up, character faces −Z at yaw 0. HumanoidRootPart stands at y = 3.

## Conventions

- Match the surrounding style: compact TSX, comments only for non-obvious "why", Vietnamese UI copy.
- Never invent personal data. Contact fields stay empty until the owner provides them (UI shows "Đang cập nhật").
- Keep the dark, editorial look (reference: "KNOT / 001 — A material study"): Archivo display, Space Grotesk body,
  eyebrow `NN / 04 —— LABEL`, right chapter rail, bottom HUD with readout.
- Animate only `transform`/`opacity` in CSS. All scene motion is a pure function of the damped story value,
  so scrolling backwards must look identical.
- Respect reduced motion (`useSyncExternalStore` toggle + `prefers-reduced-motion`).
- Commit in small steps on a feature branch; do not push or merge to `main` without the owner's OK.

## Verifying visually

The scene pauses while `document.hidden` (hidden browser panes too). In dev, `window.__sussyScene` exposes the
`StoryScene`; to inspect a frame from a hidden pane:

```js
Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
const s = window.__sussyScene; let T = performance.now() + 5000;
s.storyTarget = s.story = 1.5; for (let i = 0; i < 90; i++) s.frame((T += 16.7));
s.debugView = { position: [7, 2.5, -1.5], target: [-1.2, 1.6, -1] }; // optional free camera, null to reset
```

Check desktop 1440×900 and mobile 375×812 for every visual change.

## Asset pipeline notes

- Sussy is `R15_SussySuspector_1265476893` in the owner's Roblox Studio place. `assets-src/sussy/parts.json` is a
  dump of its part CFrames relative to HumanoidRootPart; meshes in `assets-src/sussy/meshes` are the original
  Roblox meshes (decoded with `scripts/rbxmesh-to-json.mjs`). Auth-locked assets came from Studio's content cache
  (`$TMPDIR/Roblox/rbx-storage`, KTX2 textures → `scripts/ktx2png.mjs`).
- Blender 5.2 is at `/Applications/Blender.app`. When the Blender MCP addon is running (port 9876),
  `python3 scripts/blender/send-to-blender.py <script.py>` runs a script in the open session.
- Roblox Studio MCP (if connected) can dump more data with `execute_luau`; `HttpService:PostAsync` to a localhost
  listener works for exporting large payloads.
- After `build-sussy.py`, always run `npm run optimize:model` (meshopt). The rig keeps node transforms on meshes
  because they carry meshopt dequantization.
