import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {launchObsidian} from './helpers/obsidian.mjs';
import {nativeWindow,move,xdo} from './helpers/native-input.mjs';
test('controls accessibility: keyboard disclosure and reduced motion',async()=>{
 const s=await launchObsidian('1.14.4','controls-keyboard',{frame:'hidden',controls:true,appearance:{showViewHeader:false,showRibbon:false},styleSettings:{'lyt-prism@@lyt-prism-autohide-tabs':true}}),{page}=s;
 try {
  await page.emulateMedia({reducedMotion:'no-preference'});
  const id=nativeWindow(s),arrow=page.locator('.focus-lyt-trigger'),lock=page.locator('.focus-lyt-pin').first(),tabs=page.locator('.mod-root .workspace-tab-header-container').first();
  move(id,800,650);await expect(arrow).toBeVisible();
  xdo('key','Tab');await arrow.focus();xdo('sleep','.45');
  await expect(arrow).toBeFocused();await expect(arrow).toBeVisible();
  expect(await arrow.evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  xdo('key','Return');await expect(lock).toBeFocused();
  xdo('key','space');await expect(lock).toHaveAttribute('aria-pressed','true');
  xdo('key','space');await expect(lock).toHaveAttribute('aria-pressed','false');
  move(id,800,650);xdo('click','1');await expect.poll(()=>tabs.evaluate(el=>+getComputedStyle(el).opacity)).toBe(0);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(arrow).toBeVisible();
  const box=await arrow.boundingBox();move(id,box.x+box.width/2,box.y+box.height/2);
  await expect.poll(()=>tabs.evaluate(el=>+getComputedStyle(el).opacity)).toBe(1);
  expect(await tabs.evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(v=>parseFloat(v)===0))).toBe(true);
  await page.screenshot({path:path.join(s.output,'controls-keyboard-reduced-motion.png')});
  await writeFile(path.join(s.output,'controls-keyboard.json'),JSON.stringify({keyboardDisclosure:true,spacePinsAndUnpins:true,reducedMotion:true},null,2));
 }finally{await s.close();}
});
