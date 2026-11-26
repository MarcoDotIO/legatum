import { describe, expect, it } from 'vitest';
import { placeName } from './labels';

const FEATURES = ['Sea', 'Range', 'Forest', 'Desert', 'Tundra', 'Hills', 'Open'] as const;
// Every grid the three map sizes produce (labels.ts: cells of 12 x 9 tiles).
const GRIDS = [[4, 3], [4, 4], [5, 5]] as const;

describe('map place names', () => {
  it('names every cell of every map size, and never the same name twice for one kind of place', () => {
    for (const [nx, ny] of GRIDS)
      for (const salt of [0, 1, 0x5bd1, 0xffffffff])
        for (const feature of FEATURES) {
          const names: string[] = [];
          for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) names.push(placeName(feature, gx, gy, nx, ny, salt)!);
          expect(names.every(Boolean), `${feature} ${nx}x${ny}`).toBe(true);
          expect(new Set(names).size, `${feature} ${nx}x${ny} salt ${salt}`).toBe(names.length);
        }
  });

  it('says where the place lies and what it is, in plain words', () => {
    expect(placeName('Sea', 0, 0, 4, 4, 0)).toMatch(/^The North-Western /);
    expect(placeName('Open', 3, 3, 4, 4, 0)).toMatch(/^The South-Eastern /);
    expect(placeName('Range', 2, 0, 5, 5, 0)).toMatch(/^The Northern /);
    const middle = placeName('Desert', 2, 2, 5, 5, 0)!;
    expect(middle).not.toMatch(/North|South|East|West/);
    const plain = /^The (North-Western|Northern|North-Eastern|Western|Eastern|South-Western|Southern|South-Eastern|Inner|Middle|Great|Central|High|Deep|Open|Cold) [A-Z][a-z]+$|^The Heartland$|^The Great Divide$/;
    for (const [nx, ny] of GRIDS)
      for (const feature of FEATURES)
        for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) expect(placeName(feature, gx, gy, nx, ny, 7)).toMatch(plain);
  });

  it('keeps a place\'s name from game to game only when the salt is the same', () => {
    expect(placeName('Sea', 1, 1, 4, 4, 3)).toBe(placeName('Sea', 1, 1, 4, 4, 3));
    const turned = new Set([0, 1, 2, 3].map((salt) => placeName('Sea', 1, 1, 4, 4, salt)));
    expect(turned.size).toBeGreaterThan(1);
  });
});
