import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const root = process.env.THEME_ROOT || process.cwd();
export const artifacts = process.env.ARTIFACT_ROOT || path.join(root, 'output/playwright');
export const versions = ['1.14.4', '1.8.10'];
export const hideOptions = ['tabs', 'status', 'ribbon', 'nav', 'header', 'vault'];
const fixture = `---\ntitle: Prism Test Note\nstatus: growing\nrating: 4\ntags:\n  - prism\n---\n\n# Prism Test Note\n\nA **bold thought**, an *italic connection*, an [external link](https://example.com) and [[Connections]] make a readable constellation. #prism\n\n## Working notes\n\n- [ ] An open task\n- [x] A finished task\n\n> [!note] A clear idea\n> Callout text stays readable in both palettes.\n\n| Topic | Connection |\n| --- | --- |\n| Light | Color |\n| Knowledge | Practice |\n\n\`\`\`js\nconst prism = 'ideas';\nconsole.log(prism);\n\`\`\`\n\nSearchable constellation needle.\n`;
async function json(file, value) { await writeFile(file, JSON.stringify(value, null, 2)); }

export async function launchObsidian(version, label = 'desktop', options = {}) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'lyt-prism-'));
  const vault = path.join(base, options.vaultName || 'Prism Lab');
  const profile = path.join(base, 'profile');
  const config = path.join(vault, '.obsidian');
  const output = path.join(artifacts, version);
  await Promise.all([mkdir(config, { recursive: true }), mkdir(profile), mkdir(output, { recursive: true })]);
  await json(path.join(profile, 'obsidian.json'), { vaults: { '1234567890abcdef': { path: vault, ts: Date.now(), open: true } }, updateDisabled: true, ...(options.frame ? { frame: options.frame } : {}) });
  await json(path.join(config, 'app.json'), { showInlineTitle: true, livePreview: true, defaultViewMode: 'preview', readableLineLength: true, showLineNumber: true, propertiesInDocument: 'visible' });
  await json(path.join(config, 'appearance.json'), { cssTheme: 'Focus-LYT', theme: 'obsidian', baseFontSize: 16, interfaceFontFamily: '', textFontFamily: '', ...options.appearance });
  await json(path.join(config, 'community-plugins.json'), ['obsidian-style-settings', ...(options.controls ? ['focus-lyt-controls'] : [])]);
  await json(path.join(config, 'core-plugins.json'), ['file-explorer', 'global-search', 'switcher', 'backlink', 'outgoing-link', 'tag-pane', 'properties', 'page-preview', 'command-palette', 'editor-status', 'bookmarks', 'outline', 'word-count', 'canvas', 'bases']);
  await mkdir(path.join(config, 'plugins/obsidian-style-settings'), { recursive: true });
  for (const file of ['main.js', 'manifest.json', 'styles.css']) {
    await copyFile(path.join(process.env.STYLE_SETTINGS_ROOT || '/opt/style-settings', file), path.join(config, 'plugins/obsidian-style-settings', file));
  }
  if (options.controls) {
    await mkdir(path.join(config, 'plugins/focus-lyt-controls'), { recursive: true });
    for (const file of ['main.js', 'manifest.json', 'styles.css']) await copyFile(path.join(root, 'focus-lyt-controls', file), path.join(config, 'plugins/focus-lyt-controls', file));
  }
  if (options.styleSettings) await json(path.join(config, 'plugins/obsidian-style-settings/data.json'), options.styleSettings);
  if (options.hotkeys) await json(path.join(config, 'hotkeys.json'), options.hotkeys);
  await mkdir(path.join(config, 'themes/Focus-LYT'), { recursive: true });
  for (const file of ['theme.css', 'manifest.json']) await copyFile(path.join(root, file), path.join(config, 'themes/Focus-LYT', file));
  await writeFile(path.join(vault, 'Prism Test Note.md'), fixture);
  await writeFile(path.join(vault, 'Connections.md'), '# Connections\n\nA connected note for [[Prism Test Note]].');
  await writeFile(path.join(vault, 'Prism.canvas'), JSON.stringify({ nodes: [{ id: 'note', type: 'text', text: '# Canvas thought\nConnected ideas.', x: 0, y: 0, width: 320, height: 220 }], edges: [] }));
  await writeFile(path.join(vault, 'Prism.base'), 'views:\n  - type: table\n    name: Notes\n    order:\n      - file.name\n');
  try { await cp(path.join(root, 'examples/vault'), vault, { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await json(path.join(config, 'workspace.json'), {
    main: { id: 'main', type: 'split', children: [{ id: 'main-tabs', type: 'tabs', children: [{ id: 'main-leaf', type: 'leaf', state: { type: 'markdown', state: { file: 'Prism Test Note.md', mode: 'preview', source: false } } }] }], direction: 'vertical' },
    left: { id: 'left', type: 'split', children: [{ id: 'left-tabs', type: 'tabs', children: [{ id: 'files', type: 'leaf', state: { type: 'file-explorer', state: {} } }, { id: 'search', type: 'leaf', state: { type: 'search', state: { query: '', matchingCase: false, explainSearch: false, collapseAll: false, extraContext: false, sortOrder: 'alphabetical' } } }] }], direction: 'horizontal', width: 280 },
    right: { id: 'right', type: 'split', children: [{ id: 'right-tabs', type: 'tabs', children: [{ id: 'outline', type: 'leaf', state: { type: 'outline', state: {} } }] }], direction: 'horizontal', width: 240 },
    active: 'main-leaf', lastOpenFiles: ['Connections.md', 'Prism Test Note.md']
  });
  const log = createWriteStream(path.join(output, `${label}-process.log`));
  const executable = path.join(process.env.OBSIDIAN_ROOT || '/opt/obsidian', `obsidian-${version}`, 'obsidian');
  const child = spawn(executable, ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=9222', `--user-data-dir=${profile}`], { env: { ...process.env, XDG_CONFIG_HOME: path.join(base, 'xdg'), ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  let browser;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Obsidian exited: ${child.exitCode}`);
      try { browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 1000, noDefaults: true }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!browser) throw new Error('CDP endpoint did not become available');
    const context = browser.contexts()[0];
    let page;
    for (let attempt = 0; attempt < 120; attempt++) {
      for (const candidate of context.pages()) {
        const trust = candidate.getByRole('button', { name: /trust.*author|trust.*vault|trust and enable/i });
        if (await trust.count()) await trust.first().click();
        if (await candidate.evaluate(() => Boolean(globalThis.app?.workspace)).catch(() => false)) { page = candidate; break; }
      }
      if (page) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!page) {
      for (const [index, candidate] of context.pages().entries()) {
        await candidate.screenshot({ path: path.join(output, `${label}-startup-${index}.png`) });
        await writeFile(path.join(output, `${label}-startup-${index}.html`), await candidate.content());
      }
      throw new Error('Vault renderer did not become ready');
    }
    page.setDefaultTimeout(15_000);
    await page.waitForSelector('.workspace');
    const trust = page.getByRole('button', { name: /trust author and enable plugins/i });
    if (await trust.count()) await trust.click();
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15_000 });
    await page.waitForFunction(() => getComputedStyle(document.body).getPropertyValue('--lyt-prism-card-radius').trim() !== '', null, { timeout: 15_000 });
    // Obsidian 1.8 opens Community plugins settings after first-run trust.
    await page.keyboard.press('Escape');
    const diagnostics = await page.evaluate(() => ({ userAgent: navigator.userAgent, theme: app.customCss.theme, plugin: Boolean(app.plugins.plugins['obsidian-style-settings']), pages: document.title }));
    await json(path.join(output, `${label}-environment.json`), { version, ...diagnostics });
    return { page, context, browser, vault, profile, output, base, child, async close() {
      await browser.close().catch(() => {});
      child.kill('SIGTERM');
      await new Promise(resolve => { if (child.exitCode !== null) resolve(); else { child.once('exit', resolve); setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 4000).unref(); } });
      log.end();
      await rm(base, { recursive: true, force: true });
    } };
  } catch (error) {
    for (const [index, candidate] of (browser?.contexts()[0]?.pages() || []).entries()) {
      await candidate.screenshot({ path: path.join(output, `${label}-error-${index}.png`) }).catch(() => {});
      await writeFile(path.join(output, `${label}-error-${index}.html`), await candidate.content().catch(() => '')).catch(() => {});
      await json(path.join(output, `${label}-error-${index}.json`), await candidate.evaluate(() => ({ theme: globalThis.app?.customCss?.theme, classes: document.body.className, styles: [...document.styleSheets].map(sheet => ({ href: sheet.href, length: sheet.ownerNode?.textContent?.length })) })).catch(() => ({}))).catch(() => {});
    }
    await browser?.close().catch(() => {}); child.kill('SIGKILL'); log.end(); throw error;
  }
}

export async function openNote(page, file = 'Prism Test Note.md', mode = 'preview', source = false) {
  await page.evaluate(async ({ file, mode, source }) => {
    const leaf = app.workspace.getLeavesOfType('markdown')[0] || app.workspace.getLeaf(false);
    await leaf.setViewState({ type: 'markdown', state: { file, mode, source }, active: true });
    app.workspace.setActiveLeaf(leaf, { focus: true });
  }, { file, mode, source });
  await page.waitForSelector(mode === 'preview' ? '.markdown-preview-view' : '.markdown-source-view.mod-cm6');
}

export async function setMode(page, mode) {
  await page.evaluate(mode => { app.changeTheme(mode === 'dark' ? 'obsidian' : 'moonstone'); }, mode);
  await page.waitForFunction(mode => document.body.classList.contains(`theme-${mode}`), mode);
}
