# ADR-001: Calcolo dell'analisi audio nel browser

Stato: proposta, in attesa di approvazione del proprietario.

## Contesto

L'app registra audio esplicito (max 300 s / 50 MiB) e salva i clip in IndexedDB e, quando configurato, nel cloud Neon. Il modello `AudioAnalysis` in [noise-event.model.ts](../../../src/app/domain/noise-event.model.ts) esiste ma non è prodotto da nessun codice. Il pannello frequenze in [app.html](../../../src/app/app.html) è un placeholder. L'audio ambientale può contenere voci o dati personali.

## Decisione proposta

1. L'analisi viene calcolata localmente nel browser (Web Audio: decodifica e FFT) a partire dal clip già salvato.
2. Il risultato (bande, frequenze dominanti, sampleRate) viene salvato come metadato dell'episodio, non come audio aggiuntivo.
3. Nessun invio di audio o di analisi al cloud senza una decisione separata e esplicita del proprietario.
4. Nessun servizio esterno o AI in questa fase.

## Conseguenze

- Positive: nessun costo di backend, nessun nuovo dato personale esposto, funziona offline.
- Negative: l'analisi dipende dalle capacità del browser e del WebView Android; clip da 50 MiB possono bloccare la UI se elaborate nel thread principale.
- Da verificare: comportamento di `AudioContext` e `decodeAudioData` nel WebView Capacitor 8.

## Alternative scartate

- Analisi lato server (Neon Function): richiede invio dell'audio, quindi decisione privacy non ancora presa.
- Servizio esterno di analisi: nessun fornitore approvato; contrario alle regole di privacy del progetto.

## Domande aperte per il proprietario

- Il modello `AudioAnalysis` va adattato o sostituito? `ExternalMeasurement` ha campi simili.
- Il risultato va incluso nel backup `.ndbackup`?
