# sussydev

A scroll-driven Roblox developer portfolio built with React, TypeScript and Three.js. Sussy moves through a studio, a tool showcase, project screens and a sunset landscape as the visitor scrolls.
Website: https://sussydev.vercel.app/ (Not done yet - only finished prototype)


## Tech Stack

- Vinext (Next.js App Router compatible), React 19 and TypeScript
- Three.js for the WebGL scene and R6 animation playback
- Tailwind CSS 4 and Lucide icons
- Blender for avatar refinement and procedural landscape assets
- Vitest and Playwright for regression tests
- Nitro for Vercel deployment; Cloudflare Workers / Wrangler remains available locally

## Local Development

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev -- --port 3002
```

Open http://localhost:3002. No Blender installation is needed to run the website; exported models are included.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
```

Playwright tests require the browser configured in `playwright.config.ts`. The production build is written to `dist/`; `npm start` runs it locally through Wrangler.

## Structure

- `app/`: routes, metadata and global styles
- `components/story/`: portfolio interface and WebGL scene
- `data/`: portfolio content, translations, case studies and changelog
- `lib/`: scroll calculations, audio and Roblox rig logic
- `public/`: optimized models, animations and images
- `assets-src/` and `scripts/`: editable assets and conversion tools
- `tests/`: unit and browser regression tests

## Assets

The R6 avatar comes from Roblox Studio and is refined in Blender. Animation extraction reads Roblox `.rbxm` files; the movement fixture credits are documented in `tests/fixtures/README.md`. Tech logos come from devicon (MIT), the official Luau and roblox-ts sites, Aseprite's app icon and Simple Icons (CC0). The floating hammers, tools and bricks are modelled by `scripts/blender/build-props.py`. Brand names and logos belong to their respective owners.

Personal details and project claims should be updated with verified information before using this portfolio for applications.

## Vercel Deployment

The `prototype` branch preserves the previous static website. The current application is maintained on `main`.

```sh
NITRO_PRESET=vercel npm run build
vercel deploy --prebuilt --prod
```

`vercel.json` also configures a Vercel source build. Vercel uses Nitro to generate server functions and static assets.
