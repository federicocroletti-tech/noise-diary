import { FFT_SIZE, summarizeSpectrum } from './audio-analysis';

describe('summarizeSpectrum', () => {
  it('finds the dominant frequency of a pure tone', () => {
    const sampleRate = 48000;
    const samples = new Float32Array(sampleRate);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * 1500 * i) / sampleRate);
    }

    const { dominantFrequencies, bands } = summarizeSpectrum(samples, sampleRate);

    expect(Math.abs(dominantFrequencies[0] - 1500)).toBeLessThan(sampleRate / FFT_SIZE);
    const loudest = bands.reduce((best, band) => (band.amplitude > best.amplitude ? band : best));
    expect(loudest.label).toBe('1000–2000 Hz');
    expect(loudest.amplitude).toBe(1);
  });

  it('returns no peaks and zero bands for silence', () => {
    const result = summarizeSpectrum(new Float32Array(FFT_SIZE), 48000);

    expect(result.dominantFrequencies).toEqual([]);
    expect(result.bands.every((band) => band.amplitude === 0)).toBe(true);
  });
});
