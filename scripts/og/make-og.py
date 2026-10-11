"""Build the 1200×630 social cards (public/brand/og-{dev,roblox}.jpg).

The character render (assets-src/sussy/og-character.png, 520×630, transparent) comes from Blender; the card is an SVG
rasterised with headless Chrome, then saved as JPEG with `sips`.
Usage: python3 scripts/og/make-og.py
"""
import base64
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CARDS = {
    "dev": dict(bg1="#1b1b20", bg2="#0b0b0d", glow="#f0b07a", code="001", sub="A PORTFOLIO RUN",
                h1="Code gọn.", h2="Chạy không ngừng.", role="Frontend Developer · Three.js · Roblox"),
    "roblox": dict(bg1="#142035", bg2="#0a0f18", glow="#6cb4ff", code="002", sub="A ROBLOX RUN",
                   h1="Dựng map.", h2="Viết luật chơi.", role="Roblox Developer · Luau · Studio"),
}


def card_svg(c, character):
    lines = "".join(f'<line x1="{x}" y1="470" x2="{600 + (x - 600) * 2.2}" y2="630"/>' for x in range(620, 1200, 60))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="0.72" cy="0.45" r="0.8"><stop offset="0" stop-color="{c['bg1']}"/><stop offset="1" stop-color="{c['bg2']}"/></radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="{c['glow']}" stop-opacity="0.22"/><stop offset="1" stop-color="{c['glow']}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="900" cy="330" rx="330" ry="300" fill="url(#glow)"/>
  <g stroke="#ffffff" stroke-opacity="0.05">{lines}</g>
  <ellipse cx="900" cy="585" rx="150" ry="18" fill="#000" fill-opacity="0.45"/>
  <image x="640" y="0" width="520" height="630" xlink:href="data:image/png;base64,{character}"/>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" fill="#f1efea">
    <circle cx="86" cy="86" r="15" fill="none" stroke="#f1efea" stroke-width="3"/>
    <text x="114" y="95" font-size="26" font-weight="700" letter-spacing="0.5">SUSSY / {c['code']}</text>
    <text x="300" y="95" font-size="16" fill="#a9a69f" letter-spacing="3">{c['sub']}</text>
    <text x="72" y="290" font-size="76" font-weight="500" letter-spacing="-3">{c['h1']}</text>
    <text x="72" y="372" font-size="76" font-weight="500" letter-spacing="-3">{c['h2']}</text>
    <text x="74" y="440" font-size="24" fill="#a9a69f">{c['role']}</text>
    <rect x="74" y="530" width="56" height="3" fill="{c['glow']}"/>
    <text x="146" y="538" font-size="18" fill="#77756f" letter-spacing="3">SCROLL-DRIVEN 3D PORTFOLIO</text>
  </g>
</svg>'''


def main():
    character = base64.b64encode(open(os.path.join(ROOT, "assets-src/sussy/og-character.png"), "rb").read()).decode()
    with tempfile.TemporaryDirectory() as tmp:
        for key, card in CARDS.items():
            svg = os.path.join(tmp, f"og-{key}.svg")
            png = os.path.join(tmp, f"og-{key}.png")
            open(svg, "w").write(card_svg(card, character))
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={png}",
                            "--window-size=1200,630", f"file://{svg}"], check=True, capture_output=True)
            out = os.path.join(ROOT, f"public/brand/og-{key}.jpg")
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "86", png, "--out", out], check=True, capture_output=True)
            print("wrote", out)


main()
