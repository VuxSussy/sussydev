# sussydev

A personal portfolio built around a scroll-driven 3D experience. Four chapters introduce a Roblox avatar, education at the University of Information Technology (UIT), a collection of development tools, and a short personal profile.

**Live website:** [sussydev.vercel.app](https://sussydev.vercel.app)

## Features

- Roblox avatar and UIT logo modeled and refined in Blender, exported as GLB assets.
- Standalone 3D tool logos with an expanding animation.
- Smooth scroll transitions, studio lighting, and glossy materials.
- Responsive layouts, reduced-motion controls, and image fallbacks.
- Silver, deep blue, emerald, and copper chapter colors.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| HTML5 | Semantic content and navigation |
| CSS3 | Responsive layouts and visual styling |
| JavaScript ES modules | Scroll animation and interaction |
| Three.js 0.185.1 | WebGL rendering, model loading, and SVG extrusion |
| Blender | Model refinement, UIT logo modeling, and GLB export |
| Roblox Studio | Original avatar export |
| glTF 2.0 / GLB | Portable 3D models with embedded textures |
| Vercel | Static website hosting |

Three.js is loaded from a CDN. The website does not require a package installation or build step.

## Run Locally

With Python 3 installed, run this command from the repository root:

```sh
python3 -m http.server 3000
```

Open [localhost:3000](http://localhost:3000) in a browser. Use a local web server so JavaScript modules and model loading work correctly.

## Project Structure

```text
index.html              Page content and navigation
style.css               Responsive styles
app.js                  3D scene and scroll choreography
assets/                 Icons, images, and favicon
models/                 Roblox avatar and UIT logo GLB files
sussydev-models.blend    Editable Blender source
verify-assets.py        Asset validation
```

## Validation

```sh
python3 verify-assets.py
node --check app.js
```

Node.js is only needed for the optional JavaScript syntax check.

## Assets and Credits

The Roblox avatar originates from Roblox Studio. It uses a static pose; the website animates its position and rotation. The UIT model is based on the supplied UIT logo. Tool icons come from [Simple Icons](https://github.com/simple-icons/simple-icons), and Archivo and Space Grotesk fonts are served through Google Fonts.

Brand names and logos belong to their respective owners.
