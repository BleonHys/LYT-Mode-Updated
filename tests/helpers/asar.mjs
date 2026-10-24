import { readFile } from 'node:fs/promises';
// Read the public app.css asset directly from the pinned application archive.
// This is a local fixture input, never included in the distributable theme.
export async function readAsarFile(archive, name) {
  const buffer = await readFile(archive);
  const header = JSON.parse(buffer.subarray(16, 16 + buffer.readUInt32LE(12)).toString());
  let item = header;
  for (const part of name.split('/')) item = item.files[part];
  if (!item || item.unpacked) throw new Error(`Missing packed ASAR asset: ${name}`);
  const start = 8 + buffer.readUInt32LE(4) + Number(item.offset);
  return buffer.subarray(start, start + item.size).toString();
}
