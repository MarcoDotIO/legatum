// @vitest-environment happy-dom
import { useCombatFx } from '../feel';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FixtureClient } from '../test/fixtureEngine';
import { useGame } from '../store';
import { withV2 } from '../test/vpV2Fixture';
import { EraObjectivesResearch } from './EraObjectives';
import type { PlayerView } from '../types';

let host: HTMLElement, root: Root, base: PlayerView;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  useGame.setState(useGame.getInitialState(), true);
  const client = new FixtureClient();
  await client.newGame(await client.standardSetup('42', 'India', 'Byzantium', 'Ada', 'Bo'));
  base = structuredClone(client.view(0));
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

const rows = (el: Element) => [...el.querySelectorAll('[data-testid=era-objective]')].map((l) => [l.getAttribute('data-family'), l.querySelector('.eo-num')?.textContent]);

describe('the research screen header', () => {
  const research = (view: PlayerView) => { act(() => root.render(<EraObjectivesResearch view={view} />)); return host.querySelector<HTMLElement>('[data-testid=research-objectives]')!; };

  it('shows the card of the Age in focus with progress, and when the next Age begins', () => {
    const el = research(withV2(base, { era: 3, scored: [2] }));
    expect(el.querySelector('[data-testid=research-objectives-current] h4')?.textContent).toMatch(/^\w+ Age: score 1 VP$/);
    expect(el.querySelector('[data-testid=research-objectives-current] .eor-seal')).not.toBeNull();
    expect(rows(el.querySelector('[data-testid=research-objectives-current]')!)).toEqual([['Expand', '6/14'], ['Expand', '11/40'], ['Fight', '0/1']]);
    expect(el.querySelector('[data-testid=research-objectives-next]')?.textContent).toBe('The next Age begins when any empire enters the Renaissance era.');
  });

  it('names the Machine Age once: its era name already ends in Age', () => {
    const machine = (scored: number[]) => {
      const view = withV2(base, { era: 3, scored });
      view.eras.find((e) => e.era === 3)!.name = 'Machine Age';
      return view;
    };
    expect(research(machine([2])).querySelector('[data-testid=research-objectives-current] h4')?.textContent).toBe('Machine Age: score 1 VP');
    expect(research(machine([2, 3])).querySelector('[data-testid=research-objectives-current] h4')?.textContent).toBe('Machine Age: 1 VP scored');
  });

  it('stamps the seal in once per Age state, flashes a newly met card once, and stays still with animations off', () => {
    const media = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      act(() => useCombatFx.getState().update({ enabled: false }));
      const still = research(withV2(base, { era: 3, scored: [], progress: { '3:0': [14, 14], '3:1': [11, 40], '3:2': [0, 1] } }));
      expect(still.querySelector('.eor-seal.stamp')).toBeNull();
      expect(still.querySelectorAll('.eo-line.flash')).toHaveLength(0);
      act(() => root.render(<></>));
      act(() => useCombatFx.getState().update({ enabled: true }));
      // A state not yet shown with animations on: the Medieval Age once you scored it, with its met card.
      const view = withV2(base, { era: 3, scored: [3], progress: { '3:0': [14, 14], '3:1': [11, 40], '3:2': [0, 1] } });
      const first = research(view);
      expect(first.querySelector('.eor-seal.stamp')).not.toBeNull();
      act(() => root.render(<></>));
      const again = research(view);
      expect(again.querySelector('.eor-seal.stamp')).toBeNull();
      expect(again.querySelectorAll('.eo-line.flash')).toHaveLength(0);
    } finally { window.matchMedia = media; }
  });

  it('before any Age begins it says so and when the first one does', () => {
    const el = research({ ...withV2(base, { era: 1, scored: [] }), eras: [], objective_progress: [] });
    expect(el.querySelector('[data-testid=research-objectives-current] h4')?.textContent).toBe('No Age has begun');
    expect(el.textContent).toContain('The first Age begins when any empire enters the Classical era');
    expect(el.querySelector('[data-testid=research-objectives-next]')).toBeNull();
    expect(el.querySelector('.eor-seal')).toBeNull();
  });
});
