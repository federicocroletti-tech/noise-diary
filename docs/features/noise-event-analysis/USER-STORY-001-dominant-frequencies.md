# Prima user story: frequenze dominanti dal dettaglio episodio

Stato: proposta, non ancora avviata. Nessun branch creato.

## Storia

Come utente, apro il dettaglio di un episodio che ha una registrazione e vedo le frequenze dominanti calcolate localmente, così capisco il tipo di rumore senza ascoltare tutto.

## Criteri di accettazione

1. Se l'episodio ha un clip audio, il pannello "Analisi frequenze" mostra un'analisi calcolata sul dispositivo; l'analisi non viene inviata a nessun servizio.
2. Su un clip di 300 s l'analisi termina entro un tempo da fissare dopo una misura reale; durante il calcolo la UI resta utilizzabile e mostra uno stato di attesa.
3. Il risultato è salvato con l'episodio e riletto alla riapertura senza ricalcolo.
4. Se l'analisi fallisce o il browser non supporta Web Audio, il pannello mostra un messaggio testuale e l'episodio resta intatto.
5. Il pannello è navigabile da tastiera e ha un'alternativa testuale alle bande (elenco con valori).
6. Nessun episodio senza audio mostra il pannello come attivo.

## Fuori scope

- Forma d'onda e spettrogramma (storie successive).
- Analisi lato server o AI.
- Modifiche al backup `.ndbackup`.

## File probabili

- `src/app/audio/` (nuovo servizio di analisi, con spec).
- `src/app/domain/noise-event.model.ts` (allineamento di `AudioAnalysis`).
- `src/app/services/noise-event.repository.ts` e `src/app/services/neon-diary.service.ts` (salvataggio del risultato).
- `src/app/app.html` e `src/app/app.scss` (pannello).

## Test previsti

- Unit: calcolo FFT su un segnale sintetico con frequenza nota (es. 1 kHz) che restituisce la banda attesa.
- Unit: errore gestito quando il clip non decodifica.
- Esistenti da mantenere verdi: `npm test` (78 test) e `npm run build`.

## Passo di verifica manuale

Su browser desktop e sull'APK Android: registrare un clip di 30 s, aprire il dettaglio, verificare il pannello e la riapertura.
