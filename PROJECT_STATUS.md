# Stato del progetto

Aggiornato il **2026-11-14** mediante lettura del working tree. Questo e'
il contesto sintetico corrente per i prossimi prompt; prevale sulle fotografie
storiche del 1, 8 e 10 novembre. Non certifica la versione online.

## Repository e perimetro verificato

- Repository: [federicocroletti-tech/noise-diary](https://github.com/federicocroletti-tech/noise-diary).
- Branch rilevato: `feat/android-apk`; HEAD iniziale `9b24436`.
- Frontend configurato su [GitHub Pages](https://federicocroletti-tech.github.io/noise-diary/).
- Backend effettivo nel codice: **Neon**, non Supabase. Account e cloud sono
  implementati; la vecchia conversazione che li descriveva come assenti e'
  superata.
- Analisi statica di codice, template, stili, manifest, SQL, workflow e documenti.
  Nessun accesso account, verifica live, deploy, audit vulnerabilita', build o
  test applicativo eseguito in questo aggiornamento solo documentale.
- Non e' stato verificato il piano commerciale/gratuito attuale dei provider,
  ne' quale commit sia attualmente pubblicato.

## Funzionalita'

| Area          | Stato nel codice                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account       | Neon Auth: registrazione email/password, verifica email OTP, accesso, recupero password OTP, sessione e logout.                                                                                                          |
| Diario        | Creazione, bozze, elenco, dettaglio, ricerca testuale, ordinamento data/intensita'/stanza, modifica motivata con snapshot e cancellazione.                                                                               |
| Dati evento   | Luogo, stanza, data/ora, tipo/andamento, intensita' soggettiva 1-5, effetti, ipotesi, note, tag, stato e contesto ambientale. Non sono misure fonometriche.                                                              |
| Locale        | Profili separati nello stesso browser, vault/password/chiave di recupero per profilo, recupero e rotazione chiave, IndexedDB cifrata.                                                                                    |
| Cloud         | Eventi e metadati in PostgreSQL via Data API; audio in Object Storage privato tramite Function e URL firmati. Policy RLS definite per utente.                                                                            |
| Audio         | Registrazione esplicita, pausa/ripresa se supportate, massimo 300 secondi/50 MiB, SHA-256, player, download e cancellazione.                                                                                             |
| Backup        | `.ndbackup` cifrato con eventi/audio, limite UI 120 MiB; import additivo con conflitti o sostitutivo confermato; JSON storico importabile con avviso. Export account con passphrase autonoma, locale con password vault. |
| Trasferimento | Locale e cloud distinti: passaggio tramite backup/import esplicito, non migrazione automatica.                                                                                                                           |
| Eliminazione  | Diario locale o diario account secondo la modalita'; non elimina copie esportate e non equivale a secure erase o necessariamente alla cancellazione dell'identita' Auth.                                                 |
| Guida         | Guida integrata raggiungibile anche prima del login e documento utente; modello JSON importabile.                                                                                                                        |
| Android       | Capacitor configurato; progetto Android e servizio file nativo presenti nel working tree, parte del lavoro ancora non versionata. Non attestata disponibilita' di APK funzionante/release.                               |

Fonti: [App](./src/app/app.ts), [template](./src/app/app.html),
[servizi](./src/app/services), [audio](./src/app/audio),
[modello](./src/app/domain/noise-event.model.ts).

## Codice e architettura

- Angular 22 standalone, TypeScript 6, RxJS 7, signals, SCSS custom, Web Crypto,
  IndexedDB e Angular Service Worker; Capacitor 8 per il contenitore Android.
- Il componente principale concentra ancora autenticazione, form, stato UI,
  import/export e orchestrazione locale/cloud. Servizi separati per Auth,
  database, audio, vault, profili e backup: evolvere senza ricreare queste funzioni.
- La guida usa il router e un `router-outlet`; non descrivere piu' il routing
  come completamente vuoto.
- SQL in [001_user_diaries.sql](./database/migrations/001_user_diaries.sql):
  tabelle `diary_events` e `diary_audio_clips`, payload JSONB, chiavi composte
  `(user_id, id)`, FK audio-evento e RLS con `auth.user_id()`.
- La [Function audio](./functions/diary-audio/index.ts) media l'accesso allo
  storage. SQL e sorgenti non provano che configurazione e policy remote siano
  attualmente distribuite e corrette.
- Architettura dettagliata: [CURRENT_ARCHITECTURE.md](./docs/CURRENT_ARCHITECTURE.md).

## Grafica, UX e impostazioni

- Tema scuro custom blu/notte, accenti ciano/verde acqua, pannelli e controlli
  arrotondati; font di sistema. Nessuna libreria componenti UI nel manifest.
- Header con identita' account/profilo, guida, azione episodio e menu Backup e
  Account/Profilo; riepilogo con quattro indicatori, modulo raggruppato,
  elenco/dettaglio e stati vuoti/ricerca senza risultati.
- Layout responsive con breakpoint 980 e 640 px, griglie adattive, focus
  visibile e supporto `prefers-reduced-motion`.
- Presenza di test di layout non equivale a certificazione WCAG, verifica con
  screen reader o collaudo Android reale. Nessuna nuova verifica visuale svolta.
- Impostazioni operative: account o locale, scelta profilo, lock, recupero e
  rotazione chiave, ordinamento/ricerca, backup/import e cancellazione.
  Non risulta un pannello generale impostazioni, editor account/ruoli,
  selettore tema/lingua o timeout di inattivita'.
- Restano testi da rifinire, ad esempio `Torna all?account` nel template.

Fonti: [stili globali](./src/styles.scss), [stili App](./src/app/app.scss),
[template](./src/app/app.html), [guida](./docs/guida-utente.md).

## Configurazione e pubblicazione

- Endpoint pubblici Neon Auth/Data API/Function definiti in
  [neon-config.ts](./src/app/services/neon-config.ts); non aggiungere credenziali
  amministrative al frontend.
- [capacitor.config.ts](./capacitor.config.ts): app ID
  `tech.federicocroletti.noisediary`, bundle web in
  `dist/noise-diary-app/browser`, origine HTTPS con hostname
  `federicocroletti-tech.github.io`. Cambiarla richiede verificare CORS/Auth.
- Android richiede SDK/JDK e verifica separata: consultare
  [README](./README.md); la guida Android locale non era ancora tracciata
  all'inizio dell'analisi. Account cloud senza coda scritture offline.
- Service worker production per bundle/assets, non backup del diario.
- Workflow PR: contenuti, formattazione, unit test, Playwright Chromium e build.
  Deploy Pages su push `main` o avvio manuale: unit test, E2E, build e publish.
  Nessun job Android o distribuzione backend nei due workflow esaminati.
- SMTP dedicato indicato come necessario dalla documentazione per uso pubblico;
  configurazione effettiva non ricontrollata.

## Verifiche e comandi di riferimento

Comandi definiti in [package.json](./package.json):
`npm test`, `npm run e2e`, `npm run build`, `npm run lint`,
`npm run content:check`, `npm run android:sync`, `npm run android:apk`.
Non rieseguiti per questa revisione documentale: non riusare i vecchi conteggi
test/esiti come se descrivessero il branch corrente.

- Vitest/fake-indexeddb per servizi e componente.
- Playwright in [e2e](./e2e), progetti desktop Chrome e Pixel 7, lingua italiana,
  fuso Europe/Rome, server locale porta 4317; copertura diario locale,
  intestazione/guida, modulo, ricerca e layout. Non dimostra isolamento reale
  fra due account remoti o funzionamento della WebView Android.
- `lint` controlla Markdown/YAML/tools con Prettier, non e' un lint TypeScript.
- Build Angular production: budget iniziale warning 500 kB/errore 1 MB;
  stile componente warning 4 kB/errore 8 kB.

## Regole e limiti da preservare

- **Cloud non E2EE:** Neon conserva contenuti accessibili lato servizio; RLS
  separa gli account. AES-GCM/PBKDF2 protegge il vault locale e i backup, non
  trasforma automaticamente i dati cloud in cifrati end-to-end.
- Non inviare password/chiavi private al repository, non committare backup o
  dati reali. [.gitignore](./.gitignore) esclude `.env`, backup e `.ndbackup`.
- Conservare compatibilita' dei backup, dati preesistenti e separazione profili.
  Operazioni distruttive e import sostitutivi richiedono conferma.
- Audio/hash non dimostrano sorgente, responsabilita', autenticita' o conformita'
  normativa; osservazioni, ipotesi e misurazioni vanno tenute distinte.
- Governance: PR, Code Owners, controllo contenuti/fonti e revisione pertinente;
  protezioni GitHub richieste nei documenti ma non verificate dal checkout.
- Codice MIT, contenuti/documentazione CC BY 4.0. Nessuna riscrittura della
  cronologia o bonifica storica senza autorizzazione separata.

Riferimenti: [GOVERNANCE](./GOVERNANCE.md), [CONTRIBUTING](./CONTRIBUTING.md),
[PRIVACY](./PRIVACY.md), [SECURITY](./SECURITY.md),
[regole editoriali](./docs/content-review-policy.md).

## Lacune e prossime verifiche, non nuove implementazioni

1. Completare e collaudare il lavoro Android esistente: import/export/condivisione,
   microfono, sessione, rete e build APK su dispositivo reale.
2. Verificare due account remoti, RLS/storage, errori parziali DB/blob e concorrenza
   durante scritture/import; non presumere atomicita' cloud.
3. Confermare versione Pages, configurazioni remote, SMTP e limiti/costi provider.
4. Mancano pipeline acustica reale (pannello frequenze placeholder), planimetria,
   PDF/fascicoli, immagini/video, ruoli amministrativi applicativi e conservazione
   esplicita del fuso originale.
5. Accessibilita' completa, retention e lock automatico restano da definire/verificare.

## Stato Git da non confondere con una release

All'inizio: nessuna modifica staged; modificati README, guida utente, guida import,
manifest, App e componente guida; non tracciati progetto Android, guida Android,
servizio file nativo e relativo test. Questo intervento committa soltanto i
documenti di contesto esplicitamente selezionati, non quel lavoro applicativo.
Ricontrollare `git status` prima di ogni prossimo intervento; nessun push o deploy
e' incluso in questa attivita'.
