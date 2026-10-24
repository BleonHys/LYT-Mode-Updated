import { test, expect } from '@playwright/test';
import path from 'node:path';
import { launchObsidian, versions, openNote } from './helpers/obsidian.mjs';
for (const version of versions) {
  test(`Obsidian ${version}: real app, loaded theme, plugin and native popout`, async () => {
    const session = await launchObsidian(version, 'smoke');
    try {
      const { page, context } = session;
      await openNote(page);
      expect(await page.evaluate(() => app.customCss.theme)).toBe('Focus-LYT');
      await expect(page.locator('.markdown-preview-view').first()).toContainText('Searchable constellation needle');
      expect(await page.evaluate(() => Boolean(app.plugins.plugins['obsidian-style-settings']))).toBe(true);
      const next = context.waitForEvent('page');
      await page.evaluate(async () => {
        const leaf = app.workspace.getLeaf('window');
        await leaf.openFile(app.vault.getAbstractFileByPath('Connections.md'));
      });
      const popout = await next;
      await popout.waitForSelector('.workspace');
      await expect(popout.locator('body')).toContainText('Connections');
      await popout.screenshot({ path: path.join(session.output, 'smoke-popout.png') });
      await page.screenshot({ path: path.join(session.output, 'smoke-main.png') });
      await popout.close();
    } finally { await session.close(); }
  });
}
