"""Check exported model boundaries and local portfolio asset links."""
import json
import re
import struct
from pathlib import Path

root = Path(__file__).parent
expected = {
    "roblox-avatar.glb": {"sussydev_Roblox_Avatar", "sussydev_Eye", "sussydev_Eye.001"},
    "uit-logo.glb": {"sussydev_UIT_Logo"},
}
for name, nodes in expected.items():
    data = (root / "models" / name).read_bytes()
    magic, version, total = struct.unpack_from("<III", data)
    assert magic == 0x46546C67 and version == 2 and total == len(data), name
    length, kind = struct.unpack_from("<II", data, 12)
    assert kind == 0x4E4F534A, name
    model = json.loads(data[20:20 + length])
    assert len(model["scenes"]) == 1, f"Unexpected scene in {name}"
    assert {node["name"] for node in model["nodes"]} == nodes, f"Unexpected objects in {name}"
    assert all("bufferView" in image and "uri" not in image for image in model.get("images", [])), name
    assert model["meshes"], name
    assert "KHR_materials_clearcoat" in model.get("extensionsUsed", []), f"Glossy finish missing from {name}"
    assert all(material.get("pbrMetallicRoughness", {}).get("roughnessFactor", 1) <= .31 for material in model["materials"]), name
    print(f"{name}: model isolated; textures embedded; {len(data):,} bytes")

html = (root / "index.html").read_text()
assert re.findall(r'<section class="chapter" id="([^"]+)"', html) == ["roblox", "education", "toolkit", "about"]
for link in re.findall(r'(?:src|href)="([^"]+)"', html):
    if not link.startswith(("#", "https://")):
        assert (root / link).is_file(), f"Missing local asset: {link}"
for icon in ("javascript", "html5", "css", "linux", "git", "blender", "robloxstudio"):
    assert (root / "assets" / f"{icon}.svg").is_file(), icon
ignored = (root / ".vercelignore").read_text().splitlines()
assert "*.blend" in ignored and ".env*" in ignored, "Source or credentials may be deployed"
print("Portfolio: all four sections and local assets present; source and environment files excluded")
