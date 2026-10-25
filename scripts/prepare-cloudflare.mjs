import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'scripts'), { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && (/\.(js|css)$/.test(entry.name) || ['index.html', 'play.html'].includes(entry.name))) {
    await cp(path.join(root, entry.name), path.join(output, entry.name));
  }
}
await cp(path.join(root, 'scripts/private-scenario-bootstrap.js'), path.join(output, 'scripts/private-scenario-bootstrap.js'));
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log('Prepared Cloudflare assets: / = editor, /play = player');
