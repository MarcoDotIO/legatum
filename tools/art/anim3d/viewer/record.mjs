#!/usr/bin/env node
/** Host-only Chromium capture. Starts a local server, writes exact 30 fps PNGs,
 * then encodes each clip repeated three times as H.264 yuv420p. */
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, realpath} from 'node:fs/promises';
import {resolve, dirname, extname, sep, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../../../..');
const args=process.argv.slice(2);
function option(name,fallback){const i=args.indexOf(name);return i<0?fallback:args[i+1];}
const out=resolve(option('--out',join(homedir(),'LegatumRuns/anim-pilot/review/3d-v2')));
const round=option('--round','6');
if(!/^\d+$/.test(round))throw new Error('--round must be a round number');
const prefix=option('--prefix',`spearman-0ad-r${round}`);
if(!/^[a-zA-Z0-9_-]+$/.test(prefix))throw new Error('--prefix must contain only letters, digits, underscores and hyphens');
// --glb records any unit GLB (e.g. a fitted model kept outside the repo); it is
// served at a fixed loopback path and passed to the viewer as ?model=.
const glb=resolve(option('--glb',resolve(here,'../units/spearman-0ad/spearman.glb')));
const assetSha256=createHash('sha256').update(await readFile(glb)).digest('hex');
let playwright;
if(process.env.PLAYWRIGHT_MODULE) playwright=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
else {
  const require=createRequire(import.meta.url);
  try{playwright=require('playwright');}
  catch {playwright=createRequire(join(root,'app/package.json'))('playwright');}
}
const chromium=playwright.chromium||playwright.default?.chromium;
if(!chromium)throw new Error('Playwright chromium export missing');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    if(new URL(req.url,'http://localhost').pathname==='/__model__.glb'){
      res.writeHead(200,{'Content-Type':mime['.glb']});res.end(await readFile(glb));return;
    }
    const path=await realpath(resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)));
    if(!path.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
    const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);
  }catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/art/anim3d/viewer/index.html?record=1&model=/__model__.glb`);
  await page.waitForFunction(()=>window.review?.ready||window.review?.error,{},{timeout:60000});
  const state=await page.evaluate(()=>window.review);
  if(!state.ready)throw new Error(state.error);
  await mkdir(out,{recursive:true});const receipts={};
  const framing=await page.evaluate(()=>window.review.framing());
  // Every clip is fitted to show its full extent (props included), so a clip whose
  // spear or fall is taller than the figure frames the figure below 70%. That is
  // correct, not an error: only an extent outside the frame is.
  const framingNotes={};
  for(const [clip,fit] of Object.entries(framing)) {
    if(fit.heightFraction>.921||fit.widthFraction>.921)
      throw new Error(`Invalid framing for ${clip}: ${JSON.stringify(fit)}`);
    if(fit.figureFraction<.65)framingNotes[clip]=`figure ${(fit.figureFraction*100).toFixed(0)}% of frame height: the clip's full extent is taller than the figure`;
  }
  for(const [clip,duration] of Object.entries(state.clips)) {
    const frames=resolve(out,`.${prefix}-viewer-frames`,assetSha256,clip);await mkdir(frames,{recursive:true});
    const count=Math.round(duration*30);
    for(let i=0;i<count;i++) {
      await page.evaluate(({clip,t})=>window.review.sample(clip,t),{clip,t:i/30});
      await page.locator('canvas').screenshot({path:join(frames,`${String(i).padStart(4,'0')}.png`)});
    }
    const output=join(out,`${prefix}-${clip}-viewer.mp4`);
    const encode=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-stream_loop','2','-i',join(frames,'%04d.png'),'-frames:v',String(count*3),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'inherit'});
    if(encode.status!==0)throw new Error(`ffmpeg failed for ${clip}`);
    const probe=spawnSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,pix_fmt,nb_read_frames,r_frame_rate','-of','json',output],{encoding:'utf8'});
    if(probe.status!==0)throw new Error(`ffprobe failed for ${clip}`);
    const stream=JSON.parse(probe.stdout).streams[0];
    if(Number(stream.nb_read_frames)!==count*3||stream.pix_fmt!=='yuv420p')throw new Error(`Invalid encoded clip ${clip}`);
    receipts[clip]={output,framing:framing[clip],...stream};console.log(output);
  }
  // Actual MeshStandardMaterial/ACES evidence, at the same 512 px size as the panel.
  await page.setViewportSize({width:512,height:512});
  await page.evaluate(()=>window.review.sample('idle',0));
  const heroPath=join(out,`${prefix}-viewer-idle.png`);
  const hero=await page.locator('canvas').screenshot({path:heroPath});
  const panel=await readFile(resolve(root,'app/src/assets/units/spearman-panel.png'));
  const comparison=await browser.newPage({viewport:{width:1024,height:552},deviceScaleFactor:1});
  await comparison.setContent(`<html><body style="margin:0;background:#f8f4e8;color:#493b2a;font:13px sans-serif;display:flex">
    <div style="width:512px"><div style="height:32px;padding-left:16px;line-height:32px">Reference painting</div><img style="width:512px;height:512px;object-fit:contain" src="data:image/png;base64,${panel.toString('base64')}"></div>
    <div style="width:512px"><div style="height:32px;padding-left:16px;line-height:32px">${prefix} | three.js MeshStandardMaterial / ACES</div><img style="width:512px;height:512px" src="data:image/png;base64,${hero.toString('base64')}"></div>
    </body></html>`);
  await comparison.locator('img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
  const comparisonPath=join(out,`${prefix}-vs-panel-viewer.png`);
  await comparison.screenshot({path:comparisonPath});await comparison.close();
  receipts.comparison={output:comparisonPath,hero:heroPath,renderer:'three.js MeshStandardMaterial / ACES'};
  await page.setViewportSize({width:960,height:640});
  await page.evaluate(()=>window.review.sample('idle',0));
  const turnFrames=resolve(out,`.${prefix}-viewer-frames`,assetSha256,'turntable');await mkdir(turnFrames,{recursive:true});
  for(let i=0;i<360;i++) {
    await page.evaluate(t=>window.review.turntable(t,12),i/30);
    await page.locator('canvas').screenshot({path:join(turnFrames,`${String(i).padStart(4,'0')}.png`)});
  }
  const turntable=join(out,`${prefix}-turntable.mp4`);
  const turnEncode=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',join(turnFrames,'%04d.png'),'-frames:v','360','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',turntable],{stdio:'inherit'});
  if(turnEncode.status!==0)throw new Error('Turntable encoding failed');
  const turnProbe=spawnSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,pix_fmt,nb_read_frames,r_frame_rate','-of','json',turntable],{encoding:'utf8'});
  if(turnProbe.status!==0)throw new Error('Turntable probe failed');
  const turnStream=JSON.parse(turnProbe.stdout).streams[0];
  if(Number(turnStream.nb_read_frames)!==360||turnStream.pix_fmt!=='yuv420p')throw new Error('Invalid turntable');
  receipts.turntable={output:turntable,duration:12,...turnStream};console.log(turntable);
  // Game-size sprites: the legacy sprite schedule (frames and rates per clip,
  // three repeats) at 160 px, and a sheet with the figure about 48 px tall.
  const schedule={idle:[12,4],walk:[16,6],attack:[18,14],hit:[8,12],death:[16,4]};
  const tiles={};
  for(const [size,key] of [[160,'160'],[69,'48']]) {
    await page.setViewportSize({width:size,height:size});tiles[key]={};
    for(const [clip,[n,fps]] of Object.entries(schedule)) {
      const duration=state.clips[clip];const dir=resolve(out,`.${prefix}-viewer-frames`,assetSha256,`${clip}-${key}`);await mkdir(dir,{recursive:true});
      tiles[key][clip]=[];
      for(let i=0;i<n;i++) {
        const t=clip==='death'?duration*i/(n-1):duration*i/n;
        await page.evaluate(({clip,t,duration})=>window.review.sample(clip,Math.min(t,duration-1e-4)),{clip,t,duration});
        const path=join(dir,`${String(i).padStart(4,'0')}.png`);
        tiles[key][clip].push((await page.locator('canvas').screenshot({path})).toString('base64'));
      }
      if(key==='160') {
        const output=join(out,`${prefix}-${clip}-160.mp4`);
        const encode=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-stream_loop','2','-i',join(dir,'%04d.png'),'-frames:v',String(n*3),'-vf','scale=160:160','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'inherit'});
        if(encode.status!==0)throw new Error(`ffmpeg failed for ${clip} sprite`);
        receipts[`${clip}-160`]={output,frames:n,fps,repeats:3};console.log(output);
      }
    }
  }
  const sheet=await browser.newPage({viewport:{width:18*69+90,height:5*69*1+5*160+60},deviceScaleFactor:1});
  const row=(key,clip,px)=>`<div style="display:flex;align-items:center"><div style="width:90px;font:12px sans-serif">${clip} ${key==='48'?'48 px':'160 px'}</div>${tiles[key][clip].map(b=>`<img style="width:${px}px;height:${px}px" src="data:image/png;base64,${b}">`).join('')}</div>`;
  await sheet.setContent(`<html><body style="margin:0;background:#f8f4e8;color:#493b2a">
    <div style="padding:8px 0 4px 8px;font:13px sans-serif">${prefix}: game-size sprites (three.js), figure about 48 px tall, then 160 px idle and attack</div>
    ${Object.keys(schedule).map(c=>row('48',c,69)).join('')}
    ${['idle','attack'].map(c=>row('160',c,160).replace(/style="display:flex/,'style="display:flex;flex-wrap:wrap')).join('')}</body></html>`);
  const sheetPath=join(out,`${prefix}-sheet-48.png`);await sheet.screenshot({path:sheetPath,fullPage:true});await sheet.close();
  receipts.sheet48={output:sheetPath};console.log(sheetPath);
  if(errors.length)throw new Error(errors.join('\n'));
  await writeFile(join(out,`${prefix}-viewer-validation.json`),JSON.stringify({assetSha256,clips:receipts,framingNotes},null,2));
} finally {
  if(browser)await browser.close();await new Promise(r=>server.close(r));
}
