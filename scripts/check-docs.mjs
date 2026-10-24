import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root } from './build.mjs';

const documents = ['README.md', 'README.de.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'THIRD-PARTY-NOTICES.md', 'TEST-REPORT.md'];
async function markdownFiles(directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await markdownFiles(relative));
    else if (entry.name.endsWith('.md')) result.push(relative);
  }
  return result;
}
for (const directory of ['docs', 'examples', 'focus-lyt-controls']) documents.push(...await markdownFiles(directory));
const slug = text => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
let count = 0;
for (const document of documents) {
  const source = await readFile(path.join(root, document), 'utf8');
  // Ignore code samples and Obsidian wiki links in example notes.
  const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  for (const match of prose.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|data:|\/\/)/.test(target)) continue;
    assert(!path.isAbsolute(target), `${document}: absolute local link ${target}`);
    const [file, anchor] = target.split('#');
    const destination = path.resolve(root, path.dirname(document), decodeURIComponent(file || path.basename(document)));
    assert(destination.startsWith(root + path.sep), `${document}: link escapes the repository: ${target}`);
    assert(!/\/(?:output|dist|node_modules|\.local)\//.test(destination.slice(root.length)), `${document}: link to an unpublished artifact: ${target}`);
    await stat(destination).catch(() => { throw new Error(`${document}: missing link target ${target}`); });
    if (anchor && destination.endsWith('.md')) {
      const content = await readFile(destination, 'utf8');
      const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => slug(match[1]));
      assert(headings.includes(decodeURIComponent(anchor)), `${document}: missing anchor ${target}`);
    }
    count++;
  }
}
for (const name of ['dark.png', 'light.png', 'focus-hidden.png', 'focus-open.png', 'focus-locked.png', 'store.png']) {
  const png = await readFile(path.join(root, 'docs/images', name));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG: ${name}`);
  assert(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0, `Empty PNG: ${name}`);
}
console.log(`PASS: ${count} local links/images across ${documents.length} Markdown files; six published PNGs.`);
