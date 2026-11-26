import { describe, expect, it } from 'vitest';
import { mapUnitMiniatureUrl, unitMiniatureUrl } from '../unitArt';

describe('mapUnitMiniatureUrl (the art every map draws for a unit)', () => {
  const factionOf = new Map([[0, 'Aztecs' as const], [1, 'Switzerland' as const]]);
  it("uses the owner's own faction, not a seat colour", () => {
    expect(mapUnitMiniatureUrl({ kind: 'Spearman', owner: 0 }, factionOf, false)).toBe(unitMiniatureUrl('Spearman', 'Aztecs'));
  });
  it("prefers the unit's origin (a hired Company keeps its people's figure)", () => {
    expect(mapUnitMiniatureUrl({ kind: 'Pikeman', owner: 0, origin: 'Switzerland' }, factionOf, false)).toBe(unitMiniatureUrl('Pikeman', 'Switzerland'));
  });
  it("gives barbarians their own raider art", () => {
    const url = mapUnitMiniatureUrl({ kind: 'Spearman', owner: 255 }, factionOf, true);
    expect(url).toBeTruthy();
    expect(url).not.toBe(unitMiniatureUrl('Spearman'));
  });
});
