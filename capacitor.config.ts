import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tech.federicocroletti.noisediary',
  appName: 'Diario Rumore',
  webDir: 'dist/noise-diary-app/browser',
  server: {
    hostname: 'federicocroletti-tech.github.io',
    androidScheme: 'https',
  },
};

export default config;
