import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const out = process.argv[2]; await mkdir(out, { recursive: true });
const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const port = server.httpServer.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
await p.addInitScript(() => {
  localStorage.setItem('legatum.first-game-hints.v2', JSON.stringify({ enabled: false, seen: [] }));
  localStorage.setItem('legatum.map-view', '3d'); localStorage.setItem('legatum.intro.v1', 'off');
});
await p.goto(`http://127.0.0.1:${port}/?client=wasm`);
await p.getByRole('button', { name: /^Single Player/ }).click();
await p.getByRole('button', { name: /^Start game/ }).click();
await p.waitForSelector('.map3d-canvas', { timeout: 60000 });
await p.waitForTimeout(6000);
console.log(await p.evaluate(() => { const s = window.legatum.getState(); const v = s.views[s.seat]; return JSON.stringify({ me: v.me, fac: v.players.find(x=>x.id===v.me)?.faction, units: v.units.filter(u=>u.owner===v.me).map(u=>u.kind) }); }));
const zooms = (process.argv[3] ?? '13,5,3,1.8').split(',').map(Number);
await p.evaluate(() => { const s = window.legatum.getState(); const v = s.views[s.seat]; const u = v.units.find((x) => x.owner === v.me && x.kind === 'Spearman') ?? v.units.find((x) => x.owner === v.me); s.jumpTo(u.pos); });
for (const z of zooms) {
  await p.evaluate((z) => { const sc = window.legatumMap3d; sc.dist = z; sc.placeCamera(); }, z);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/z${z}.png` });
}
console.log(await p.evaluate(() => { const sc = window.legatumMap3d; let vis0=0, vis1=0; sc.units.traverse(o=>{ if(/_LOD0$/.test(o.name)&&o.visible) vis0++; if(/_LOD1$/.test(o.name)&&o.visible) vis1++; }); return JSON.stringify({ vis0, vis1, calls: sc.renderer.info.render.calls, tris: sc.renderer.info.render.triangles }); }));
console.log(errs.join('\n'));
await b.close(); await server.close();
