"""Build the standalone preview and the deployable ZIP using only Python stdlib."""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
assets = ["index.html", "README.md", "scripts/build-preview.py"]

def embed_style(match):
    name = match.group(1)
    assets.append(name)
    return "<style>" + (ROOT / name).read_text(encoding="utf-8") + "</style>"

def embed_script(match):
    name = match.group(1)
    assets.append(name)
    return "<script>" + (ROOT / name).read_text(encoding="utf-8") + "</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"/]+\.css)">', embed_style, html)
html = re.sub(r'<script src="([^"/]+\.js)"></script>', embed_script, html)
(ROOT / "Phone-Life.html").write_text(html, encoding="utf-8")
with zipfile.ZipFile(ROOT / "Phone-Life-source.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for name in dict.fromkeys(assets):
        archive.write(ROOT / name, name)
for name in ("Phone-Life.html", "Phone-Life-source.zip"):
    print(f"{name}: {(ROOT / name).stat().st_size} bytes")
