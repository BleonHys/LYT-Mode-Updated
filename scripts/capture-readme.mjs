// Run inside the existing isolated Obsidian container. These are real app
// screenshots of a disposable demo vault; never a capture of the user's vault.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchObsidian, setMode } from '../tests/helpers/obsidian.mjs';
import { nativeWindow, move, xdo } from '../tests/helpers/native-input.mjs';
const s=await launchObsidian('1.14.4','readme',{vaultName:'Focus-LYT Demo',frame:'hidden',controls:true,appearance:{showViewHeader:false,showRibbon:false,baseFontSize:18},styleSettings:{'lyt-prism@@lyt-prism-autohide-tabs':true,'lyt-prism@@lyt-prism-autohide-status':true}});
const {page}=s;
const output=path.join(process.env.ARTIFACT_ROOT||'/output','readme');
await mkdir(output,{recursive:true});
try {
 const content=await readFile(path.join(process.env.THEME_ROOT||'/workspace','examples/vault/Focus-LYT.md'),'utf8');
 await page.evaluate(async content=>{
  if(!app.vault.adapter.basePath.startsWith('/tmp/lyt-prism-')) throw new Error('Only a disposable test vault may be changed');
  let note=app.vault.getAbstractFileByPath('Focus-LYT.md');
  if(note) await app.vault.modify(note,content);else note=await app.vault.create('Focus-LYT.md',content);
  const leaf=app.workspace.getLeavesOfType('markdown')[0];await leaf.openFile(note);
  await leaf.setViewState({type:'markdown',state:{file:note.path,mode:'preview',source:false},active:true});
  for(const file of app.vault.getFiles()) if(!['Focus-LYT.md','Connections.md'].includes(file.path)) await app.vault.delete(file);
  await app.vault.modify(app.vault.getAbstractFileByPath('Connections.md'),'# Connected ideas\n\nOne thought can lead to another. Return to [[Focus-LYT]].');
  app.workspace.rightSplit.collapse();app.workspace.leftSplit.expand();
 },content);
 const id=nativeWindow(s);xdo('windowsize','--sync',id,1440,1000);xdo('windowmove','--sync',id,30,30);
 await page.waitForFunction(()=>innerWidth===1440);
 await page.waitForFunction(()=>document.querySelector('.inline-title')?.textContent==='Focus-LYT');
 await page.waitForFunction(()=>document.fonts.status==='loaded');
 const tabs=page.locator('.mod-root .workspace-tab-header-container').first();
 for(const mode of ['dark','light']) {
  await setMode(page,mode);move(id,850,950);
  await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.mod-root .workspace-tab-header-container')).opacity===0);
  await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.focus-lyt-trigger')).opacity===1);
  await page.screenshot({path:path.join(output,`${mode}.png`)});
 }
 await setMode(page,'dark');
 await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.focus-lyt-trigger')).opacity===1);
 const headerBox=await tabs.boundingBox();
 const clip={x:headerBox.x,y:headerBox.y,width:headerBox.width,height:120};
 await page.screenshot({path:path.join(output,'focus-hidden.png'),clip});
 const a=await page.locator('.focus-lyt-trigger').boundingBox();move(id,a.x+a.width/2,a.y+a.height/2);
 await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.mod-root .workspace-tab-header-container')).opacity===1);
 move(id,1000,18);xdo('sleep','.6');
 await page.screenshot({path:path.join(output,'focus-open.png'),clip});
 const lock=await page.locator('.focus-lyt-pin').first().boundingBox();move(id,lock.x+lock.width/2,lock.y+lock.height/2);xdo('click','1');move(id,850,950);
 await page.waitForFunction(()=>document.body.classList.contains('lyt-prism-pin-bars'));
 await page.screenshot({path:path.join(output,'focus-locked.png'),clip:{...clip,height:160}});
 // A separate 16:9 app capture for the community-directory preview.
 move(id,lock.x+lock.width/2,lock.y+lock.height/2);xdo('click','1');
 await page.waitForFunction(()=>!document.body.classList.contains('lyt-prism-pin-bars'));
 await page.evaluate(()=>document.body.style.setProperty('--font-text-size','16px'));
 xdo('windowsize','--sync',id,1440,810);move(id,850,750);
 await page.waitForFunction(()=>innerWidth===1440 && innerHeight===810);
 await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.mod-root .workspace-tab-header-container')).opacity===0);
 await page.screenshot({path:path.join(output,'store.png')});
 const root=process.env.THEME_ROOT||'/workspace';
 const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
 const companion=JSON.parse(await readFile(path.join(root,'focus-lyt-controls/manifest.json'),'utf8'));
 await writeFile(path.join(output,'capture.json'),JSON.stringify({theme:manifest.name,version:manifest.version,obsidian:'1.14.4',viewport:{width:1440,height:1000},storeViewport:{width:1440,height:810},vault:'Disposable demo vault',companion:`${companion.name} ${companion.version}`,images:['dark.png','light.png','focus-hidden.png','focus-open.png','focus-locked.png','store.png']},null,2));
}finally{await s.close();}
