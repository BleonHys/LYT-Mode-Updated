import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchObsidian, versions, setMode } from './helpers/obsidian.mjs';
import { nativeWindow, move, xdo } from './helpers/native-input.mjs';

async function snapshot(page) {
  return page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
    const tab = document.querySelector('.mod-root .workspace-tab-header-container');
    return { opacity:+getComputedStyle(tab).opacity, note:rect('.mod-root .workspace-tab-container'), sidebar:rect('.mod-left-split .workspace-tab-header-container'), tools:rect('.mod-left-split .nav-header'), files:rect('.mod-left-split .nav-files-container') };
  });
}
for (const version of versions) for (const mode of ['dark','light']) test(`hover paths ${version} ${mode}: navigation stays fixed and does not reveal note tabs`, async () => {
  const session = await launchObsidian(version, 'hover-paths', { frame:'hidden', appearance:{showViewHeader:false,showRibbon:false}, styleSettings:{'lyt-prism@@lyt-prism-autohide-tabs':true} });
  const {page} = session, records=[];
  try {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await setMode(page,mode);
    await page.evaluate(() => app.workspace.rightSplit.collapse());
    const id=nativeWindow(session);
    xdo('windowsize','--sync',id,1440,1000); xdo('windowmove','--sync',id,30,30);
    move(id,800,650);
    await expect.poll(async () => (await snapshot(page)).opacity).toBe(0);
    const before=await snapshot(page); records.push({phase:'before',...before});
    await page.screenshot({path:path.join(session.output,`paths-${mode}-before.png`)});
    for (const y of [300,160,60,20,60,160,300]) {
      move(id,120,y); xdo('sleep','0.06');
      records.push({phase:'sidebar',...await snapshot(page)});
    }
    await page.screenshot({path:path.join(session.output,`paths-${mode}-sidebar.png`)});
    expect(records.filter(r=>r.phase==='sidebar').every(r=>r.opacity===0),'Navigating the sidebar must not reveal note tabs').toBe(true);
    for (const record of records) {
      expect(record.sidebar).toEqual(before.sidebar);
      expect(record.tools).toEqual(before.tools);
      expect(record.files).toEqual(before.files);
      expect(record.note).toEqual(before.note);
    }
    move(id,800,650);
    await page.evaluate(() => {
      window.hoverPathFrames=[]; window.hoverPathPhase='brief-edge'; window.hoverPathRecording=true;
      const sample=(timestamp) => {
        if (!window.hoverPathRecording) return;
        const header=document.querySelector('.mod-root .workspace-tab-header-container');
        const side=document.querySelector('.mod-left-split .workspace-tab-header-container');
        window.hoverPathFrames.push({t:timestamp,phase:window.hoverPathPhase,opacity:+getComputedStyle(header).opacity,buttons:+getComputedStyle(document.querySelector('.titlebar-button-container.mod-right')).opacity,noteY:document.querySelector('.mod-root .workspace-tab-container').getBoundingClientRect().y,sidebarY:side.getBoundingClientRect().y,sidebarHeight:side.getBoundingClientRect().height});
        requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
    });
    const left=await page.locator('.mod-root .workspace-tab-header-container').evaluate(el=>el.getBoundingClientRect().left);
    const opacity=()=>page.locator('.mod-root .workspace-tab-header-container').evaluate(el=>+getComputedStyle(el).opacity);
    // Crossing the edge briefly must never reveal the shelf later on.
    for(let n=0;n<3;n++) { move(id,left+24,6); xdo('sleep','0.03'); move(id,800,650); xdo('sleep','0.15'); }
    expect(await opacity()).toBe(0);
    const brief=await page.evaluate(()=>window.hoverPathFrames.filter(f=>f.phase==='brief-edge'));
    expect(brief.every(f=>f.opacity===0),'Brief edge crossings must not schedule a later flash').toBe(true);
    await page.evaluate(()=>window.hoverPathPhase='reveal');
    move(id,left+24,6);
    if(version==='1.14.4' && mode==='dark') for(let frame=0;frame<7;frame++) await page.screenshot({path:path.join(session.output,`paths-${mode}-reveal-${frame}.png`)});
    await expect.poll(opacity).toBe(1);
    await page.evaluate(()=>window.hoverPathPhase='toolbar-path');
    for(const [x,y] of [[left+60,20],[800,20],[1418,20],[1350,20],[left+60,20]]) {
      move(id,x,y); xdo('sleep','0.04');
      expect(await opacity()).toBe(1);
    }
    move(id,800,20); xdo('sleep','0.55');
    expect(await opacity(),'The shelf must stay open while resting over its blank drag area').toBe(1);
    await page.screenshot({path:path.join(session.output,`paths-${mode}-toolbar.png`)});
    // Leave/re-enter both during the hold and during the fade itself.
    await page.evaluate(()=>window.hoverPathPhase='reverse');
    move(id,800,650); xdo('sleep','0.1'); move(id,left+24,6); xdo('sleep','0.05');
    expect(await opacity()).toBe(1);
    move(id,800,650); xdo('sleep','0.3');
    const partial=await opacity(); expect(partial).toBeGreaterThan(0); expect(partial).toBeLessThan(1);
    if(version==='1.14.4' && mode==='dark') await page.screenshot({path:path.join(session.output,`paths-${mode}-fade.png`)});
    move(id,left+24,6); await expect.poll(opacity).toBe(1);
    // A tab menu keeps the shelf open after the mouse leaves the titlebar.
    await page.evaluate(()=>window.hoverPathPhase='menu');
    const tab=await page.locator('.mod-root .workspace-tab-header.is-active').first().boundingBox();
    move(id,tab.x+Math.min(40,tab.width/2),20); xdo('click','3');
    await expect(page.locator('.menu').first()).toBeVisible();
    records.push({phase:'menu-classes',classes:await page.locator('.mod-root .workspace-tab-header-container').evaluate(el=>el.outerHTML.slice(0,2200))});
    move(id,800,650); xdo('sleep','0.5'); expect(await opacity()).toBe(1);
    xdo('key','Escape');
    await expect(page.locator('.menu')).toHaveCount(0);
    await expect.poll(opacity).toBe(0);
    await page.evaluate(()=>window.hoverPathRecording=false);
    const frames=await page.evaluate(()=>window.hoverPathFrames);
    records.push({phase:'frames',frames});
    expect(frames.every(f=>f.noteY===before.note.y && f.sidebarY===before.sidebar.y && f.sidebarHeight===before.sidebar.height),'Note and sidebar geometry must remain fixed throughout interaction').toBe(true);
    const transitions=frames.filter(f=>f.phase!=='brief-edge');
    expect(transitions.some(f=>f.opacity>0 && f.opacity<1),'Record real transition frames').toBe(true);
    // Dropped frames and shortened CSS reversals can span more than one 60 Hz
    // interval. Normalize the step limit to elapsed animation time; a complete
    // jump still fails even at the longest sampled interval.
    for(let n=1;n<transitions.length;n++) {
      const elapsed=transitions[n].t-transitions[n-1].t;
      if(elapsed>0 && elapsed<35) {
        const limit=Math.min(.95,.4*elapsed/(1000/60)+.02);
        expect(Math.abs(transitions[n].opacity-transitions[n-1].opacity),'No abrupt appearance/disappearance at the observed frame interval').toBeLessThan(limit);
      }
    }
    await page.evaluate(async()=>{const leaf=app.workspace.getLeaf('split','vertical');await leaf.openFile(app.vault.getAbstractFileByPath('Connections.md'));});
    const strips=page.locator('.mod-root .workspace-tabs:not(.mod-stacked) > .workspace-tab-header-container');
    await expect(strips).toHaveCount(2);
    move(id,800,650);
    const noteRects=()=>page.locator('.mod-root .workspace-tabs > .workspace-tab-container').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
    const splitBefore=await noteRects();
    await page.screenshot({path:path.join(session.output,`paths-${mode}-split-before.png`)});
    for(const [index,strip] of (await strips.all()).entries()) {
      const box=await strip.boundingBox();move(id,box.x+24,box.y+6);
      records.push({phase:'split-probe',index,box,probe:await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return {hit:el?.className,html:el?.outerHTML.slice(0,400),region:el?getComputedStyle(el).webkitAppRegion:null,headers:[...document.querySelectorAll('.mod-root .workspace-tab-header-container')].map(h=>({hover:h.matches(':hover'),opacity:getComputedStyle(h).opacity,clip:getComputedStyle(h).clipPath}))}},{x:box.x+24,y:box.y+6})});
      await expect.poll(()=>strip.evaluate(el=>+getComputedStyle(el).opacity),{message:`Split pane ${index} must reveal`}).toBe(1);
      expect(await noteRects()).toEqual(splitBefore);
    }
    records.push({phase:'split',panes:splitBefore});
    await page.screenshot({path:path.join(session.output,`paths-${mode}-split.png`)});
  } finally {
    const unfinished=await page.evaluate(()=>{window.hoverPathRecording=false;return window.hoverPathFrames||[]}).catch(()=>[]);
    if(!records.some(r=>r.phase==='frames')) records.push({phase:'frames',frames:unfinished});
    await writeFile(path.join(session.output,`paths-${mode}.json`),JSON.stringify(records,null,2));
    await session.close();
  }
});
