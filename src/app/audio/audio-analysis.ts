import { FrequencyBand } from '../domain/noise-event.model';

export const FFT_SIZE = 4096;
const BAND_EDGES_HZ = [0, 125, 250, 500, 1000, 2000, 4000, 8000];
const DOMINANT_PEAK_COUNT = 3;

export interface SpectrumSummary {
  dominantFrequencies: number[];
  bands: FrequencyBand[];
}

export interface DecodedAudio {
  sampleRate: number;
  samples: Float32Array;
}

function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < size / 2; k++) {
        const a = start + k;
        const b = a + size / 2;
        const tRe = re[b] * curRe - im[b] * curIm;
        const tIm = re[b] * curIm + im[b] * curRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function formatBandLabel(lowHz: number, highHz: number): string {
  return `${lowHz}–${highHz} Hz`;
}

export function summarizeSpectrum(samples: Float32Array, sampleRate: number): SpectrumSummary {
  const half = FFT_SIZE / 2;
  const averageMagnitude = new Float64Array(half);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const window = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
  }

  let frames = 0;
  for (let start = 0; start < Math.max(samples.length, 1); start += FFT_SIZE) {
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = (samples[start + i] ?? 0) * window[i];
      im[i] = 0;
    }
    fftInPlace(re, im);
    for (let k = 0; k < half; k++) {
      averageMagnitude[k] += Math.hypot(re[k], im[k]);
    }
    frames++;
  }
  for (let k = 0; k < half; k++) {
    averageMagnitude[k] /= frames;
  }

  const binHz = sampleRate / FFT_SIZE;
  const peaks: { hz: number; magnitude: number }[] = [];
  for (let k = 1; k < half - 1; k++) {
    const value = averageMagnitude[k];
    if (value > 0 && value >= averageMagnitude[k - 1] && value > averageMagnitude[k + 1]) {
      peaks.push({ hz: Math.round(k * binHz * 10) / 10, magnitude: value });
    }
  }
  peaks.sort((a, b) => b.magnitude - a.magnitude);
  const dominantFrequencies = peaks.slice(0, DOMINANT_PEAK_COUNT).map((peak) => peak.hz);

  const nyquist = sampleRate / 2;
  const edges = [...BAND_EDGES_HZ.filter((hz) => hz < nyquist), nyquist];
  const bandMeans: number[] = [];
  for (let b = 0; b < edges.length - 1; b++) {
    const from = Math.max(1, Math.ceil(edges[b] / binHz));
    const to = Math.min(half - 1, Math.floor(edges[b + 1] / binHz));
    let sum = 0;
    let count = 0;
    for (let k = from; k <= to; k++) {
      sum += averageMagnitude[k];
      count++;
    }
    bandMeans.push(count > 0 ? sum / count : 0);
  }
  const maxMean = Math.max(...bandMeans, 0);
  const bands: FrequencyBand[] = bandMeans.map((mean, index) => ({
    label: formatBandLabel(Math.round(edges[index]), Math.round(edges[index + 1])),
    amplitude: maxMean > 0 ? Math.round((mean / maxMean) * 1000) / 1000 : 0,
  }));

  return { dominantFrequencies, bands };
}

export async function decodeAudioBlob(blob: Blob): Promise<DecodedAudio> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
      buffer.getChannelData(index),
    );
    const samples = new Float32Array(buffer.length);
    for (const channel of channels) {
      for (let i = 0; i < channel.length; i++) {
        samples[i] += channel[i] / channels.length;
      }
    }
    return { sampleRate: buffer.sampleRate, samples };
  } finally {
    await context.close();
  }
}
