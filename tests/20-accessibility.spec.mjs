import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchObsidian, versions, openNote, setMode } from './helpers/obsidian.mjs';

const calloutTypes = ['note', 'abstract', 'info', 'todo', 'tip', 'success', 'question', 'warning', 'failure', 'danger', 'bug', 'example', 'quote', 'cite'];
const taskNote = '# Alternate task states\n\n- [/] Working state\n- [-] Deferred state\n- [!] Important state\n- [?] Question state\n';
const readingNote = `# Contrast lab

Selection proof: **selected bold**, *selected italic*, [selected link](https://example.com), and #selectiontag.

==Highlighted body== and ==**Highlighted bold**== and ==*Highlighted italic*== and ==[Highlighted link](https://example.com)== and ==#highlighttag==.

\`\`\`js
const fontProbe = 'native monospace override';
\`\`\`

${calloutTypes.map(type => `> [!${type}] ${type} contrast
> Readable body inside the ${type} callout.
`).join('\n')}
`;
const editorNote = `# Editor contrast

Inactive prose with **bold words**, *italic words*, [a link](https://example.com), [[Connections]] and #prismcontrast.

Inactive ==highlighted words== remain readable.

\`\`\`js
// Syntax comment remains readable.
const answer = 'prism';
\`\`\`

Active caret line.
`;

/**
 * Compute rendered colors on actual DOM elements, including alpha backgrounds
 * and ancestor opacity groups. Canvas converts modern color(srgb ...) results
 * to sRGB. Unsupported background images/blending fail instead of pretending
 * that a flat theme token is the rendered background.
 */
async function renderedContrast(locator, { selection = false } = {}) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((element, { selection }) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = css => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].map(value => value / 255);
    };
    const over = (foreground, background, blend = 'normal') => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      if (!alpha) return [0, 0, 0, 0];
      return [0, 1, 2].map(index => {
        const source = foreground[index], backdrop = background[index];
        const blended = blend === 'lighten' ? Math.max(source, backdrop) : blend === 'darken' ? Math.min(source, backdrop) : source;
        return ((1 - foreground[3]) * background[3] * backdrop + (1 - background[3]) * foreground[3] * source + foreground[3] * background[3] * blended) / alpha;
      }).concat(alpha);
    };
    const style = getComputedStyle(element);
    const selected = selection ? getComputedStyle(element, '::selection') : null;
    const textColor = rgba(selected?.color || style.color);
    const selectedBackground = selection ? rgba(selected.backgroundColor) : null;
    if (selection && selectedBackground[3] === 0) throw new Error('Selected text has no inspectable selection background.');
    const layers = [];
    const ancestry = [];
    let node = element;
    while (node instanceof Element) {
      const computed = getComputedStyle(node);
      if (computed.backgroundImage !== 'none') {
        // Obsidian draws its external-link arrow in trailing padding, outside
        // the text. Exclude only that known asset after checking its geometry.
        const nativeArrow = /^linear-gradient\(rgba\(0, 0, 0, 0\), rgba\(0, 0, 0, 0\)\), url\("app:\/\/obsidian\.md\/public\/images\/[a-f\d]+\.svg"\)$/.test(computed.backgroundImage);
        const widths = computed.backgroundSize.split(',').map(size => /^([\d.]+)px(?: auto)?$/.exec(size.trim())).filter(Boolean).map(match => Number(match[1]));
        const imageWidth = Math.max(...widths);
        const textRange = document.createRange();
        textRange.selectNodeContents(node);
        const textBox = textRange.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        const outsideText = node.matches('a.external-link') && nativeArrow && computed.direction === 'ltr'
          && computed.backgroundRepeat.split(',').every(value => value.trim() === 'no-repeat')
          && computed.backgroundPositionX.split(',').every(value => ['100%', 'right'].includes(value.trim()))
          && widths.length === computed.backgroundSize.split(',').length
          && imageWidth <= parseFloat(computed.paddingInlineEnd)
          && node.getClientRects().length === 1 && textBox.right <= box.right - imageWidth + 0.5;
        if (!outsideText) throw new Error(`Contrast probe needs image sampling for ${node.className}: ${JSON.stringify({ image: computed.backgroundImage, size: computed.backgroundSize, repeat: computed.backgroundRepeat, position: computed.backgroundPositionX, padding: computed.paddingInlineEnd, textRight: textBox.right, right: box.right })}`);
        layers.push({ excludedDecoration: 'Native external-link arrow entirely inside trailing padding', width: imageWidth, padding: computed.paddingInlineEnd });
      }
      if (!['normal', 'lighten', 'darken'].includes(computed.mixBlendMode)) throw new Error(`Unsupported blend mode on ${node.className}: ${computed.mixBlendMode}`);
      const paint = rgba(computed.backgroundColor);
      const opacity = Number(computed.opacity);
      ancestry.unshift({ paint, opacity, blend: computed.mixBlendMode, isolated: computed.isolation === 'isolate' });
      if (paint[3] || opacity !== 1 || computed.mixBlendMode !== 'normal') layers.push({ tag: node.tagName, className: node.className, background: computed.backgroundColor, opacity, blend: computed.mixBlendMode });
      node = node.parentElement;
    }
    // Render from the real outer backdrop inward. Opacity/mix-blend-mode form
    // groups: flatten their contents first, then composite with the backdrop.
    // This models Obsidian's native dark/light callout blend modes without
    // treating translucent callout colors as opaque or ignoring blending.
    const render = (index, backdrop, glyph) => {
      if (index === ancestry.length) {
        const selectedSurface = selection ? over(selectedBackground, backdrop) : backdrop;
        return glyph ? over(textColor, selectedSurface) : selectedSurface;
      }
      const layer = ancestry[index];
      const content = surface => render(index + 1, over(layer.paint, surface), glyph);
      if (layer.opacity === 1 && layer.blend === 'normal' && !layer.isolated) return content(backdrop);
      const group = content([0, 0, 0, 0]);
      group[3] *= layer.opacity;
      return over(group, backdrop, layer.blend);
    };
    const foreground = render(0, [0, 0, 0, 0], true);
    const background = render(0, [0, 0, 0, 0], false);
    if (foreground[3] < .999 || background[3] < .999) throw new Error('Contrast probe did not find an opaque app surface.');
    const luminance = color => color.slice(0, 3).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    return { text: element.textContent.trim().slice(0, 100), color: selected?.color || style.color, foreground, background, layers, ratio: (values[1] + .05) / (values[0] + .05) };
  }, { selection });
}

async function assertContrast(locator, label, results, options) {
  await expect(locator, label).toBeVisible();
  const measured = await renderedContrast(locator, options);
  results.push({ label, ...measured });
  expect.soft(measured.ratio, `${label}: ${measured.ratio.toFixed(2)}:1 for ${JSON.stringify(measured.text)}`).toBeGreaterThanOrEqual(4.5);
}

for (const version of versions) test.describe(`Rendered accessibility Obsidian ${version}`, () => {
  let session;
  test.beforeAll(async () => {
    session = await launchObsidian(version, 'accessibility');
    await session.page.setViewportSize({ width: 1440, height: 1000 });
    await session.page.evaluate(async ({ readingNote, editorNote, taskNote }) => {
      await app.vault.create('Contrast Lab.md', readingNote);
      await app.vault.create('Contrast Editor.md', editorNote);
      await app.vault.create('Contrast Tasks.md', taskNote);
      app.workspace.leftSplit.expand();
    }, { readingNote, editorNote, taskNote });
  });
  test.afterAll(async () => { await session?.close(); });
  test.afterEach(async ({}, info) => {
    if (info.status !== info.expectedStatus && session) {
      await session.page.screenshot({ path: info.outputPath('accessibility-failure.png') }).catch(() => {});
    }
    await session?.page.evaluate(() => {
      document.body.classList.remove('lyt-prism-focus-mode', 'lyt-prism-reduce-motion');
      for (const name of ['text', 'interface', 'monospace']) document.body.style.removeProperty(`--font-${name}-override`);
      getSelection()?.removeAllRanges();
    }).catch(() => {});
  });

  for (const mode of ['dark', 'light']) {
    test(`${mode}: actual highlights, selected text, callouts and faint sidebar text`, async () => {
      const { page } = session;
      const results = [];
      await setMode(page, mode);
      await openNote(page, 'Contrast Lab.md');
      const view = page.locator('.markdown-preview-view').first();
      try {
        await expect(view).toContainText('Contrast lab');
        const highlights = view.locator('mark');
        await expect(highlights).toHaveCount(5);
        for (let index = 0; index < 5; index++) {
          const mark = highlights.nth(index);
          const child = mark.locator('strong, em, a').first();
          await assertContrast(await child.count() ? child : mark, `${mode} highlight ${index + 1}`, results);
        }
        for (const type of calloutTypes) {
          const callout = view.locator(`.callout[data-callout="${type}"]`);
          await assertContrast(callout.locator('.callout-title-inner'), `${mode} ${type} title`, results);
          await assertContrast(callout.locator('.callout-content p').first(), `${mode} ${type} body`, results);
        }

        await page.locator('.workspace-tab-header[data-type="file-explorer"]').first().click();
        // Canvas is a supported file type with an actual visible extension
        // label. Unsupported .txt entries are natively hidden by Obsidian.
        const fileTag = page.locator('.mod-left-split .nav-file-title[data-path="Prism.canvas"] .nav-file-tag');
        await assertContrast(fileTag, `${mode} real sidebar file-extension label`, results);

        // Long Reading views virtualize offscreen sections. Restore the real
        // scroller before looking up the first paragraph, rather than waiting
        // for an element Obsidian has intentionally unmounted.
        await view.evaluate(element => { element.scrollTop = 0; });
        const selectedParagraph = view.locator('p').filter({ hasText: /^Selection proof:/ }).first();
        await selectedParagraph.scrollIntoViewIfNeeded();
        await selectedParagraph.evaluate(element => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        });
        expect(await page.evaluate(() => getSelection().toString())).toContain('selected link');
        for (const selector of [null, 'strong', 'em', 'a.external-link', 'a.tag']) {
          const target = selector ? selectedParagraph.locator(selector) : selectedParagraph;
          await assertContrast(target, `${mode} selected ${selector || 'body'}`, results, { selection: true });
        }
      } finally {
        await writeFile(path.join(session.output, `rendered-contrast-${mode}.json`), JSON.stringify(results, null, 2));
      }
    });

    test(`${mode}: inactive focus prose and syntax remain readable`, async () => {
      const { page } = session;
      const results = [];
      await setMode(page, mode);
      await openNote(page, 'Contrast Editor.md', 'source', true);
      await page.evaluate(() => {
        document.body.classList.add('lyt-prism-focus-mode', 'lyt-prism-reduce-motion');
        const editor = app.workspace.getLeavesOfType('markdown')[0].view.editor;
        editor.setCursor({ line: editor.lastLine(), ch: 0 });
        editor.focus();
      });
      await page.mouse.move(30, 20);
      const editor = page.locator('.markdown-source-view.mod-cm6').first();
      const prose = editor.locator('.cm-line').filter({ hasText: /^Inactive prose/ }).first();
      await expect(prose).not.toHaveClass(/cm-active/);
      try {
        for (const [label, target] of [
          ['prose', prose],
          ['bold', prose.locator('.cm-strong:not(.cm-formatting)').first()],
          ['italic', prose.locator('.cm-em:not(.cm-formatting)').first()],
          ['link', prose.locator('.cm-link:not(.cm-formatting)').first()],
          ['internal link', prose.locator('.cm-hmd-internal-link:not(.cm-formatting)').first()],
          ['tag', prose.locator('.cm-hashtag').first()],
          ['highlight', editor.locator('.cm-highlight:not(.cm-formatting)').first()],
          ['syntax comment', editor.locator('.cm-comment').filter({ hasText: 'Syntax comment' }).first()],
          ['syntax keyword', editor.locator('.cm-keyword').filter({ hasText: 'const' }).first()]
        ]) await assertContrast(target, `${mode} inactive ${label}`, results);
      } finally {
        await writeFile(path.join(session.output, `focus-contrast-${mode}.json`), JSON.stringify(results, null, 2));
      }
    });
  }

  test('native user font override variables win over bundled theme fonts', async () => {
    const { page } = session;
    await openNote(page, 'Contrast Lab.md');
    await page.evaluate(() => {
      document.body.style.setProperty('--font-text-override', 'serif');
      document.body.style.setProperty('--font-interface-override', 'monospace');
      document.body.style.setProperty('--font-monospace-override', 'sans-serif');
    });
    const targets = [
      ['text', page.locator('.markdown-preview-view p').first(), 'serif'],
      ['interface', page.locator('.mod-left-split .nav-file-title-content').first(), 'monospace'],
      ['monospace', page.locator('.markdown-preview-view pre code').first(), 'sans-serif']
    ];
    const results = [];
    for (const [name, target, expected] of targets) {
      await expect(target).toBeVisible();
      const family = await target.evaluate(element => getComputedStyle(element).fontFamily);
      results.push({ name, family, expected });
      expect(family.split(',')[0].replace(/["']/g, '').trim(), `${name} font override`).toBe(expected);
    }
    await writeFile(path.join(session.output, 'native-font-overrides.json'), JSON.stringify(results, null, 2));
  });

  test('alternate task markers agree in Reading and Live Preview; source remains readable', async () => {
    const { page } = session;
    const results = [];
    for (const palette of ['dark', 'light']) {
      await setMode(page, palette);
      const reference = new Map();
      for (const [mode, source, name] of [['preview', false, 'reading'], ['source', false, 'live-preview'], ['source', true, 'source']]) {
        await openNote(page, 'Contrast Tasks.md', mode, source);
        const view = page.locator(mode === 'preview' ? '.markdown-preview-view' : '.markdown-source-view.mod-cm6').first();
        for (const [state, label, marker] of [['/', 'Working state', ''], ['-', 'Deferred state', '−'], ['!', 'Important state', '!'], ['?', 'Question state', '?']]) {
          const item = view.locator(mode === 'preview' ? '.task-list-item' : '.HyperMD-task-line').filter({ hasText: label }).first();
          await expect(item, `${palette} ${name} ${state}`).toBeVisible();
          const checkbox = item.locator('input.task-list-item-checkbox');
          if (name === 'source' && !(await checkbox.count())) {
            await expect(item).toContainText(`[${state}]`);
            results.push({ palette, mode: name, state, nativeSourceText: true });
            continue;
          }
          await expect(checkbox).toBeVisible();
          const observed = await checkbox.evaluate(element => {
            const style = getComputedStyle(element);
            const pseudo = getComputedStyle(element, '::after');
            return { color: style.color, backgroundImage: style.backgroundImage, content: pseudo.content.replace(/^["']|["']$/g, ''), checked: element.checked };
          });
          results.push({ palette, mode: name, state, ...observed });
          expect(observed.checked, 'Alternate states keep native checkbox behavior').toBe(true);
          expect(observed.color).not.toBe('rgba(0, 0, 0, 0)');
          if (state === '/') expect(observed.backgroundImage).toContain('linear-gradient');
          else expect(observed.content, `${name} ${state} task symbol`).toBe(marker);
          if (name === 'reading') reference.set(state, observed);
          else {
            expect(observed.color, `${palette} ${name} ${state} semantic color parity`).toBe(reference.get(state).color);
            expect(observed.content, `${palette} ${name} ${state} marker parity`).toBe(reference.get(state).content);
          }
        }
      }
    }
    await writeFile(path.join(session.output, 'alternate-task-parity.json'), JSON.stringify(results, null, 2));
  });
});
