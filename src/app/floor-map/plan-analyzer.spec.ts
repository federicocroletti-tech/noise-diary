import { describe, expect, it } from 'vitest';
import { detectKind, floorTokens, kindFromFloorToken } from './plan-analyzer';

describe('plan analyzer', () => {
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
