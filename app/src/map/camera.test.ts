import { describe, expect, it } from 'vitest';
import { registerMapCamera, takeMapHandoff } from './camera';

const host = (x: number, y: number) => ({ viewport: () => ({ x, y, zoom: 1, w: 800, h: 600 }), center: () => {} });

describe('map camera handoff', () => {
  it('passes the closing map centre to the map that opens right after (2D / 3D swap)', () => {
    registerMapCamera(host(120, 340))();
    expect(takeMapHandoff()).toMatchObject({ x: 120, y: 340 });
    expect(takeMapHandoff()).toBeNull();
  });
  it('ignores a map that closed a while ago, so a new game starts on its capital', () => {
    registerMapCamera(host(5, 6))();
    expect(takeMapHandoff(0, Date.now() + 5000)).toBeNull();
  });
  it('drops the old centre when a jump-to was made with the swap (placing a wonder jumps to the city)', () => {
    registerMapCamera({ ...host(7, 8), focusSeq: () => 4 })();
    expect(takeMapHandoff(5)).toBeNull();
    registerMapCamera({ ...host(7, 8), focusSeq: () => 4 })();
    expect(takeMapHandoff(4)).toMatchObject({ x: 7, y: 8 });
  });
});
