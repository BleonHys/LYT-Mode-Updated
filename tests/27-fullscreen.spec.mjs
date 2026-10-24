import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchObsidian, versions, setMode } from './helpers/obsidian.mjs';
import { nativeWindow, move, xdo } from './helpers/native-input.mjs';
const pinCommand='obsidian-style-settings:style-settings-class-toggle-lyt-prism-lyt-prism-pin-bars';
const opacity=locator=>locator.evaluate(el=>+getComputedStyle(el).opacity);

for(const version of versions) for(const mode of ['dark','light']) test(`maximized controls ${version} ${mode}: visible arrow and synchronized lock`,async()=>{
 const session=await launchObsidian(version,'controls',{frame:'hidden',controls:true,appearance:{showViewHeader:false,showRibbon:false,baseFontSize:18},styleSettings:{'lyt-prism@@lyt-prism-autohide-tabs':true},hotkeys:{[pinCommand]:[{modifiers:['Mod','Alt'],key:'P'}]}});
 const {page}=session, records=[];
 try {
  await page.emulateMedia({reducedMotion:'no-preference'});await setMode(page,mode);
  await page.evaluate(()=>app.workspace.rightSplit.collapse());
  const id=nativeWindow(session),tabs=page.locator('.mod-root .workspace-tab-header-container').first(),arrow=page.locator('.focus-lyt-trigger'),lock=page.locator('.focus-lyt-pin').first();
  await expect(page.locator('body')).toHaveClass(/lyt-prism-controls-enabled/);
  const saved=async()=>JSON.parse(await readFile(path.join(session.vault,'.obsidian/plugins/obsidian-style-settings/data.json'),'utf8'));
  const clickNative=async locator=>{const b=await locator.boundingBox();move(id,b.x+b.width/2,b.y+b.height/2);xdo('click','1');};
  for(const state of ['normal','maximized']) {
   if(state==='maximized') {
    const a=await arrow.boundingBox();move(id,a.x+a.width/2,a.y+a.height/2);await expect.poll(()=>opacity(tabs)).toBe(1);
    await clickNative(page.locator('.titlebar-button.mod-maximize'));await expect(page.locator('body')).toHaveClass(/is-maximized/);
   }
   move(id,800,600);await expect.poll(()=>opacity(tabs)).toBe(0);
   await expect(arrow).toBeVisible();await expect(arrow).toHaveAccessibleName('Notizleiste einblenden');await expect.poll(()=>opacity(arrow)).toBe(1);
   const box=await arrow.boundingBox(),pane=await tabs.boundingBox();
   expect(box.width).toBeGreaterThanOrEqual(48);expect(box.height).toBeGreaterThanOrEqual(24);
   expect(Math.abs((box.x+box.width/2)-(pane.x+pane.width/2))).toBeLessThan(1);
   await page.screenshot({path:path.join(session.output,`controls-${mode}-${state}-closed.png`)});
   const noteBefore=await page.locator('.mod-root .workspace-tab-container').evaluate(el=>el.getBoundingClientRect().y);
   // Approach the visible arrow at y=12, outside the old invisible 8px strip.
   move(id,box.x+box.width/2,box.y+box.height/2);
   await expect.poll(()=>opacity(tabs)).toBe(1);await expect(arrow).toBeHidden();
   xdo('sleep','.55');expect(await opacity(tabs)).toBe(1);
   expect(await page.locator('.mod-root .workspace-tab-container').evaluate(el=>el.getBoundingClientRect().y)).toBe(noteBefore);
   await expect(lock).toHaveAttribute('aria-pressed','false');
   const hit=await lock.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});expect(hit).toBe(true);
   await page.screenshot({path:path.join(session.output,`controls-${mode}-${state}-open.png`)});
   await clickNative(lock);await expect(page.locator('body')).toHaveClass(/lyt-prism-pin-bars/);await expect(lock).toHaveAttribute('aria-pressed','true');
   await expect.poll(async()=>(await saved())['lyt-prism@@lyt-prism-pin-bars']).toBe(true);
   move(id,800,600);xdo('sleep','.55');expect(await opacity(tabs)).toBe(1);await expect(arrow).toBeHidden();
   await page.screenshot({path:path.join(session.output,`controls-${mode}-${state}-locked.png`)});
   xdo('key','--clearmodifiers','ctrl+alt+p');await expect(lock).toHaveAttribute('aria-pressed','false');
   await expect.poll(()=>opacity(tabs)).toBe(0);await expect.poll(()=>opacity(arrow)).toBe(1);
   // A click also opens the toolbar and moves keyboard focus to its lock.
   await clickNative(arrow);await expect(lock).toBeFocused();await expect.poll(()=>opacity(tabs)).toBe(1);
   await clickNative(lock);await expect(lock).toHaveAttribute('aria-pressed','true');
   await clickNative(lock);await expect(lock).toHaveAttribute('aria-pressed','false');
   move(id,800,600);await expect.poll(()=>opacity(tabs)).toBe(0);
   await expect.poll(async()=>(await saved())['lyt-prism@@lyt-prism-pin-bars']).toBe(false);
   records.push({state,arrow:box,oldInvisibleStripHeight:8,noteBefore,pinnedSetting:(await saved())['lyt-prism@@lyt-prism-pin-bars']});
  }
  // The handle tracks the active note pane after splitting and sidebar resizing.
  await page.evaluate(async()=>{const leaf=app.workspace.getLeaf('split','vertical');await leaf.openFile(app.vault.getAbstractFileByPath('Connections.md'));});
  await expect(page.locator('.focus-lyt-pin')).toHaveCount(2);await expect(arrow).toHaveCount(1);
  await page.evaluate(()=>app.workspace.rightSplit.expand());
  await expect.poll(async()=>{const a=await arrow.boundingBox();return page.evaluate(center=>{const tab=app.workspace.activeLeaf.view.containerEl.closest('.workspace-tabs'),r=tab.getBoundingClientRect();return Math.abs(center-(r.left+r.width/2));},a.x+a.width/2);}).toBeLessThan(1);
  // Keyboard pinning updates both icons; no second persisted state exists.
  xdo('key','--clearmodifiers','ctrl+alt+p');await expect(page.locator('.focus-lyt-pin[aria-pressed="true"]')).toHaveCount(2);
  xdo('key','--clearmodifiers','ctrl+alt+p');await expect(page.locator('.focus-lyt-pin[aria-pressed="false"]')).toHaveCount(2);
  await page.evaluate(()=>document.body.classList.add('is-mobile'));
  await expect(arrow).toHaveCount(0);await expect(page.locator('.focus-lyt-pin')).toHaveCount(0);
  await page.evaluate(()=>document.body.classList.remove('is-mobile'));await expect(arrow).toHaveCount(1);
  await page.evaluate(()=>{document.body.style.setProperty('--lyt-prism-theme-active','0');app.workspace.trigger('css-change');});
  await expect(arrow).toHaveCount(0);await expect(page.locator('.focus-lyt-pin')).toHaveCount(0);
  await page.evaluate(()=>{document.body.style.removeProperty('--lyt-prism-theme-active');app.workspace.trigger('css-change');});await expect(arrow).toHaveCount(1);
  await page.evaluate(()=>app.plugins.disablePlugin('focus-lyt-controls'));await expect(arrow).toHaveCount(0);await expect(page.locator('.focus-lyt-pin')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/lyt-prism-controls-enabled|lyt-prism-controls-reveal/);
  await page.evaluate(()=>app.plugins.enablePlugin('focus-lyt-controls'));await expect(arrow).toHaveCount(1);await expect(page.locator('.focus-lyt-pin')).toHaveCount(2);
  records.push({cleanup:true,mobileGuard:true,themeGuard:true,splitLocks:2,sharedPersistence:true});
 }finally{await writeFile(path.join(session.output,`controls-${mode}.json`),JSON.stringify(records,null,2));await session.close();}
});
