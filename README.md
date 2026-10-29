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

La app è pensata per essere installata come PWA e per salvare episodi e allegati nel solo IndexedDB del browser, senza backend nell'MVP. La prima apertura è vuota: i dati dimostrativi sono usati solo nei test. Gli episodi migrati dalla precedente versione localStorage vengono convertiti al modello corrente; i record demo incorporati nella vecchia versione vengono rimossi durante la migrazione.

L'intensità è una valutazione soggettiva da 1 a 5. Le sorgenti indicate dall'utente restano ipotesi e non sono accertamenti. Il form consente di salvare bozze incomplete.

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

## Funzionalità disponibili e limiti

- Diario cronologico locale, ricerca, ordinamento e creazione di bozze.
- Intensità percepita 1–5, tipologie, andamento, stato e contesto dell'episodio.
- Registrazione audio locale per evento o rumore di fondo.
- Non sono ancora implementati modifica, archiviazione/eliminazione degli episodi, allegati immagine, confronto evento/fondo o analisi audio reale.
- La visualizzazione delle frequenze rimane disattivata finché non sarà calcolata da un'analisi reale.
- L'esportazione JSON attuale contiene i metadati degli episodi, non i file audio.
