// Map lettering: names for the seas, ranges and regions a player has explored. Names are
// deterministic per game (salted by the players) and per map region, so a sea keeps its name
// as more of it is revealed. The map is cut into large cells; a cell that is mostly explored
// water gets a sea name, a cluster of mountains a range name, and open land a region name.
import type { PlayerView, Terrain } from '../types';
import { centerX, centerY, neighborIndex } from './grid';
import { hashString } from './noise';

export interface MapLabel {
  text: string;
  kind: 'sea' | 'land' | 'range';
  x: number;
  y: number;
  /** Radians; ranges follow their spine. */
  angle: number;
}

// Names are plain geography, as an old atlas letters a land nobody has named yet ("The Northern Sea",
// "The Great Desert"): where the place lies on the map, then what it is. Legatum is grounded in real
// history, so no invented fantasy names (user, 2026-11-25). `{D}` is the compass word for the map
// ninth the place lies in; the middle ninth has its own list.
type Feature = 'Sea' | 'Range' | 'Forest' | 'Desert' | 'Tundra' | 'Hills' | 'Open';
const OUTER: Record<Feature, string[]> = {
  Sea: ['The {D} Sea', 'The {D} Gulf', 'The {D} Straits', 'The {D} Deep'],
  Range: ['The {D} Mountains', 'The {D} Range', 'The {D} Heights', 'The {D} Peaks'],
  Forest: ['The {D} Forest', 'The {D} Woods', 'The {D} Woodlands', 'The {D} Wilds'],
  Desert: ['The {D} Desert', 'The {D} Sands', 'The {D} Dunes', 'The {D} Drylands'],
  Tundra: ['The {D} Tundra', 'The {D} Wastes', 'The {D} Snowfields', 'The {D} Barrens'],
  Hills: ['The {D} Hills', 'The {D} Uplands', 'The {D} Ridges', 'The {D} Highlands'],
  Open: ['The {D} Plains', 'The {D} Steppe', 'The {D} Lowlands', 'The {D} Grasslands'],
};
const MIDDLE: Record<Feature, string[]> = {
  Sea: ['The Inner Sea', 'The Middle Sea', 'The Great Gulf', 'The Middle Straits'],
  Range: ['The Central Mountains', 'The Great Divide', 'The High Passes', 'The Middle Range'],
  Forest: ['The Great Forest', 'The Central Woods', 'The Deep Forest', 'The Middle Woodlands'],
  Desert: ['The Great Desert', 'The Open Desert', 'The Central Sands', 'The Inner Drylands'],
  Tundra: ['The Great Tundra', 'The Cold Plain', 'The Central Wastes', 'The Inner Snowfields'],
  Hills: ['The Central Hills', 'The High Country', 'The Middle Uplands', 'The Inner Ridges'],
  Open: ['The Great Plain', 'The Heartland', 'The Central Steppe', 'The Middle Lowlands'],
};
const COMPASS = ['North-Western', 'Northern', 'North-Eastern', 'Western', '', 'Eastern', 'South-Western', 'Southern', 'South-Eastern'];

/** Which third of the map the middle of cell `i` of `n` lies in (0, 1 or 2). */
const third = (i: number, n: number) => Math.min(2, Math.floor(((i + 0.5) * 3) / n));

/**
 * The name of a feature in grid cell (gx, gy). Cells that share a map ninth take the list's names in
 * grid order, so a place keeps its name however much of the map is explored; `salt` turns the list
 * per game. Null when the ninth has more cells than names (the place then goes unlettered).
 */
export function placeName(feature: Feature, gx: number, gy: number, nx: number, ny: number, salt: number): string | null {
  const sector = third(gy, ny) * 3 + third(gx, nx);
  let rank = 0;
  for (let y = 0; y <= gy; y++)
    for (let x = 0; x < nx; x++) {
      if (y === gy && x >= gx) break;
      if (third(y, ny) * 3 + third(x, nx) === sector) rank++;
    }
  const list = sector === 4 ? MIDDLE[feature] : OUTER[feature];
  if (rank >= list.length) return null;
  const turn = (salt ^ hashString(feature)) >>> 0;
  // Each ninth starts at a different place in the list, so neighbouring regions are not all "Steppe".
  return list[(turn + sector * 2 + rank) % list.length].replace('{D}', COMPASS[sector]);
}

/** A per-game salt from things every seat sees identically. */
function gameSalt(view: PlayerView): number {
  return hashString(`${view.width}x${view.height}|${view.players.map((p) => `${p.name}/${p.faction}`).join('|')}`);
}

const isWater = (t: Terrain | null) => t === 'Ocean' || t === 'Coast';

export function computeLabels(view: PlayerView): MapLabel[] {
  const { width: W, height: H } = view;
  const salt = gameSalt(view);
  const cw = W >= 56 ? 12 : 12;
  const chh = 9;
  const nx = Math.ceil(W / cw);
  const ny = Math.ceil(H / chh);
  const used = new Set<string>();
  /** Letter a place once: two places never share a name. */
  const letter = (feature: Feature, gx: number, gy: number, kind: MapLabel['kind'], x: number, y: number, angle: number) => {
    const name = placeName(feature, gx, gy, nx, ny, salt);
    if (!name || used.has(name)) return;
    used.add(name);
    out.push({ text: kind === 'sea' ? name : name.toUpperCase(), kind, x, y, angle });
  };
  const cityTiles = new Set(view.cities.map((c) => `${c.pos.q + (c.pos.r - (c.pos.r & 1)) / 2},${c.pos.r}`));
  const out: MapLabel[] = [];
  const near = (x: number, y: number, kind: MapLabel['kind'], d: number) =>
    out.some((l) => l.kind === kind && Math.hypot(l.x - x, l.y - y) < d);

  // Ranges: connected runs of explored mountains, lettered along their spine.
  const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || view.tiles[i].terrain !== 'Mountains' || !view.tiles[i].explored) continue;
    const comp: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      comp.push(j);
      for (let e = 0; e < 6; e++) {
        const nb = neighborIndex(j, e, W, H);
        if (nb < 0 || seen[nb] || !view.tiles[nb].explored || view.tiles[nb].terrain !== 'Mountains') continue;
        seen[nb] = 1;
        stack.push(nb);
      }
    }
    if (comp.length < 4) continue;
    let cx = 0;
    let cy = 0;
    for (const j of comp) {
      cx += centerX(j, W);
      cy += centerY(j, W);
    }
    cx /= comp.length;
    cy /= comp.length;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const j of comp) {
      const dx = centerX(j, W) - cx;
      const dy = centerY(j, W) - cy;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    let angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;
    // Near-vertical ranges read better tilted than stacked.
    if (Math.abs(angle) > 1.2) angle = Math.sign(angle) * 1.2;
    const spread = Math.sqrt((sxx + syy) / comp.length);
    if (spread < 45) continue;
    const col = Math.round(cx / (36 * Math.sqrt(3)));
    const row = Math.round(cy / 54);
    let blocked = false;
    for (let dr = -2; dr <= 2 && !blocked; dr++)
      for (let dc = -2; dc <= 2; dc++) if (cityTiles.has(`${col + dc},${row + dr}`)) blocked = true;
    if (blocked || near(cx, cy, 'range', 360)) continue;
    letter('Range', Math.min(nx - 1, Math.max(0, Math.floor(col / cw))), Math.min(ny - 1, Math.max(0, Math.floor(row / chh))), 'range', cx, cy, angle);
  }
  for (let gy = 0; gy < ny; gy++)
    for (let gx = 0; gx < nx; gx++) {
      let total = 0;
      const water: number[] = [];
      const land: number[] = [];
      const mountains: number[] = [];
      const counts: Record<string, number> = {};
      for (let r = gy * chh; r < Math.min(H, (gy + 1) * chh); r++)
        for (let c = gx * cw; c < Math.min(W, (gx + 1) * cw); c++) {
          const i = r * W + c;
          total++;
          const t = view.tiles[i];
          if (!t.explored || !t.terrain) continue;
          if (isWater(t.terrain)) water.push(i);
          else {
            land.push(i);
            if (t.terrain === 'Mountains') mountains.push(i);
            const k = t.terrain === 'Grassland' || t.terrain === 'Plains' ? 'Open' : t.terrain;
            counts[k] = (counts[k] ?? 0) + 1;
          }
        }
      const centroid = (idx: number[]) => {
        let x = 0;
        let y = 0;
        for (const i of idx) {
          x += centerX(i, W);
          y += centerY(i, W);
        }
        return { x: x / idx.length, y: y / idx.length };
      };
      // Seas: a cell mostly of explored water. Anchor on the water tile nearest the centroid
      // that has the most water around it, so the name sits on open water.
      if (water.length >= 16 && water.length >= total * 0.45) {
        const c = centroid(water);
        const set = new Set(water);
        let best = water[0];
        let bs = -Infinity;
        for (const i of water) {
          let around = 0;
          const col = i % W;
          const row = (i - col) / W;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -2; dc <= 2; dc++) if (set.has((row + dr) * W + col + dc)) around++;
          const score = around * 40 - Math.hypot(centerX(i, W) - c.x, centerY(i, W) - c.y);
          if (score > bs) {
            bs = score;
            best = i;
          }
        }
        const x = centerX(best, W);
        const y = centerY(best, W);
        if (!near(x, y, 'sea', 420)) letter('Sea', gx, gy, 'sea', x, y, 0);
      }
      // Regions: open land with no city in the way.
      if (land.length >= 30 && land.length >= total * 0.5) {
        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const feature: Feature = dominant === 'Mountains' ? 'Hills' : dominant in OUTER ? (dominant as Feature) : 'Open';
        const mid = centroid(land);
        // Anchor on the explored land tile nearest the centroid (a ring of land has a hole).
        let anchor = land[0];
        let bd = Infinity;
        for (const i of land) {
          const d = Math.hypot(centerX(i, W) - mid.x, centerY(i, W) - mid.y);
          if (d < bd) {
            bd = d;
            anchor = i;
          }
        }
        const c = { x: centerX(anchor, W), y: centerY(anchor, W) };
        const col = anchor % W;
        const row = Math.floor(anchor / W);
        let blocked = false;
        for (let dr = -2; dr <= 2 && !blocked; dr++)
          for (let dc = -2; dc <= 2; dc++) if (cityTiles.has(`${col + dc},${row + dr}`)) blocked = true;
        const y = c.y + 20;
        if (!blocked && !near(c.x, y, 'land', 480) && !near(c.x, y, 'range', 320))
          letter(feature, gx, gy, 'land', c.x, y, 0);
      }
    }
  return out;
}
