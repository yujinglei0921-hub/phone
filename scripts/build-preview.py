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
parser.add_argument("--share-scenario", action="store_true", help="Explicitly publish only the requested conversation increment, excluding backup identity and media")
args = parser.parse_args()
if args.share_scenario and not args.scenario:
    parser.error("--share-scenario requires --scenario")
html = (ROOT / "index.html").read_text(encoding="utf-8")
assets = ["index.html", "README.md", "scripts/build-preview.py", "scripts/private-scenario-bootstrap.js"]
if args.scenario:
    html = re.sub(r'<script id="privateScenarioData" type="application/json">.*?</script>', '', html, flags=re.S)
    html = html.replace('<script src="scripts/private-scenario-bootstrap.js"></script>', '')

def read_asset(name):
    path = (ROOT / name).resolve()
    if ROOT not in path.parents or not path.is_file():
        raise ValueError(f"Invalid local asset: {name}")
    return path.read_text(encoding="utf-8")

def embed_style(match):
    name = match.group(1)
    assets.append(name)
    return "<style>" + read_asset(name) + "</style>"

def embed_script(match):
    name = match.group(1)
    assets.append(name)
    return "<script>" + read_asset(name) + "</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"/]+\.css)">', embed_style, html)
html = re.sub(r'<script src="([^"]+\.js)"></script>', embed_script, html)
if args.scenario:
    if not args.output:
        parser.error("--scenario requires --output")
    output = args.output.resolve()
    if not args.share_scenario and (output == ROOT or ROOT in output.parents):
        parser.error("Private previews must be written outside the public repository")
    data = json.loads(args.scenario.read_text(encoding="utf-8"))
    if args.share_scenario:
        # An explicit publish command includes only the authored increment, never the original backup.
        data = {
            "id": data["id"], "sourceBackupName": "你自己的原始 JSON 备份",
            "identity": {"contactIds": [data["contactId"]]},
            "contactId": data["contactId"], "contactName": data["contactName"],
            "messages": [{k: m[k] for k in ("id", "from", "text", "at", "showTimestamp") if k in m} for m in data["messages"]],
            "storyNode": {k: data["storyNode"][k] for k in ("id", "title", "trigger", "contact", "action", "body") if k in data["storyNode"]},
        }
    descriptor = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    bootstrap = (ROOT / "scripts/private-scenario-bootstrap.js").read_text(encoding="utf-8")
    html = html.replace("</body>", '<script id="privateScenarioData" type="application/json">' + descriptor + '</script><script>' + bootstrap + '</script></body>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"{'Shareable' if args.share_scenario else 'Private'} preview: {output.name}: {output.stat().st_size} bytes")
    raise SystemExit(0)
(ROOT / "Phone-Life.html").write_text(html, encoding="utf-8")
with zipfile.ZipFile(ROOT / "Phone-Life-source.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for name in dict.fromkeys(assets):
        archive.write(ROOT / name, name)
for name in ("Phone-Life.html", "Phone-Life-source.zip"):
    print(f"{name}: {(ROOT / name).stat().st_size} bytes")
