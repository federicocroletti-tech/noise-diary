# Diario Rumore

PWA local-first per documentare episodi di rumore domestico e ambientale attraverso un diario cronologico, registrazioni audio, immagini, note e confronti informativi con il rumore di fondo.

## Requisiti

- Node.js 22+
- npm 10+
- Angular 22

## Avvio

```bash
npm install
npm start
```

La app è pensata per essere installata come PWA e per salvare i dati localmente nel browser senza backend nell'MVP.

## Registrazioni audio

- La registrazione parte solo dopo aver premuto esplicitamente **Avvia registrazione** e con il permesso del microfono.
- È possibile registrare l'evento o il rumore di fondo, mettere in pausa/riprendere se il browser lo supporta, ascoltare, scaricare una copia ed eliminare il file.
- I file originali e i metadati sono conservati nel solo IndexedDB del browser; non vengono caricati su servizi remoti.
- Ogni acquisizione include formato MIME, dimensione, durata, timestamp, origine microfono, piattaforma e hash SHA-256.
- Ogni registrazione è limitata a 5 minuti e 50 MB. La capacità effettiva dipende da browser, dispositivo e spazio disponibile.
- L'accesso al microfono richiede HTTPS, salvo `localhost`, e un browser con MediaRecorder e IndexedDB compatibili.
- I test usano esclusivamente fixture audio sintetiche; nessuna registrazione reale è inclusa nel repository.

Le registrazioni sono file audio digitali non calibrati. Non costituiscono misure fonometriche professionali e non consentono di determinare automaticamente una sorgente o responsabilità.

## Verifica

```bash
npm test
npm run build
```
