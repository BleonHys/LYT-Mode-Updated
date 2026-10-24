import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const pins = JSON.parse(await readFile(new URL('./dependencies.json', import.meta.url)));
async function download(url, hash, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  const actual = createHash('sha256').update(data).digest('hex');
  if (actual !== hash) throw new Error(`SHA256 mismatch for ${url}: ${actual}`);
  await writeFile(destination, data);
}
await mkdir('/opt/obsidian', { recursive: true });
for (const [version, pin] of Object.entries(pins.obsidian)) {
  const archive = `/tmp/obsidian-${version}.tar.gz`;
  await download(pin.url, pin.sha256, archive);
  execFileSync('tar', ['-xzf', archive, '-C', '/opt/obsidian']);
  execFileSync('rm', [archive]);
}
await mkdir('/opt/style-settings', { recursive: true });
for (const [file, hash] of Object.entries(pins.styleSettings.files)) {
  await download(`${pins.styleSettings.baseUrl}${file}`, hash, `/opt/style-settings/${file}`);
}
