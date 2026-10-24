import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { launchObsidian, versions, hideOptions, setMode } from './helpers/obsidian.mjs';

const pinCommand = 'obsidian-style-settings:style-settings-class-toggle-lyt-prism-lyt-prism-pin-bars';
const preferences = Object.fromEntries(hideOptions.map(option => [`lyt-prism@@lyt-prism-autohide-${option}`, ['tabs', 'status', 'ribbon'].includes(option)]));
const xdo = (...args) => execFileSync('xdotool', args.map(String), { encoding: 'utf8' }).trim();

function nativeWindow(session) {
  const ids = xdo('search', '--onlyvisible', '--pid', session.child.pid).split(/\s+/);
  const id = ids.find(id => /WIDTH=(\d+)/.exec(xdo('getwindowgeometry', '--shell', id))?.[1] > 400);
  if (!id) throw new Error('No visible Obsidian X11 window');
  xdo('windowactivate', '--sync', id);
  return id;
}
const move = (id, x, y) => xdo('mousemove', '--sync', '--window', id, Math.round(x), Math.round(y));
const position = id => Object.fromEntries(xdo('getwindowgeometry', '--shell', id).split('\n').map(line => line.split('=')));

async function geometry(page) {
  return page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const header = document.querySelector('.mod-root .workspace-tabs.mod-top > .workspace-tab-header-container');
    const buttons = [...document.querySelectorAll('.titlebar-button-container.mod-right .titlebar-button')].map(el => {
      const box = rect(el), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { className: el.className, box, hit: hit?.closest('.titlebar-button') === el };
    });
    const inner = getComputedStyle(header.querySelector('.workspace-tab-header-container-inner'));
    return { classes: document.body.className, header: rect(header), note: rect(document.querySelector('.mod-root .workspace-tab-container')), buttons, background: getComputedStyle(header).backgroundColor, buttonBackground: getComputedStyle(document.querySelector('.titlebar-button-container.mod-right')).backgroundColor, region: getComputedStyle(header).webkitAppRegion, tabTransform: inner.transform, tabTransition: inner.transitionDuration, headerTransition: getComputedStyle(header).transitionDuration };
  });
}

for (const version of versions) for (const mode of ['dark', 'light']) test(`frameless chrome ${version} ${mode}: real pointer, stable window controls and quick pin`, async () => {
  const session = await launchObsidian(version, 'window-chrome', {
    frame: 'hidden',
    appearance: { showViewHeader: false, showRibbon: false, baseFontSize: 18 },
    styleSettings: preferences,
    hotkeys: { [pinCommand]: [{ modifiers: ['Mod', 'Alt'], key: 'P' }] },
  });
  const { page } = session;
  const records = [];
  try {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await setMode(page, mode);
    await page.evaluate(() => app.workspace.rightSplit.collapse());
    await expect(page.locator('body')).toHaveClass(/is-hidden-frameless/);
    const id = nativeWindow(session);
    const tabs = page.locator('.mod-root .workspace-tabs.mod-top > .workspace-tab-header-container').first();
    for (const width of [1440, 1000]) {
      xdo('windowsize', '--sync', id, width, 1000);
      xdo('windowmove', '--sync', id, 30, 30);
      await expect.poll(() => page.locator('.mod-root').evaluate(el => el.getBoundingClientRect().right)).toBe(width);
      move(id, width * .6, 600);
      await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
      await expect.poll(() => page.locator('.titlebar-button-container.mod-right').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
      const hidden = await geometry(page);
      expect(hidden.tabTransform).toBe('none');
      expect(hidden.tabTransition).toBe('0s');
      expect(hidden.headerTransition).toBe('0.16s, 0s');
      expect(hidden.region).toBe('no-drag');
      expect(hidden.buttons).toHaveLength(3);
      for (const button of hidden.buttons) {
        expect(button.box.width).toBeGreaterThanOrEqual(40);
        expect(button.box.height).toBeGreaterThanOrEqual(30);
        expect(button.box.bottom).toBeLessThanOrEqual(hidden.header.bottom);
        expect(button.hit, `Hidden native ${button.className} must pass input to the note`).toBe(false);
      }
      expect(hidden.note.y, 'Closed shelf must reserve no empty bar').toBeLessThanOrEqual(8);
      expect(hidden.background).toBe(hidden.buttonBackground);
      await page.screenshot({ path: path.join(session.output, `chrome-${mode}-${width}-hidden.png`) });
      // Real X11 movements, not CDP mouse events: Electron drag regions can
      // swallow native hover even when a synthetic browser test passes.
      const left = await tabs.evaluate(el => el.getBoundingClientRect().left);
      for (const x of [left + 24, width * .45, width - 200, width - 22]) {
        move(id, x, 6);
        if (x === left + 24) {
          const samples = await page.evaluate(() => new Promise(resolve => {
            const values = [], start = performance.now();
            const sample = () => {
              const h = document.querySelector('.mod-root .workspace-tab-header-container');
              values.push({ t: performance.now() - start, opacity: +getComputedStyle(h).opacity, noteY: document.querySelector('.mod-root .workspace-tab-container').getBoundingClientRect().y, buttonsOpacity: +getComputedStyle(document.querySelector('.titlebar-button-container.mod-right')).opacity, headerTransition: getComputedStyle(h).transition, buttonTransition: getComputedStyle(document.querySelector('.titlebar-button-container.mod-right')).transition });
              if (performance.now() - start < 420) requestAnimationFrame(sample); else resolve(values);
            };
            requestAnimationFrame(sample);
          }));
          records.push({ width, revealFrames: samples });
          expect(samples.every(sample => Math.abs(sample.opacity - sample.buttonsOpacity) < .03), 'Tabs and native buttons must fade together').toBe(true);
          expect(samples.some(sample => sample.opacity > 0 && sample.opacity < 1), 'Reveal must actually fade rather than flash').toBe(true);
          expect(samples.every(sample => sample.noteY === hidden.note.y), 'The note must stay still throughout the reveal').toBe(true);
        }
        try {
          await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity), { message: `Real top-edge pointer at ${x} must reveal tabs` }).toBe('1');
        } catch (error) {
          records.push({ failedAt: x, nativePointer: xdo('getmouselocation', '--shell'), nativeWindow: xdo('getwindowgeometry', '--shell', id), probe: await page.evaluate(x => {
            const header = document.querySelector('.mod-root .workspace-tab-header-container'), el = document.elementFromPoint(x, 6), pseudo = getComputedStyle(header, '::after');
            return { hit: el?.className, hover: header.matches(':hover'), pseudo: { width: pseudo.width, height: pseudo.height, left: pseudo.left, right: pseudo.right, region: pseudo.webkitAppRegion, z: pseudo.zIndex } };
          }, x) });
          await page.screenshot({ path: path.join(session.output, `chrome-${mode}-pointer-failure.png`) });
          throw error;
        }
        const shown = await geometry(page);
        expect(shown.tabTransform).toBe('none');
        expect(shown.tabTransition).toBe('0s');
        expect(shown.headerTransition).toBe('0.16s, 0s');
        expect(shown.note.y, 'Hover must not move the editor').toBe(hidden.note.y);
        expect(shown.header.height).toBe(hidden.header.height);
        expect(shown.buttons.map(button => button.box)).toEqual(hidden.buttons.map(button => button.box));
        for (const button of shown.buttons) expect(button.hit, 'Revealed window control must be clickable').toBe(true);
        records.push({ width, x, hidden, shown, nativePointer: xdo('getmouselocation', '--shell') });
        if (x === width * .45) await page.screenshot({ path: path.join(session.output, `chrome-${mode}-${width}-hover.png`) });
        move(id, width * .6, 600);
        await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
        await expect.poll(() => page.locator('.titlebar-button-container.mod-right').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
      }
      xdo('key', '--clearmodifiers', 'ctrl+alt+p');
      await expect(page.locator('body')).toHaveClass(/lyt-prism-pin-bars/);
      await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      const pinned = await geometry(page);
      expect(pinned.note.y, 'Pinning restores a normal reserved toolbar').toBeGreaterThanOrEqual(pinned.header.bottom);
      expect(pinned.buttons.map(button => button.box)).toEqual(hidden.buttons.map(button => button.box));
      await page.screenshot({ path: path.join(session.output, `chrome-${mode}-${width}-pinned.png`) });
      const savedPath = path.join(session.vault, '.obsidian/plugins/obsidian-style-settings/data.json');
      await expect.poll(async () => JSON.parse(await readFile(savedPath, 'utf8'))['lyt-prism@@lyt-prism-pin-bars']).toBe(true);
      const saved = JSON.parse(await readFile(savedPath, 'utf8'));
      for (const [key, value] of Object.entries(preferences)) expect(saved[key]).toBe(value);
      const disabledSheets = await page.evaluate(() => { let count = 0; for (const sheet of document.styleSheets) if (sheet.ownerNode?.textContent?.includes('Source: src/00-settings.css')) { sheet.disabled = true; count++; } return count; });
      expect(disabledSheets, 'The native drag baseline must actually disable the theme').toBeGreaterThan(0);
      const baselineBefore = position(id);
      // Use separate blank titlebar points for the two gestures. Repeating
      // the same point rapidly is a native double-click (maximize), not drag.
      move(id, width * .7, 36);
      xdo('mousedown', '1', 'sleep', '0.15');
      try { xdo('mousemove_relative', '--sync', '30', '20', 'sleep', '0.15'); }
      finally { xdo('mouseup', '1'); }
      const baselineAfter = position(id);
      records.push({ width, disabledSheets, nativeBaselineDrag: { before: baselineBefore, after: baselineAfter } });
      await page.evaluate(() => { for (const sheet of document.styleSheets) if (sheet.ownerNode?.textContent?.includes('Source: src/00-settings.css')) sheet.disabled = false; });
      move(id, width * .6, 600);
      xdo('key', '--clearmodifiers', 'ctrl+alt+p');
      await expect(page.locator('body')).not.toHaveClass(/lyt-prism-pin-bars/);
      await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
      await expect.poll(async () => JSON.parse(await readFile(savedPath, 'utf8'))['lyt-prism@@lyt-prism-pin-bars']).toBe(false);
      // The hover strip must not sacrifice the native drag area below it.
      const beforeDrag = position(id);
      move(id, width * .6, 6);
      await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      move(id, width * .6, 36);
      const dragProbe = await page.evaluate(x => {
        const el = document.elementFromPoint(x, 36), h = document.querySelector('.mod-root .workspace-tab-header-container');
        return { hit: el?.className, region: getComputedStyle(el).webkitAppRegion, parentRegion: getComputedStyle(h).webkitAppRegion, triggerHeight: getComputedStyle(h, '::after').height };
      }, width * .6);
      // Give Electron time to start the native move gesture before moving
      // and releasing, as a physical mouse press would.
      xdo('mousedown', '1', 'sleep', '0.15');
      try { xdo('mousemove_relative', '--sync', '30', '20', 'sleep', '0.15'); }
      finally { xdo('mouseup', '1'); }
      records.push({ width, dragProbe, nativeDrag: { before: beforeDrag, after: position(id) } });
      expect(position(id).WIDTH, 'Dragging must not maximize the window').toBe(beforeDrag.WIDTH);
      expect(position(id).HEIGHT).toBe(beforeDrag.HEIGHT);
      if (baselineAfter.X !== baselineBefore.X || baselineAfter.Y !== baselineBefore.Y) {
        await expect.poll(() => Number(position(id).X)).toBe(Number(beforeDrag.X) + 30);
        await expect.poll(() => Number(position(id).Y)).toBe(Number(beforeDrag.Y) + 20);
      } else {
        // This X11 environment does not complete a native Electron drag even
        // with the theme disabled. Check that the real blank drag target is
        // retained and report this capability limit explicitly.
        expect(dragProbe.region).toBe('drag');
        records.push({ width, limitation: 'Native window dragging could not be verified: the no-theme baseline also did not move.' });
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(value => parseFloat(value) === 0))).toBe(true);
    records.push({ reducedMotion: true, tabTransition: await tabs.evaluate(el => getComputedStyle(el).transitionDuration) });
    // Exercise the real close target, rather than assuming a rectangle means
    // that Electron still receives the click.
    move(id, 450, 6);
    await expect.poll(() => tabs.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    const closeBox = await page.locator('.titlebar-button-container.mod-right .titlebar-button.mod-close').boundingBox();
    move(id, closeBox.x + closeBox.width / 2, closeBox.y + closeBox.height / 2);
    const closed = page.waitForEvent('close');
    xdo('click', '1');
    await closed;
    records.push({ nativeCloseClicked: true });
  } finally {
    await writeFile(path.join(session.output, `chrome-${mode}-geometry.json`), JSON.stringify(records, null, 2));
    await session.close();
  }
});
