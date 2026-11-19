import { NOISE_EVENT_TYPES } from './noise-event.model';
import { suggestNoiseAction } from './noise-action-suggestions';

describe('suggestNoiseAction', () => {
  it('returns a distinct suggestion with steps for every noise type', () => {
    const titles = NOISE_EVENT_TYPES.map((type) => suggestNoiseAction(type).title);

    expect(new Set(titles).size).toBe(NOISE_EVENT_TYPES.length);
    for (const type of NOISE_EVENT_TYPES) {
      expect(suggestNoiseAction(type).steps.length).toBeGreaterThan(0);
    }
  });

  it('suggests a technical or authority route for system noise and a neighbour contact for music', () => {
    expect(suggestNoiseAction('SYSTEM').steps.join(' ')).toContain('manutentore');
    expect(suggestNoiseAction('MUSIC').steps.join(' ')).toContain('contatto informale');
  });
});
