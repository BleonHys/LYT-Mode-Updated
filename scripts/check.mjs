import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { parseDocument } from 'yaml';
import { renderTheme, themeDirectory } from './build.mjs';

const css = await readFile(path.join(themeDirectory, 'theme.css'), 'utf8');
assert.equal(css, await renderTheme(), 'Generated theme.css is stale. Run npm run build.');
const tree = postcss.parse(css, { from: 'theme.css' });
const errors = [];
const verify = (condition, message) => { if (!condition) errors.push(message); };
const selectors = [];
const definitions = new Map();
const references = new Set();
const settings = [];
const ids = new Set();
const registerId = (id) => {
  verify(typeof id === 'string' && id.startsWith('lyt-prism'), `Setting ID must be namespaced: ${id}`);
  verify(!ids.has(id), `Duplicate settings ID: ${id}`);
  ids.add(id);
};

tree.walkRules(rule => selectors.push(rule.selector));
tree.walkDecls(declaration => {
  if (declaration.prop.startsWith('--')) {
    const values = definitions.get(declaration.prop) || [];
    values.push(declaration.value);
    definitions.set(declaration.prop, values);
  }
  for (const reference of declaration.value.matchAll(/var\(\s*(--[\w-]+)/g)) references.add(reference[1]);
  for (const url of declaration.value.matchAll(/url\(\s*['"]?([^'"\s)]+)/g)) {
    verify(url[1].startsWith('data:'), `External asset dependency in ${declaration.prop}: ${url[1].slice(0, 80)}`);
  }
});
tree.walkAtRules('import', () => errors.push('Remote CSS imports are not allowed.'));
tree.walkComments(comment => {
  if (!comment.text.trimStart().startsWith('@settings')) return;
  const document = parseDocument(comment.text.trimStart().slice('@settings'.length));
  for (const error of document.errors) errors.push(`Style Settings YAML: ${error.message}`);
  if (document.errors.length) return;
  const group = document.toJS();
  registerId(group.id);
  verify(typeof group.name === 'string' && !!group.name.trim(), 'Settings group has no name.');
  verify(Array.isArray(group.settings), `Settings group ${group.id} must have a settings array.`);
  for (const setting of group.settings || []) {
    registerId(setting.id);
    settings.push(setting);
  }
});

const selectorsText = selectors.join('\n');
const classIsWired = name => new RegExp(`\\.${name}(?![\\w-])`).test(selectorsText);
for (const setting of settings) {
  if (setting.type === 'class-toggle') {
    verify(typeof setting.default === 'boolean', `${setting.id}: class toggle must declare a boolean default.`);
    verify(classIsWired(setting.id), `${setting.id}: toggle has no CSS selector.`);
  } else if (setting.type === 'class-select') {
    verify(Array.isArray(setting.options) && setting.options.length > 0, `${setting.id}: empty class options.`);
    const options = (setting.options || []).map(option => typeof option === 'string' ? option : option.value);
    for (const option of options) verify(classIsWired(option), `${setting.id}: option ${option} has no CSS selector.`);
    verify(options.includes(setting.default) || setting.allowEmpty, `${setting.id}: default option is invalid.`);
  } else if (setting.type?.startsWith('variable-')) {
    const id = `--${setting.id}`;
    const wired = references.has(id) || ['-h', '-s', '-l', '-r', '-g', '-b'].some(suffix => references.has(id + suffix));
    verify(wired, `${setting.id}: variable is never consumed by CSS.`);
    if (setting.type.includes('color')) {
      const defaults = setting.type === 'variable-themed-color' ? ['default-light', 'default-dark'] : ['default'];
      for (const key of defaults) {
        verify(typeof setting[key] === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(setting[key]), `${setting.id}: ${key} must contain a quoted valid hex color.`);
      }
    }
    if (setting.type === 'variable-number-slider') {
      verify([setting.default, setting.min, setting.max, setting.step].every(Number.isFinite), `${setting.id}: slider requires numeric bounds/default/step.`);
      verify(setting.min <= setting.default && setting.default <= setting.max && setting.step > 0, `${setting.id}: invalid slider range.`);
    }
  } else {
    verify(['heading', 'info-text'].includes(setting.type), `${setting.id}: unvalidated settings type ${setting.type}.`);
  }
}
verify(settings.length > 0, 'No Style Settings parsed.');

const autohides = settings.filter(setting => setting.type === 'class-toggle' && setting.id.startsWith('lyt-prism-autohide-'));
verify(autohides.length === 6, `Expected six independent auto-hide controls, found ${autohides.length}.`);
for (const setting of autohides) {
  verify(setting.default === false, `${setting.id}: auto-hide must be opt-in.`);
  const rules = selectors.filter(selector => selector.includes(`.${setting.id}`)).join('\n');
  verify(rules.includes(':hover') && rules.includes(':focus-within'), `${setting.id}: needs hover and keyboard focus reveal rules.`);
  verify(rules.includes('.is-mobile'), `${setting.id}: needs a mobile safeguard.`);
}
verify(css.includes('prefers-reduced-motion: reduce'), 'Missing OS reduced-motion handling.');
verify(selectorsText.includes('.theme-dark') && selectorsText.includes('.theme-light'), 'Missing light or dark mode.');
verify(!/CodeMirror|Font Awesome|FontAwesome|boxicons/i.test(css), 'Legacy editor or replacement-icon asset leaked into theme.');

// Catch the old LYT font-size: var(--font-normal) bug, including variable aliases.
const fontWeightTokens = new Set(['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black', 'weight'].map(name => `--font-${name}`));
function numericFontSize(value, seen = new Set()) {
  if (/^[+-]?(?:\d*\.)?\d+$/.test(value.trim())) return Number(value) !== 0;
  const match = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  if (!match || seen.has(match[1])) return false;
  if (fontWeightTokens.has(match[1])) return true;
  const next = new Set([...seen, match[1]]);
  return (definitions.get(match[1]) || []).some(item => numericFontSize(item, next));
}
tree.walkDecls('font-size', declaration => {
  verify(!numericFontSize(declaration.value), `Invalid unitless font-size: ${declaration.value}`);
});
for (const reference of references) {
  if (reference.startsWith('--lyt-prism-')) verify(definitions.has(reference), `Missing built-in default: ${reference}`);
}

let fontFaces = 0;
tree.walkAtRules('font-face', face => {
  fontFaces++;
  const declarations = Object.fromEntries(face.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  verify(/^['"]?DM (Sans|Mono)['"]?$/.test(declarations['font-family'] || ''), 'Unexpected bundled font family.');
  const data = /data:font\/woff2;charset=utf-8;base64,([a-z\d+/=]+)/i.exec(declarations.src || '');
  verify(!!data, 'Font face has no embedded WOFF2 data.');
  if (data) verify(Buffer.from(data[1], 'base64').subarray(0, 4).toString() === 'wOF2', 'Invalid WOFF2 font signature.');
});
verify(fontFaces === 8, `Expected eight original DM font faces, found ${fontFaces}.`);

const manifest = JSON.parse(await readFile(path.join(themeDirectory, 'manifest.json'), 'utf8'));
verify(manifest.name === 'Focus-LYT', 'Unexpected theme name.');
verify(/^\d+\.\d+\.\d+$/.test(manifest.version), 'Invalid release version.');
verify(manifest.minAppVersion === '1.8.10', 'Minimum Obsidian version changed; update compatibility tests explicitly.');
const versions = JSON.parse(await readFile(path.join(themeDirectory, 'versions.json'), 'utf8'));
const packageJson = JSON.parse(await readFile(path.join(themeDirectory, 'package.json'), 'utf8'));
verify(versions[manifest.version] === manifest.minAppVersion, 'versions.json must map the current theme version to its minimum app version.');
verify(packageJson.version === manifest.version, 'package.json and manifest.json versions must match.');
for (const name of ['LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.md', 'docs/GUIDE.de.md', 'licenses/DM-Sans-OFL.txt', 'licenses/DM-Mono-OFL.txt']) {
  verify((await readFile(path.join(themeDirectory, name), 'utf8')).trim().length > 0, `Missing or empty release file: ${name}`);
}
for (const name of await readdir(path.join(themeDirectory, 'licenses'))) {
  const notice = await readFile(path.join(themeDirectory, 'licenses', name), 'utf8');
  verify(notice.includes('SIL OPEN FONT LICENSE Version 1.1'), `Invalid font notice: ${name}`);
  verify(css.includes(notice.trim()), `Font notice must be bundled in theme.css: ${name}`);
}
verify(css.includes((await readFile(path.join(themeDirectory, 'LICENSE'), 'utf8')).trim()), 'MIT notice must be bundled in theme.css.');
if (errors.length) {
  console.error(errors.map(error => `FAIL: ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: reproducible CSS, ${settings.length} valid settings, six opt-in accessible controls, eight embedded fonts, manifest and notices.`);
}
