"""Build the standalone preview and the deployable ZIP using only Python stdlib."""
from pathlib import Path
import re
import argparse
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("--scenario", type=Path, help="Private scenario descriptor; never published by the default build")
parser.add_argument("--output", type=Path)
args = parser.parse_args()
html = (ROOT / "index.html").read_text(encoding="utf-8")
assets = ["index.html", "README.md", "scripts/build-preview.py", "scripts/private-scenario-bootstrap.js"]

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
if args.scenario:
    if not args.output:
        parser.error("--scenario requires --output")
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error("Private previews must be written outside the public repository")
    descriptor = json.dumps(json.loads(args.scenario.read_text(encoding="utf-8")), ensure_ascii=False).replace("<", "\\u003c")
    bootstrap = (ROOT / "scripts/private-scenario-bootstrap.js").read_text(encoding="utf-8")
    html = html.replace("</body>", '<script id="privateScenarioData" type="application/json">' + descriptor + '</script><script>' + bootstrap + '</script></body>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"Private preview: {output.name}: {output.stat().st_size} bytes")
    raise SystemExit(0)
(ROOT / "Phone-Life.html").write_text(html, encoding="utf-8")
with zipfile.ZipFile(ROOT / "Phone-Life-source.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for name in dict.fromkeys(assets):
        archive.write(ROOT / name, name)
for name in ("Phone-Life.html", "Phone-Life-source.zip"):
    print(f"{name}: {(ROOT / name).stat().st_size} bytes")
