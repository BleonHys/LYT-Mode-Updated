import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchObsidian, versions, openNote, setMode, hideOptions } from './helpers/obsidian.mjs';

const targets = {
  tabs: '.mod-root .workspace-tabs:not(.mod-stacked) > .workspace-tab-header-container',
  status: '.status-bar', ribbon: '.workspace-ribbon:is(.mod-left,.mod-primary)',
  nav: '.mod-left-split .nav-header', header: '.mod-root .workspace-leaf-content[data-type="markdown"] > .view-header',
  vault: '.workspace-sidedock-vault-profile'
};
const controls = 'button:visible, input:visible, [tabindex]:visible';
const cssNumber = (locator, property) => locator.evaluate((el, property) => parseFloat(getComputedStyle(el)[property]), property);
function contrast(a, b) {
  const l = rgb => rgb.slice(0, 3).map(x => { const v = x / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  return (Math.max(l(a), l(b)) + .05) / (Math.min(l(a), l(b)) + .05);
}

for (const version of versions) test.describe(`Desktop Obsidian ${version}`, () => {
  let session;
  test.beforeEach(async () => {
    session = await launchObsidian(version, 'functional');
    await session.page.setViewportSize({ width: 1440, height: 1000 });
    await session.page.evaluate(() => { document.body.classList.remove(...[...document.body.classList].filter(c => c.startsWith('lyt-prism-'))); document.body.style.removeProperty('--font-text-size'); });
    await openNote(session.page);
    await setMode(session.page, 'dark');
  });
  test.afterEach(async ({}, info) => {
    if (info.status !== info.expectedStatus && session) {
      await session.page.screenshot({ path: info.outputPath('real-app-failure.png') }).catch(() => {});
      await writeFile(info.outputPath('real-app-dom.html'), await session.page.content().catch(() => 'closed'));
    }
    await session?.close();
    session = null;
  });

  test('dark/light reading, semantic colors, properties, tasks, callouts and tables', async () => {
    const { page } = session;
    for (const mode of ['dark', 'light']) {
      await setMode(page, mode);
      const view = page.locator('.markdown-preview-view').first();
      await expect(view.locator('.callout')).toContainText('A clear idea');
      await expect(view.locator('table')).toContainText('Knowledge');
      await expect(view.locator('input.task-list-item-checkbox')).toHaveCount(2);
      await expect(view.locator('.metadata-container')).toContainText('growing');
      const colors = await view.evaluate(el => {
        const bg = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number);
        return ['p', 'strong', 'em', 'a.external-link', 'a.tag'].map(selector => ({ selector, color: getComputedStyle(el.querySelector(selector)).color.match(/[\d.]+/g).map(Number), bg }));
      });
      for (const color of colors) expect(contrast(color.color, color.bg), `${mode} ${color.selector} contrast`).toBeGreaterThanOrEqual(4.5);
      await writeFile(path.join(session.output, `contrast-${mode}.json`), JSON.stringify(colors.map(c => ({ ...c, ratio: contrast(c.color, c.bg) })), null, 2));
      await openNote(page, 'Prism Observatory.md');
      const tabDecoration = await page.locator('.mod-root .workspace-tab-header.is-active .workspace-tab-header-inner').first().evaluate(el => getComputedStyle(el, '::after').backgroundImage);
      expect(tabDecoration).not.toContain('linear-gradient');
      for (const [selector, pseudo] of [['.inline-title', '::before'], ['.callout', '::before'], ['.callout-title', '::after']]) {
        const content = await page.locator(selector).first().evaluate((el, pseudo) => getComputedStyle(el, pseudo).content, pseudo);
        expect(['none', 'normal']).toContain(content);
      }
      await page.screenshot({ path: path.join(session.output, `default-${mode}.png`) });
      await openNote(page);
    }
  });

  test('Live Preview, source mode, split panes and font-size isolation', async () => {
    const { page, context } = session;
    await openNote(page, 'Prism Test Note.md', 'source', false);
    await expect(page.locator('.markdown-source-view.is-live-preview')).toBeVisible();
    await page.locator('.cm-content').first().click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('\nA test edit.');
    await expect(page.locator('.cm-content').first()).toContainText('A test edit.');
    await openNote(page, 'Prism Test Note.md', 'source', true);
    await expect(page.locator('.markdown-source-view:not(.is-live-preview)')).toBeVisible();
    await page.evaluate(async () => { const leaf = app.workspace.getLeaf('split'); await leaf.openFile(app.vault.getAbstractFileByPath('Connections.md')); });
    await expect(page.locator('.mod-root .workspace-leaf-content[data-type="markdown"]')).toHaveCount(2);
    const panes = await page.locator('.mod-root .workspace-leaf-content[data-type="markdown"]').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height }; }));
    expect(panes.every(p => p.width > 200 && p.height > 200)).toBe(true);
    expect(panes[0].right <= panes[1].x + 1 || panes[1].right <= panes[0].x + 1 || panes[0].bottom <= panes[1].y + 1 || panes[1].bottom <= panes[0].y + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => app.commands.executeCommandById('switcher:open'));
    const mainSearch = page.locator('.prompt-input');
    await expect(mainSearch).toBeVisible();
    const original = await cssNumber(mainSearch, 'fontSize');
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.body.style.setProperty('--font-text-size', '26px'));
    await expect.poll(() => cssNumber(page.locator('.cm-content').first(), 'fontSize')).toBe(26);
    await page.evaluate(() => app.commands.executeCommandById('switcher:open'));
    expect(await cssNumber(mainSearch, 'fontSize')).toBe(original);
    await page.keyboard.press('Escape');
    const next = context.waitForEvent('page');
    await page.evaluate(async () => { const leaf = app.workspace.getLeaf('window'); await leaf.openFile(app.vault.getAbstractFileByPath('Prism Test Note.md')); });
    const popout = await next;
    await popout.waitForSelector('.workspace');
    await popout.evaluate(() => { document.body.style.setProperty('--font-text-size', '26px'); app.commands.executeCommandById('switcher:open'); });
    const popoutSearch = popout.locator('.prompt-input');
    await expect(popoutSearch).toBeVisible();
    expect(await cssNumber(popoutSearch, 'fontSize')).toBe(original);
    await popout.screenshot({ path: path.join(session.output, 'popout-search-font-regression.png') });
    await popout.keyboard.press('Escape');
    await popout.evaluate(() => window.close()).catch(() => {});
    await page.evaluate(() => { const leaves = app.workspace.getLeavesOfType('markdown').filter(leaf => leaf.view.containerEl.ownerDocument === document); for (const leaf of leaves.slice(1)) leaf.detach(); });
    await page.evaluate(() => app.commands.executeCommandById('global-search:open'));
    const search = page.locator('.workspace-leaf-content[data-type="search"] input[type="search"]');
    await search.fill('constellation');
    await expect(page.locator('.search-result-container.mod-global-search')).toContainText('Prism Test Note');
    expect(await cssNumber(search, 'fontSize')).toBeLessThan(20);
    await search.fill('');
  });

  test('six independent auto-hide controls reveal on pointer and focus; combined mode', async () => {
    const { page } = session;
    await page.evaluate(() => { app.workspace.leftSplit.expand(); app.workspace.rightSplit.expand(); });
    await page.locator('.workspace-tab-header[data-type="file-explorer"]').first().click();
    const observations = [];
    for (const [option, selector] of Object.entries(targets)) {
      const target = page.locator(selector).first();
      await expect(target).toBeVisible();
      expect(await cssNumber(target, 'opacity'), `default ${option}`).toBe(1);
      await page.mouse.move(900, 650);
      await page.evaluate(option => { document.activeElement?.blur(); document.body.classList.add(`lyt-prism-autohide-${option}`); }, option);
      const dimension = option === 'ribbon' ? 'width' : 'height';
      if (option === 'tabs') await expect.poll(() => cssNumber(target, 'opacity')).toBe(0);
      else await expect.poll(() => cssNumber(target, dimension), { message: `${option} collapses` }).toBeLessThanOrEqual(option === 'ribbon' ? 17 : 18);
      const box = await target.boundingBox();
      await page.mouse.move(box.x + Math.max(1, box.width / 2), box.y + (option === 'tabs' ? 3 : Math.max(1, box.height / 2)));
      await expect.poll(() => cssNumber(target, dimension), { message: `${option} expands on hover` }).toBeGreaterThan(18);
      if (option === 'tabs') await expect.poll(() => cssNumber(target, 'opacity')).toBe(1);
      await page.mouse.move(900, 650);
      // Focus a real Obsidian control; preserve its native tabindex and report it.
      const control = target.locator(controls).first();
      if (await control.count()) {
        const native = await control.evaluate(el => ({ tag: el.tagName, tabindex: el.getAttribute('tabindex') }));
        await control.focus();
        await expect.poll(() => cssNumber(target, dimension), { message: `${option} expands on focus` }).toBeGreaterThan(18);
        observations.push({ option, native, focusWithin: true });
      } else observations.push({ option, native: null, focusWithin: 'No native focusable control; pointer only' });
      await page.evaluate(option => { document.activeElement?.blur(); document.body.classList.remove(`lyt-prism-autohide-${option}`); }, option);
    }
    // Sidebar tabs are native, stable controls; only note tabs auto-hide.
    await page.evaluate(() => document.body.classList.add('lyt-prism-autohide-tabs'));
    await page.mouse.move(900, 650);
    const noteStrip = page.locator(targets.tabs).first();
    const sideStrip = page.locator('.mod-left-split .workspace-tab-header-container').first();
    const sideBox = await sideStrip.boundingBox();
    const tools = page.locator(targets.nav).first(), toolBox = await tools.boundingBox();
    for (const box of [sideBox, toolBox]) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect.poll(() => cssNumber(noteStrip, 'opacity')).toBe(0);
      expect(await sideStrip.boundingBox()).toEqual(sideBox);
      expect(await tools.boundingBox()).toEqual(toolBox);
      expect(await cssNumber(sideStrip, 'opacity')).toBe(1);
    }
    const noteBox = await noteStrip.boundingBox();
    await page.mouse.move(noteBox.x + 24, noteBox.y + 3);
    await expect.poll(() => cssNumber(noteStrip, 'opacity')).toBe(1);
    await page.screenshot({ path: path.join(session.output, 'border-hover-revealed.png') });
    await page.mouse.move(900, 650);
    await expect.poll(() => cssNumber(noteStrip, 'opacity')).toBe(0);
    await page.screenshot({ path: path.join(session.output, 'border-hover-hidden.png') });
    await page.evaluate(options => document.body.classList.add(...options.map(o => `lyt-prism-autohide-${o}`)), hideOptions);
    await page.mouse.move(900, 650);
    for (const [option, selector] of Object.entries(targets)) {
      const target = page.locator(selector).first();
      if (option === 'tabs') await expect.poll(() => cssNumber(target, 'opacity')).toBe(0);
      else await expect.poll(() => cssNumber(target, option === 'ribbon' ? 'width' : 'height')).toBeLessThanOrEqual(18);
    }
    // Actual keyboard route: inspect reachability, never mutate native tabindex.
    await page.evaluate(() => document.activeElement?.blur());
    const reached = new Set();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const hit = await page.evaluate(targets => Object.entries(targets).filter(([, sel]) => document.activeElement?.closest(sel)).map(([name]) => name), targets);
      for (const option of hit) {
        reached.add(option);
        await expect.poll(() => cssNumber(page.locator(targets[option]).first(), option === 'ribbon' ? 'width' : 'height'), { message: `${option} reveals through real Tab navigation` }).toBeGreaterThan(18);
      }
    }
    await writeFile(path.join(session.output, 'keyboard-reachability.json'), JSON.stringify({ observations, tabReached: [...reached], note: 'Focus-within tested only with real native controls; no tabindex was added. Obsidian controls may require commands or arrow navigation.' }, null, 2));
    expect(reached.size, 'Native Tab navigation must reach at least one hidden control').toBeGreaterThan(0);
    await page.screenshot({ path: path.join(session.output, 'combined-autohide.png') });
  });

  test('Canvas and current-version Bases remain rendered', async () => {
    const { page } = session;
    await page.evaluate(async () => { const leaf = app.workspace.getLeaf('tab'); await leaf.openFile(app.vault.getAbstractFileByPath('Prism.canvas')); });
    await expect(page.locator('.canvas-node')).toContainText('Canvas thought');
    await page.screenshot({ path: path.join(session.output, 'canvas.png') });
    if (version === '1.14.4') {
      await page.evaluate(async () => { const leaf = app.workspace.getLeaf('tab'); await leaf.openFile(app.vault.getAbstractFileByPath('Prism.base')); });
      await expect(page.locator('.workspace-leaf-content[data-type="bases"]')).toBeVisible();
      await expect(page.locator('.workspace-leaf-content[data-type="bases"]')).toContainText('Prism Test Note');
      await page.screenshot({ path: path.join(session.output, 'bases.png') });
    }
  });

  test('native Appearance settings preserve interface typography at larger editor size', async () => {
    const { page, context } = session;
    await page.evaluate(() => document.body.style.setProperty('--font-text-size', '26px'));
    await page.keyboard.press('Control+,');
    let settingsPage;
    await expect.poll(async () => {
      for (const candidate of context.pages()) {
        if (await candidate.locator('.vertical-tab-header').isVisible().catch(() => false)) { settingsPage = candidate; return true; }
      }
      return false;
    }, { message: 'Native settings window or modal opens' }).toBe(true);
    await settingsPage.getByText('Appearance', { exact: true }).first().click();
    await expect(settingsPage.locator('.vertical-tab-content')).toContainText('Font size');
    const names = settingsPage.locator('.vertical-tab-content .setting-item-name');
    expect(await names.count()).toBeGreaterThan(3);
    expect(await cssNumber(names.first(), 'fontSize')).toBeLessThanOrEqual(18);
    await settingsPage.screenshot({ path: path.join(session.output, 'native-appearance-settings.png') });
    if (settingsPage !== page) await settingsPage.evaluate(() => window.close()).catch(() => {});
    else await page.keyboard.press('Escape');
  });

  test('real Style Settings UI changes class and variable and persists to disk', async () => {
    const { page } = session;
    await page.evaluate(() => app.plugins.plugins['obsidian-style-settings'].activateView());
    const view = page.locator('.workspace-leaf-content[data-type="style-settings"]');
    await expect(view).toContainText('Focus-LYT');
    const heading = view.locator('.style-settings-heading').filter({ hasText: 'Focus-LYT' }).first();
    if (await heading.count()) await heading.click();
    await expect(view.locator('.style-settings-heading[data-id="lyt-prism-autohide"]')).toContainText('Ein- und Ausblenden');
    for (const option of hideOptions) await expect(view.locator(`.setting-item[data-id="lyt-prism-autohide-${option}"]`)).toBeVisible();
    const flat = view.locator('.setting-item').filter({ has: page.locator('.setting-item-name', { hasText: /^Flat workspace$/ }) });
    await flat.locator('.checkbox-container').click();
    await expect(page.locator('body')).toHaveClass(/lyt-prism-flat-layout/);
    const radius = view.locator('.setting-item').filter({ has: page.locator('.setting-item-name', { hasText: /^Card corner radius$/ }) }).locator('input[type="range"]');
    await radius.fill('21');
    await radius.dispatchEvent('input');
    await radius.dispatchEvent('change');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--lyt-prism-card-radius').trim())).toBe('21px');
    await view.locator('.style-settings-heading[data-id="lyt-prism-palette"]').click();
    const bodyColor = view.locator('.setting-item[data-id="lyt-prism-body-color"]');
    await bodyColor.locator('.theme-dark .pcr-button').click();
    const picker = page.locator('.pcr-app.visible');
    await picker.locator('.pcr-result').fill('#80D8E8');
    await picker.locator('.pcr-result').press('Enter');
    if (await picker.locator('.pcr-save').isVisible()) await picker.locator('.pcr-save').click();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--lyt-prism-body-color').trim().toLowerCase())).toMatch(/^#80d8e8(?:ff)?$/);
    await page.screenshot({ path: path.join(session.output, 'style-settings.png') });
    await openNote(page);
    await expect.poll(() => page.locator('.markdown-preview-view p').first().evaluate(el => getComputedStyle(el).color)).toBe('rgb(128, 216, 232)');
    const commands = await page.evaluate(() => Object.values(app.commands.commands).filter(command => command.id.includes('style-settings-class-toggle-lyt-prism-lyt-prism-autohide-')).map(command => ({ id: command.id, name: command.name })));
    expect(commands).toHaveLength(6);
    // Both transitions run through the native command palette keyboard path.
    for (const enabled of [true, false]) {
      await page.keyboard.press('Control+p');
      await page.locator('.prompt-input').fill('Linkes Ribbon automatisch ausblenden');
      await expect(page.locator('.suggestion-item').first()).toContainText('Linkes Ribbon automatisch ausblenden');
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => document.body.classList.contains('lyt-prism-autohide-ribbon'))).toBe(enabled);
      await page.mouse.move(900, 650);
      if (enabled) await expect.poll(() => cssNumber(page.locator(targets.ribbon).first(), 'width')).toBeLessThanOrEqual(17);
      else await expect.poll(() => cssNumber(page.locator(targets.ribbon).first(), 'width')).toBeGreaterThan(18);
    }
    for (const option of hideOptions.filter(option => option !== 'ribbon')) {
      const command = commands.find(command => command.id.endsWith(`lyt-prism-autohide-${option}`));
      expect(command).toBeTruthy();
      for (const enabled of [true, false]) {
        await page.evaluate(id => app.commands.executeCommandById(id), command.id);
        await expect.poll(() => page.evaluate(option => document.body.classList.contains(`lyt-prism-autohide-${option}`), option)).toBe(enabled);
      }
    }
    await writeFile(path.join(session.output, 'keyboard-recovery-commands.json'), JSON.stringify(commands, null, 2));
    const dataFile = path.join(session.vault, '.obsidian/plugins/obsidian-style-settings/data.json');
    await expect.poll(async () => JSON.parse(await readFile(dataFile, 'utf8'))['lyt-prism@@lyt-prism-flat-layout']).toBe(true);
    const saved = JSON.parse(await readFile(dataFile, 'utf8'));
    expect(saved['lyt-prism@@lyt-prism-card-radius']).toBe(21);
    await writeFile(path.join(session.output, 'style-settings-persisted.json'), JSON.stringify(saved, null, 2));
    await page.screenshot({ path: path.join(session.output, 'style-settings-applied.png') });
    // Re-load the actual plugin from its saved settings and verify reapplication.
    await page.evaluate(async () => { await app.plugins.disablePlugin('obsidian-style-settings'); await app.plugins.enablePlugin('obsidian-style-settings'); });
    await expect(page.locator('body')).toHaveClass(/lyt-prism-flat-layout/);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--lyt-prism-card-radius').trim())).toBe('21px');
    await session.close();
    session = await launchObsidian(version, 'settings-cold-start', { styleSettings: saved });
    await expect(session.page.locator('body')).toHaveClass(/lyt-prism-flat-layout/);
    await expect.poll(() => session.page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--lyt-prism-card-radius').trim())).toBe('21px');
    await expect.poll(() => session.page.locator('.markdown-preview-view p').first().evaluate(el => getComputedStyle(el).color)).toBe('rgb(128, 216, 232)');
  });
});
