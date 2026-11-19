# Audit: dettaglio evento acustico e analisi audio

Stato: documento di audit (fase 0-10). Nessuna modifica al codice applicativo. Aggiornato il 2026-11-19 allo stato di `main` (`baf559b`).

## 1. Stato di partenza

- Branch: `main`, allineato a `origin/main`.
- Test: `npm test -- --watch=false` → 11 file, 85 test, tutti superati.
- Build: `npm run build` → completata. Resta un avviso: `src/app/app.scss` supera il budget di 4.00 kB (totale 7.91 kB, sotto il limite d'errore di 8 kB, con margine minimo).

## 2. Classificazione

**PARZIALE.** Il dettaglio evento e la registrazione audio esistono. Analisi delle frequenze e visualizzazioni (forma d'onda, spettrogramma, grafici interattivi) non sono implementate.

## 3. Evidenze

| Capacità                                | Stato                                                  | Evidenza                                                                                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dettaglio evento                        | Presente, come vista interna e non come rotta          | `DiaryView = 'detail'` in [app.ts](../../../src/app/app.ts); template `#detailTpl` in [app.html](../../../src/app/app.html). Nessuna rotta `/events/:id` in [app.routes.ts](../../../src/app/app.routes.ts) (solo `guida` e `mappa`). |
| Registrazione audio esplicita           | Presente, più allegato di un file audio già registrato | [audio-recording.service.ts](../../../src/app/audio/audio-recording.service.ts), limiti 300 s / 50 MiB (da `PROJECT_STATUS.md`).                                                                                                      |
| Persistenza clip                        | Presente                                               | [audio-clip.repository.ts](../../../src/app/audio/audio-clip.repository.ts) (IndexedDB), [neon-audio.repository.ts](../../../src/app/services/neon-audio.repository.ts) (cloud).                                                      |
| Player, download, eliminazione, SHA-256 | Presenti                                               | [app.html](../../../src/app/app.html) (`<audio controls>`, "Scarica copia", "Elimina", hash in `<details>`).                                                                                                                          |
| Modello analisi                         | Solo tipo                                              | `AudioAnalysis`, `FrequencyBand` in [noise-event.model.ts](../../../src/app/domain/noise-event.model.ts). Nessun codice li produce né li legge (ricerca `dominantFrequencies                                                          | bands | AudioContext | Analyser`in`src/`: solo le definizioni). |
| Pannello frequenze                      | Placeholder                                            | "Analisi frequenze (informativa)" con "Analisi non disponibile" in [app.html](../../../src/app/app.html). Stile `.frequency-chart` in [app.scss](../../../src/app/app.scss) non usato per dati reali.                                 |
| Forma d'onda / spettrogramma            | Assenti                                                | Nessun `AnalyserNode`, `decodeAudioData` o canvas audio.                                                                                                                                                                              |
| Guida utente                            | Dichiara l'assenza                                     | [user-guide.html](../../../src/app/user-guide/user-guide.html): "l'analisi delle frequenze non è attualmente disponibile".                                                                                                            |
| Backup                                  | Presente, senza audio analisi                          | `.ndbackup` (AES-GCM/PBKDF2), da `PROJECT_STATUS.md`. Da verificare se include i clip.                                                                                                                                                |

## 4. Mancanze

1. Calcolo dell'analisi (FFT, bande, frequenze dominanti) da clip o da `AudioContext`.
2. Persistenza di `AudioAnalysis` (nessuno store né campo in IndexedDB o Neon).
3. Forma d'onda e spettrogramma (nessun renderer).
4. Grafici interattivi e accessibilità (alternativa testuale, tastiera) per il pannello.
5. Rotta o deep link per il dettaglio evento (oggi solo stato interno; può essere voluto, da decidere).
6. Privacy: l'analisi di audio ambientale richiede una decisione su cosa resta locale e cosa va nel cloud.

## 5. Debito tecnico

- `app.html` molto grande, con template del dettaglio inline in `app.ts`.
- `app.scss` supera il budget di build (7.91 kB contro 4.00 kB); gli stili nuovi vanno in `src/styles.scss`.
- Modello `AudioAnalysis` non collegato: rischio di divergenza se si implementa senza allinearlo.

## 6. Test

- Esistenti e superati: `audio-clip.repository.spec.ts`, `audio-recording.service.spec.ts`, `noise-storage.service.spec.ts`, `app.spec.ts`, `plan-analyzer.spec.ts` (85 test totali).
- Non esistono test per analisi, forma d'onda o spettrogramma (per definizione, non ancora implementati).

## 7. Rischi

- Dati personali: audio ambientale può contenere voci. Blocco per repo pubblico (vedi `docs/OPEN_QUESTIONS.md`).
- Dimensione clip (fino a 50 MiB) durante l'analisi nel browser: rischio di blocco UI, da misurare.
- Sul dispositivo Android (Capacitor) il comportamento di `AudioContext` va verificato.

## 8. Duplicazioni

- `AudioAnalysis` e `ExternalMeasurement` in `noise-event.model.ts` hanno campi simili (`sampleRate`, `bands`, note). Decidere quale modello usare prima di implementare.

## 9. Prossimo passo consigliato

Non creare branch né modificare il codice finché il proprietario non autorizza la fase successiva. Proposta:

1. ADR: decidere se l'analisi resta locale nel browser (Web Audio + FFT) e quali dati entrano nel cloud.
2. Prima user story: "Come utente, apro il dettaglio di un episodio con audio e vedo le frequenze dominanti calcolate localmente, con alternativa testuale." Criteri: calcolo entro un tempo massimo su clip di 300 s, nessun dato lasciato dal dispositivo senza consenso, pannello accessibile da tastiera, test unitari sul calcolo.
3. File probabili: `src/app/audio/` (nuovo servizio di analisi), `src/app/domain/noise-event.model.ts`, `src/app/app.html` (pannello), `src/app/app.scss`, spec corrispondenti.

## 10. Nota sulla classificazione

Le etichette di stato definite nel brief non sono state rilevate in questa sessione; la classificazione "PARZIALE" va confermata dal proprietario.
