import { describe, expect, it } from 'vitest';
import { detectKind, floorTokens, kindFromFloorToken, rectBetween } from './plan-analyzer';

describe('plan analyzer', () => {
  it('builds the manual crop from a drag in any direction and clamps it to the page', () => {
    const first = rectBetween({ x: 0.6, y: 0.5 }, { x: 0.2, y: 0.1 });
    expect(first.x).toBeCloseTo(0.2);
    expect(first.y).toBeCloseTo(0.1);
    expect(first.w).toBeCloseTo(0.4);
    expect(first.h).toBeCloseTo(0.4);
    const clamped = rectBetween({ x: 0.9, y: 0.9 }, { x: 1.4, y: -0.2 });
    expect(clamped.x).toBeCloseTo(0.9);
    expect(clamped.y).toBe(0);
    expect(clamped.w).toBeCloseTo(0.1);
    expect(clamped.h).toBeCloseTo(0.9);
  });

  it('reads the floors declared in the cadastral title block', () => {
    expect(floorTokens([{ str: 'x' }, { str: 'VIA CARLO PERINI n. 18 Piano 3-S2' }])).toEqual(['3', 'S2']);
    expect(floorTokens([{ str: 'nessun piano' }])).toEqual([]);
  });

  it('maps underground floors to the cellar and upper floors to the apartment', () => {
    expect(kindFromFloorToken('3')).toBe('apartment');
    expect(kindFromFloorToken('S2')).toBe('cellar');
    expect(kindFromFloorToken(undefined)).toBe('other');
  });

  it('detects room kinds from captions', () => {
    expect(detectKind('PIANO TERZO ABITAZIONE H= 270')).toBe('apartment');
    expect(detectKind('PIANO SECONDO INTERRATO CANTINA')).toBe('cellar');
    expect(detectKind('PIANO QUARTO SOLAIO')).toBe('attic');
    expect(detectKind('PIANO TERRA BOX')).toBe('garage');
  });
});
