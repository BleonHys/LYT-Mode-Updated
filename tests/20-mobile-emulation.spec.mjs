import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readAsarFile } from './helpers/asar.mjs';
import { root, artifacts, hideOptions } from './helpers/obsidian.mjs';

const article = `<div class="markdown-preview-view markdown-rendered is-readable-line-width"><div class="markdown-preview-sizer markdown-preview-section"><div class="mod-header"><div class="inline-title" contenteditable="true">Prism on the go</div></div><h1>Connected ideas</h1><p>A <strong>bold thought</strong>, an <em>italic connection</em> and a <a class="internal-link">link</a> keep their colors on smaller screens. <a class="tag">#prism</a></p><h2>Room for a thought</h2><div class="callout" data-callout="note"><div class="callout-title"><div class="callout-title-inner">A clear idea</div></div><div class="callout-content"><p>Reading stays comfortable at a larger text size.</p></div></div><ul><li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox"> A touch-friendly task</li></ul><p>Knowledge grows through useful connections, quiet reflection and deliberate practice.</p><table><thead><tr><th>Idea</th><th>Connection</th></tr></thead><tbody><tr><td>Prism</td><td>Color</td></tr></tbody></table></div></div>`;
const icon = shape => `<svg class="svg-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
const menuIcon = icon('<path d="M4 6h16M4 12h16M4 18h16"/>');
const searchIcon = icon('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>');
const tabsIcon = icon('<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 1h8"/>');
const moreIcon = icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>');
const closeIcon = icon('<path d="m6 6 12 12M18 6 6 18"/>');

function fixture(device, mode) {
  const tabletTabs = device === 'tablet' ? `<div class="workspace-tab-header-container"><div class="workspace-tab-header-container-inner"><div class="workspace-tab-header is-active"><div class="workspace-tab-header-inner" tabindex="0"><div class="workspace-tab-header-inner-title">Prism on the go</div></div></div></div></div>` : '';
  const tabletRibbon = device === 'tablet' ? `<div class="workspace-drawer-ribbon"><div class="side-dock-actions"><button class="clickable-icon side-dock-ribbon-action" aria-label="Drawer tools">${menuIcon}</button></div></div>` : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body class="theme-${mode} is-mobile is-${device} mod-linux show-view-header show-inline-title">
<div class="app-container"><div class="horizontal-main-container">
  <div class="workspace"><div class="workspace-split mod-root mod-vertical" style="flex:1 1 0;min-width:0">
    <div class="workspace-tabs mod-visible">
      ${tabletTabs}
      <div class="workspace-tab-container"><div class="workspace-leaf mod-active" style="height:100%;width:100%"><div class="workspace-leaf-content is-read-mode" data-type="markdown">
        <div class="view-header"><div class="view-header-left"><button class="clickable-icon view-action" aria-label="Open sidebar" data-action="open-drawer">${menuIcon}</button></div><div class="view-header-title-container"><div class="view-header-title">Prism on the go</div></div><div class="view-actions"><button class="clickable-icon view-action" aria-label="Note action">${moreIcon}</button></div></div>
        <div class="view-content"><div class="markdown-reading-view" style="width:100%;height:100%">${article}</div></div>
      </div></div></div>
    </div>
  </div></div>
</div><div class="mobile-navbar"><div class="mobile-navbar-actions">
  <div class="mobile-navbar-action"><button class="clickable-icon" aria-label="Mobile navigation" data-action="open-drawer">${menuIcon}</button></div>
  <div class="mobile-navbar-action"><button class="clickable-icon" aria-label="Search notes">${searchIcon}</button></div>
  <div class="mobile-navbar-action mobile-navbar-action-tabs"><button class="clickable-icon" aria-label="Open tabs">${tabsIcon}</button></div>
  <div class="mobile-navbar-action"><button class="clickable-icon" aria-label="More actions">${moreIcon}</button></div>
</div></div></div>
<div class="workspace-drawer-backdrop" style="display:none" data-action="close-drawer"></div>
<div class="workspace-drawer mod-primary is-collapsed" style="display:none"><div class="workspace-drawer-inner">
  <div class="workspace-drawer-header"><div class="workspace-drawer-header-left"><div class="workspace-drawer-header-name"><div class="workspace-drawer-header-name-text">Prism Lab</div></div><div class="workspace-drawer-header-info">A connected workspace</div></div><button class="clickable-icon workspace-drawer-header-icon" aria-label="Close drawer" data-action="close-drawer">${closeIcon}</button></div>
  <div class="workspace-drawer-active-tab-container" style="flex:1 1 0;min-height:0"><div class="workspace-drawer-active-tab-content"><div class="workspace-leaf-content" data-type="file-explorer">
    <div class="nav-header"><div class="nav-buttons-container"><button class="clickable-icon nav-action-button" aria-label="Find note">${searchIcon}</button></div></div>
    <div class="nav-files-container"><div class="nav-file"><div class="nav-file-title"><div class="nav-file-title-content">Connections</div></div></div><div class="nav-file"><div class="nav-file-title is-active"><div class="nav-file-title-content">Prism on the go</div></div></div></div>
  </div></div></div>
</div>${tabletRibbon}</div></body></html>`;
}

for (const device of ['phone', 'tablet']) for (const mode of ['dark', 'light']) {
  test(`emulated ${device} ${mode}: touch, larger type, synced auto-hide and drawer`, async ({ browser }) => {
    const width = device === 'phone' ? 390 : 768;
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const output = path.join(artifacts, 'mobile-emulation');
    await mkdir(output, { recursive: true });
    try {
      const base = await readAsarFile(path.join(process.env.OBSIDIAN_ROOT || '/opt/obsidian', 'obsidian-1.14.4/resources/obsidian.asar'), 'app.css');
      await page.setContent(fixture(device, mode));
      await page.addStyleTag({ content: base });
      await page.addStyleTag({ content: await readFile(path.join(root, 'theme.css'), 'utf8') });
      // Obsidian's mobile controller normally supplies these layout and drawer
      // states. Reproduce only that state here; all visual CSS is app + theme.
      await page.evaluate(() => {
        document.addEventListener('click', event => {
          const action = event.target.closest('[data-action]')?.dataset.action;
          if (!action) return;
          const open = action === 'open-drawer';
          const drawer = document.querySelector('.workspace-drawer');
          drawer.classList.toggle('is-collapsed', !open);
          drawer.style.display = open ? 'flex' : 'none';
          document.querySelector('.workspace-drawer-backdrop').style.display = open ? 'block' : 'none';
        });
      });
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await expect(page.locator('.inline-title')).toBeVisible();
      expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
      const chromeSelectors = ['.nav-header', '.workspace-drawer-header', '.view-header', '.mobile-navbar', ...(device === 'tablet' ? ['.workspace-tab-header-container'] : [])];
      const metrics = () => page.evaluate(selectors => selectors.map(selector => { const style = getComputedStyle(document.querySelector(selector)); return { selector, opacity: style.opacity, display: style.display, height: style.height, width: style.width }; }), chromeSelectors);
      const before = await metrics();
      await page.evaluate(options => document.body.classList.add(...options.map(o => `lyt-prism-autohide-${o}`)), hideOptions);
      const synced = await metrics();
      expect(synced, 'Synced desktop settings must not change native mobile chrome').toEqual(before);
      await page.evaluate(() => document.body.classList.add('lyt-prism-pin-bars'));
      const pinned = await metrics();
      expect(pinned, 'Pinning must preserve native touch controls').toEqual(before);
      const layout = () => page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, noteWidth: document.querySelector('.view-content').getBoundingClientRect().width, paneWidth: document.querySelector('.workspace-split.mod-root').getBoundingClientRect().width, viewport: innerWidth, drawerVisible: getComputedStyle(document.querySelector('.workspace-drawer')).display !== 'none' }));
      const assertClosedLayout = async () => {
        const value = await layout();
        expect(value.drawerVisible).toBe(false);
        expect(value.documentWidth).toBeLessThanOrEqual(width);
        expect(value.noteWidth, 'Closed mobile drawers must leave the editor the available viewport').toBeGreaterThanOrEqual(width * 0.9);
        expect(value.noteWidth, 'The editor must fit inside its pane without clipping').toBeLessThanOrEqual(value.paneWidth);
        return value;
      };
      const initialLayout = await assertClosedLayout();
      const action = page.getByRole('button', { name: device === 'phone' ? 'Mobile navigation' : 'Open sidebar', exact: true });
      await expect(action).toBeVisible();
      if (device === 'phone') {
        await expect(page.locator('.mobile-navbar-actions')).toBeVisible();
        const box = await action.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await action.tap();
      await expect(page.locator('.workspace-drawer')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Find note' })).toBeVisible();
      await page.getByRole('button', { name: 'Close drawer' }).tap();
      await expect(page.locator('.workspace-drawer')).toBeHidden();
      await page.evaluate(() => document.body.classList.remove('lyt-prism-pin-bars'));
      expect(await metrics(), 'Unpinning must keep mobile controls visible').toEqual(before);
      await page.locator('.task-list-item-checkbox').check();
      await expect(page.locator('.task-list-item-checkbox')).toBeChecked();
      await page.evaluate(() => { document.body.style.setProperty('--font-text-size', '16px'); document.body.style.setProperty('--preferred-text-scale', '1.5'); });
      await expect.poll(() => page.locator('.markdown-rendered p').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(24);
      const largeTextLayout = await assertClosedLayout();
      await expect(action).toBeVisible();
      await page.locator('.markdown-preview-view').evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: path.join(output, `${device}-${mode}-large-text.png`) });
      await page.evaluate(device => {
        document.body.classList.add(device === 'phone' ? 'lyt-prism-phone-full-drawer' : 'lyt-prism-tablet-cards');
      }, device);
      const cardsLayout = await assertClosedLayout();
      await action.tap();
      if (device === 'phone') expect(await page.locator('.workspace-drawer').evaluate(el => el.getBoundingClientRect().width)).toBe(width);
      else expect(await page.locator('.workspace-split.mod-root').evaluate(el => getComputedStyle(el).borderRadius)).toBe('14px');
      await expect(page.locator('.workspace-drawer .nav-file-title').first()).toBeInViewport();
      await expect(page.getByRole('button', { name: 'Find note' })).toBeInViewport();
      await page.screenshot({ path: path.join(output, `${device}-${mode}-drawer.png`) });
      await page.getByRole('button', { name: 'Close drawer' }).tap();
      await expect(page.locator('.workspace-drawer')).toBeHidden();
      await writeFile(path.join(output, `${device}-${mode}.json`), JSON.stringify({ mode, device, width, touch: true, baseFontSize: 16, preferredTextScale: 1.5, baseStyles: 'Obsidian 1.14.4 app.css', scope: 'CSS and DOM emulation only; not native Android/iOS or actual mobile Obsidian navigation', chromeBefore: before, chromeWithSyncedSettings: synced, chromeWithPinnedSettings: pinned, initialLayout, largeTextLayout, cardsLayout }, null, 2));
    } finally { await context.close(); }
  });
}
