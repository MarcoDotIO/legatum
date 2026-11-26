import { describe, expect, it } from 'vitest';
import { needsFlatMap } from './mapPrefs';

describe('needsFlatMap', () => {
  const none = { place: null, air: { plane: null, what: null } };
  it('keeps the 3D map when no tile picker is open', () => {
    expect(needsFlatMap(none)).toBe(false);
  });
  it('shows the flat map while placing a wonder or buying a tile', () => {
    expect(needsFlatMap({ ...none, place: { city: 1, building: null, intent: 'tile', pick: null } })).toBe(true);
  });
  it("shows the flat map while picking an aircraft's target", () => {
    expect(needsFlatMap({ ...none, air: { plane: 3, what: 'Strike' } })).toBe(true);
    expect(needsFlatMap({ ...none, air: { plane: 3, what: null } })).toBe(false);
  });
});
