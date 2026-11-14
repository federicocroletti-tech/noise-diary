# NOYSE: analisi e piano di evoluzione

> Fotografia storica del 2026-11-10, non inventario attuale.
> Per il checkout del 2026-11-14 leggere [PROJECT_STATUS.md](../PROJECT_STATUS.md):
> guida con routing, test E2E e lavoro Android Capacitor sono successivi.
> Le assenze riportate sotto vanno ricontrollate prima di aprire nuovi task.

Data: 2026-11-10. Repository personale: `federicocroletti-tech/noise-diary`.

## Ambito e metodo

Questa valutazione riguarda il working tree locale, incluse le modifiche non committate trovate all'avvio. Non descrive necessariamente il sito pubblicato. Sono stati esaminati frontend, modelli, servizi locali/cloud, acquisizione audio, migrazione SQL, Function storage, configurazioni, test, workflow e documentazione progettuale. Dipendenze, build, cache e backup personali non sono sorgenti da inventariare e non sono stati usati come dati di analisi.

L'audit del 1 novembre in [PROJECT_AUDIT.md](./PROJECT_AUDIT.md) resta una fotografia storica: alcune carenze sono state superate dalle modifiche locali successive. Nessun commit, branch, push, deploy, migrazione remota, cambio account o modifica amministrativa Neon e' stato eseguito in questo intervento.

Limiti: configurazione effettiva dei provider, SMTP, policy distribuite, autorizzazioni storage, retention, segreti nella cronologia e comportamento su dispositivi nativi non verificati. Non sono stati eseguiti accessi con account reali, registrazioni di persone o analisi di audio privati. Non e' una certificazione di sicurezza, acustica o legale.

## Executive Summary

NOYSE non parte da zero. Esistono gia' un diario strutturato, audio con metadati e hash, correzioni motivate, vault locale cifrato, profili locali, backup cifrato e integrazione cloud Neon/PostgreSQL/S3. Non vanno ricreati.

Il prodotto non e' ancora pronto come diario tecnico professionale: autenticazione solo email/password, affidabilita' cloud da consolidare, dettaglio incompleto, nessuna pipeline acustica, nessuna planimetria integrata, nessun PDF, nessun ruolo amministrativo applicativo e nessun progetto nativo Ionic/Capacitor.

Scelta architetturale: evoluzione incrementale, non riscrittura. Preservare dati e compatibilita' dei backup; separare responsabilita' prima di introdurre elaborazioni costose. Le valutazioni automatiche descriveranno somiglianze, non cause, responsabilita' o conformita' normativa.

## Inventario Verificato

| Area                   | Stato reale                                                                                                                | Evidenza                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend               | Angular 22 standalone, TypeScript 6, signals e template custom; router vuoto                                               | [package.json](../package.json), [App](../src/app/app.ts), [routes](../src/app/app.routes.ts)                                        |
| Strict                 | Controlli TypeScript e template attivati e build verificata in questo incremento                                           | [tsconfig](../tsconfig.json)                                                                                                         |
| Account                | Sessione, registrazione email/password, verifica email OTP, reset password OTP, logout                                     | [NeonAuthService](../src/app/services/neon-auth.service.ts)                                                                          |
| Profilo online e ruoli | Identita' visualizzata; nessun editor profilo o ruolo utente/amministratore applicativo                                    | [App](../src/app/app.ts), [schema SQL](../database/migrations/001_user_diaries.sql)                                                  |
| Locale                 | Profili separati, password, recupero/rotazione chiave, AES-GCM e PBKDF2, IndexedDB                                         | [LocalProfileService](../src/app/services/local-profile.service.ts), [LocalVaultService](../src/app/services/local-vault.service.ts) |
| Diario                 | Creazione, modifica con motivo/snapshot, cancellazione, ricerca e ordinamento                                              | [App](../src/app/app.ts), [NoiseEvent](../src/app/domain/noise-event.model.ts)                                                       |
| Audio                  | MediaRecorder, pausa/ripresa ove disponibili, 300 secondi/50 MiB, SHA-256, player, download e cancellazione                | [AudioRecordingService](../src/app/audio/audio-recording.service.ts), [template](../src/app/app.html)                                |
| Cloud dati             | Tabelle JSONB per eventi e audio, proprietario da identita' autenticata, policy RLS e FK composite definite nel repository | [schema SQL](../database/migrations/001_user_diaries.sql), [NeonDiaryService](../src/app/services/neon-diary.service.ts)             |
| Cloud audio            | Bucket privato, URL firmati, verifica JWT, download con controllo dimensione/hash                                          | [Function](../functions/diary-audio/index.ts), [NeonAudioRepository](../src/app/services/neon-audio.repository.ts)                   |
| Backup                 | Envelope/payload versionati, eventi e audio cifrati, import aggiuntivo/conflitti e sostituzione; limite UI 120 MiB         | [LocalBackupService](../src/app/services/local-backup.service.ts), [App](../src/app/app.ts)                                          |
| Statistiche            | Numero eventi e media aritmetica dell'intensita' soggettiva                                                                | [App](../src/app/app.ts)                                                                                                             |
| Analisi frequenze      | Placeholder esplicito, non analisi calcolata; interfacce preparatorie non integrate                                        | [template](../src/app/app.html), [modello](../src/app/domain/noise-event.model.ts)                                                   |
| Planimetria/GPS/mappa  | Nessuna implementazione trovata in sorgenti o asset; solo proposta progettuale                                             | [brief precedente](./INITIAL_PROJECT_BRIEF.md), [roadmap precedente](./ROADMAP.md)                                                   |
| Immagini/video/report  | Nessun flusso di upload immagini/video o generazione PDF                                                                   | [template](../src/app/app.html), [dipendenze](../package.json)                                                                       |
| Mobile                 | PWA/service worker, non app Ionic/Capacitor; nessun progetto Android/iOS presente                                          | [config Angular](../angular.json), [service worker](../ngsw-config.json)                                                             |
| CI                     | Test/build frontend, controlli contenuti e formattazione; nessun gate backend separato                                     | [workflow PR](../.github/workflows/content-validation.yml), [workflow deploy](../.github/workflows/deploy-pages.yml)                 |

## Problemi E Priorita'

P0 indica un blocco da risolvere prima di ampliare il rilascio; non implica che sia avvenuto un incidente. P1 indica il nucleo del prodotto, P2 gli incrementi successivi.

### Sicurezza E Privacy

- **P0, corretto localmente:** gli ID audio `.` e `..` superavano il controllo della Function; la costruzione con `URL` puo' normalizzarli rimuovendo parte del percorso previsto. Ora sono rifiutati. Verificati 13 casi sul validatore; autorizzazioni storage e comportamento della Function distribuita restano da verificare. Fonte: [Function](../functions/diary-audio/index.ts).
- **P0, corretto localmente:** il dettaglio account dichiarava audio solo nel browser e nessun upload online. Il consenso ora distingue locale/cloud e chiarisce l'assenza di cifratura end-to-end nel cloud. Test di regressione in [App spec](../src/app/app.spec.ts).
- **P0, contenimento locale:** aggiunte esclusioni per `.env`, backup e `.ndbackup`, preservando template ambiente. Le esclusioni non rimuovono file gia' tracciati o dati nella cronologia; `backup/` non risultava tracciata. Non sono stati aperti i backup. Fonte: [.gitignore](../.gitignore).
- **P0, corretto localmente nel secondo incremento:** caricamenti eventi, audio ed export sono legati alla revisione dell'archivio; logout, lock, cambio account/profilo e distruzione invalidano le risposte precedenti. Gli audio hanno anche un identificatore di richiesta per la sequenza A-B-A. Risposte ed errori tardivi non aggiornano il nuovo diario, anche con ID evento coincidenti. Questo controllo non annulla operazioni backend gia' avviate e non sostituisce le policy server. Fonti: [App](../src/app/app.ts), [regressioni](../src/app/app.spec.ts).
- **P1:** nessun blocco automatico per inattivita', CSP dichiarata o autorizzazione amministratore applicativa. Non emergono credenziali S3 nel file di configurazione frontend letto: gli URL Neon sono pubblici, non segreti. La revisione del working tree non equivale a secret scanning storico.
- **P1:** la Function valida issuer/JWKS e proprietario dal `sub`; audience, revoca, quote, limiti richieste e tipi reali dei file richiedono test backend. CORS non sostituisce autenticazione. La configurazione CORS del bucket avviene a runtime: separarla dal percorso delle richieste.

### Login E Credenziali

- **P0, corretto localmente nel secondo incremento:** l'export account usa una passphrase autonoma di almeno 12 caratteri, confermata prima del download degli audio, senza verificare/configurare il vault locale. L'export locale continua a richiedere la password del proprio vault. Envelope AES-GCM/PBKDF2 e payload restano in versione 1: i backup precedenti sono compatibili e la destinazione puo' usare una password locale diversa. Non si riutilizzano credenziali OAuth o chiavi locali. Fonti: [backup](../src/app/services/local-backup.service.ts), [vault](../src/app/services/local-vault.service.ts), [downloadExport](../src/app/app.ts).
- **P1:** i flussi attuali sono email/password e OTP di verifica/reset, non Magic Link o login senza password. Non e' dimostrato che problemi di accesso del provider siano risolti: SMTP, sessioni reali, scadenze e configurazione remota non sono stati provati.
- **Corretto localmente:** il servizio validava email dopo `trim()` ma poteva inviare l'originale; ora normalizza tutti i percorsi email. La UI esistente gia' ripuliva molti input: e' un consolidamento del confine servizio, non prova della causa di tutti i login falliti. Il mock relativo incompatibile con Angular e' stato sostituito con un provider DI lazy del client; 7 test auth passano.
- **P1:** l'estensione OTP e' ottenuta con un cast; la presenza/configurazione effettiva dei plugin va verificata e non dedotta dal solo tipo. Manca gestione profilo online.

### Integrita', UX E Performance

- **P0:** salvataggio, ripristino e cancellazione cloud coordinano PostgreSQL e S3 in passi separati; un errore intermedio lascia uno stato parziale. Un fallimento dei metadati dopo sovrascrittura audio puo' attivare un cleanup distruttivo dello stesso ID. Servono upload immutabili/staging, commit esplicito, retry e riconciliazione. Fonti: [NeonDiaryService](../src/app/services/neon-diary.service.ts), [NeonAudioRepository](../src/app/services/neon-audio.repository.ts).
- **P1:** ogni modifica cloud invia l'intero elenco eventi con upsert e senza revisione ottimistica. Due dispositivi possono sovrascrivere cambiamenti altrui; in locale `saveAll()` ricifra e riscrive l'intero archivio. Passare a comandi per singolo evento e conflitti espliciti.
- **P1:** caricamento di tutti gli eventi senza paginazione; dettaglio cloud che scarica sequenzialmente tutti i blob dell'evento, anche se il player dichiara `preload="none"`; cancellazione totale che scarica gli audio con `listAll()` prima di eliminarli. Separare metadati e contenuti. Il backup usa parallelismo non limitato e molte copie/base64 in memoria.
- **P1:** UTC presente, ma fuso originale, precisione dichiarata e correlazione temporale registrazione/evento non sufficientemente strutturati. Le correzioni sono mutabili dal client: non sono un registro forense append-only.
- **P1:** il ramo modifica non applica `microphonePosition` dal draft; manca inoltre il controllo corrispondente nel form. Il dettaglio non rende le note testuali dell'evento e diversi metadati contestuali. Alcune conferme di cancellazione cloud parlano ancora del solo dispositivo. Fonte: [App](../src/app/app.ts), [template](../src/app/app.html).
- **P1:** componente principale concentra autenticazione, form, import, audio e persistenza. Form lungo sempre vicino a elenco e dettaglio, nessuna navigazione funzionale attiva, pannello analisi vuoto. Il disegno operativo va introdotto per sezioni, senza rifare il motore dati.
- **P2:** build osservata dopo strict: bundle iniziale 376,96 kB grezzi, chunk Neon 628,48 kB grezzi. Il client auth viene richiesto gia' all'avvio per ripristinare la sessione: lazy non significa assenza dal percorso iniziale. Warning CSS circa 8 kB contro 4 kB; non sono misure di latenza o consumo memoria.

## Specifica Di Prodotto E Gap

Gli ID seguenti sono il riferimento per il backlog. Le capacita' indicate come parziali o mancanti non sono dichiarate implementate.

| Requisito | Risultato verificabile                                                                                                                                           | Gap attuale                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| REQ-001   | Registrazione, accesso, recupero e gestione profilo; valutare Microsoft, Google, Magic Link e infine password, in questo ordine                                  | Solo email/password e OTP; profilo non modificabile                  |
| REQ-002   | Ruoli utente/amministratore controllati sul server, con rifiuto esplicito delle operazioni non autorizzate                                                       | Ruoli applicativi assenti                                            |
| REQ-003   | Dati locali e backup esistenti restano leggibili; nessuna migrazione o perdita implicita al cambio accesso                                                       | Basi presenti; backup account e concorrenza da consolidare           |
| REQ-004   | Evento con titolo, descrizione, categoria, stanza/posizione, data, ora, durata, audio, immagini, video, note e tag                                               | Mancano titolo dedicato e immagini/video; alcuni dati non mostrati   |
| REQ-005   | Conservare istante UTC, fuso originale e contesto temporale; date/durate coerenti e test su ora legale e precisione                                              | Solo istanti serializzati e fine derivata                            |
| REQ-006   | Distinguere intensita' soggettiva, energia digitale e livello sonoro stimato con unita', metodo e limiti                                                         | Solo scala soggettiva 1-5                                            |
| REQ-007   | Allegati audio/immagini/video validati, privati, con progresso, errore, retry e cancellazione coerente                                                           | Solo registrazioni microfono                                         |
| REQ-008   | GPS facoltativo, richiesto su azione esplicita, con accuratezza/istante e possibilita' di rimozione; mappa nel dettaglio                                         | Assente                                                              |
| REQ-009   | Caricare planimetria, zoomare, ruotare, navigare e inserire marker persistenti                                                                                   | Modulo non trovato nel checkout                                      |
| REQ-010   | Evento con punto di origine percepita e punto di rilevazione distinti, associati a revisione planimetria e note contestuali                                      | Assente                                                              |
| REQ-011   | Un dettaglio con informazioni generali, audio, spettrogramma, posizione, allegati, correlati, timeline e note, senza aprire altre schermate                      | Dettaglio parziale                                                   |
| REQ-012   | Tab Audio con player, durata e metadati; stati caricamento, assente, errore e codec non supportato                                                               | Player/metadati presenti; tab e stati incompleti                     |
| REQ-013   | Spettrogramma completo generato automaticamente dopo acquisizione/upload, con stato pending/processing/ready/failed e retry                                      | Nessuna generazione                                                  |
| REQ-014   | Tab Spettrogramma con zoom, intervallo selezionabile, frequenza minima/massima e cursore sincronizzato; limiti coerenti con il campionamento                     | Assente                                                              |
| REQ-015   | Tab Analisi con frequenze dominanti, energia, bande principali e risultati riproducibili/versionati                                                              | Tipi preparatori, nessuna pipeline                                   |
| REQ-016   | Suggerire eventi acusticamente simili con conteggio, punteggio, date, durata, posizione e collegamenti; distinguere correlazione temporale e possibile relazione | Assente                                                              |
| REQ-017   | Nessuna attribuzione automatica della causa; descrizioni e report non trasformano somiglianze in accertamenti                                                    | Ipotesi gia' etichettate; automatismi futuri da vincolare            |
| REQ-018   | Dashboard: conteggio, stanze, fasce orarie, giorni, distribuzione frequenze, trend settimanale e mensile, anche senza dati                                       | Solo conteggio e media soggettiva                                    |
| REQ-019   | PDF professionale selettivo con cronologia, immagini, riferimenti registrazioni, spettrogrammi, statistiche e note; anteprima e limiti dichiarati                | Assente                                                              |
| REQ-020   | Timeline di creazione, acquisizioni, allegati, correzioni e note; cronologia distinguibile dalle osservazioni dell'utente                                        | Solo cronologia correzioni parziale                                  |
| REQ-021   | Angular strict, signals, Angular Material e componenti funzionali; interfaccia responsive/accessibile senza perdere dati in navigazione                          | Strict ora attivo; Material e separazione per funzionalita' mancanti |
| REQ-022   | Ionic/Capacitor Android/iOS con permessi microfono/file, lifecycle, OAuth deep link e recupero dopo interruzioni verificati su dispositivo                       | Solo PWA; emulazione browser non prova capacita' native              |
| REQ-023   | Backend Node.js, PostgreSQL, storage S3 privato, validazione server, ownership e operazioni idempotenti                                                          | PostgreSQL/S3 gia' integrati; API dominio Node.js e job mancanti     |
| REQ-024   | Privacy esplicita, minimizzazione, isolamento account, limiti memoria/rete e regressioni automatiche su flussi critici                                           | Controlli parziali; nessun gate backend o E2E persistente            |

### Scenari Di Accettazione

1. **US1, priorita' P0, accesso e continuita':** dato un diario esistente, quando l'utente accede o recupera l'accesso, vede soltanto i propri dati; un callback scaduto non apre la sessione e una risposta tardiva dopo logout non ripopola il diario. Il vault locale resta apribile con le chiavi precedenti.
2. **US2, priorita' P1, raccolta:** dato un nuovo episodio, quando vengono salvati titolo, istante, stanza e contesto, riapertura e correzione conservano i valori, il fuso e la cronologia; gli allegati non validi sono rifiutati senza cancellare quelli esistenti.
3. **US3, priorita' P1, posizione:** data una planimetria caricata, quando si inseriscono origine percepita e punto di rilevazione, zoom e rotazione non alterano le coordinate persistite; il dettaglio riaperto mostra entrambi i marker e le note.
4. **US4, priorita' P1, audio:** dato un audio sintetico noto, al salvataggio parte l'analisi; un tono a frequenza nota compare nella banda corretta, un intervallo selezionato corrisponde al player e un fallimento consente retry senza alterare l'originale.
5. **US5, priorita' P2, monitoraggio:** dati eventi di stanze/giorni diversi, dashboard e PDF concordano con il sottoinsieme selezionato e il fuso dichiarato; i correlati mostrano criteri e punteggi senza attribuire una causa.
6. **US6, priorita' P2, mobile:** su Android e iOS un rifiuto microfono, la chiusura dell'app durante OAuth o un'interruzione di rete non generano una falsa conferma di salvataggio.

### Entita' E Contratti Da Evolvere

- **Account/Profile/Role:** identita' del provider, nome visualizzato e ruolo server. L'amministratore non ottiene accesso generalizzato ai diari per effetto di un campo client; condivisione e deleghe richiedono autorizzazioni esplicite.
- **NoiseEvent:** mantenere ID e campi esistenti; aggiungere versione schema, titolo, contesto temporale e riferimenti opzionali alle nuove entita'. Non duplicare categoria e `eventType` senza una migrazione motivata.
- **Attachment/AudioClip:** originali immutabili, tipo verificato, dimensione, hash, proprietario, evento e stato upload. Analisi derivate separate dagli originali; nessuna sostituzione silenziosa tramite stesso ID.
- **FloorPlan/ObservationPoint:** immagine privata e revisione, coordinate normalizzate nello spazio originale, stanza e note. Origine percepita non equivale a sorgente accertata. Recuperare prima il modulo esterno citato dall'utente, che non e' disponibile qui.
- **AudioAnalysis/Similarity:** hash audio, versione algoritmo, campionamento, parametri, unita', stato e data analisi. Separare punteggio acustico, vicinanza temporale e contesto spaziale; nessuna probabilita' causale.
- **TimelineEntry/ReportManifest:** attore, istante, azione e revisione; elenco degli eventi/allegati inclusi, filtri, versione, esclusioni e hash. Un hash non dimostra autore, origine o data certa.

### Criteri Di Successo

Sono obiettivi da misurare, non risultati gia' ottenuti.

- Inserimento di un evento minimo in non oltre 30 secondi in una prova di usabilita' con dati sintetici, senza obbligare GPS, allegati o compilazione avanzata.
- Zero dati di un account visibili a un secondo account nei test di isolamento, anche con ID evento coincidenti, richieste tardive e tentativi non autorizzati.
- Ogni campo salvato riappare dopo riapertura e dopo round-trip backup; nessun cambio archivio o errore intermedio produce perdita silenziosa nei casi di test.
- Nel dataset di verifica, tutti gli aggregati corrispondono ai conteggi attesi per stanza, intervallo e fuso; PDF e dashboard condividono lo stesso insieme filtrato.
- Per toni sintetici, errore del picco entro una cella di frequenza dell'analisi configurata; niente valori non finiti su silenzio e gestione dichiarata dei codec non decodificabili.
- Nessuna operazione di elenco o cancellazione scarica i contenuti audio; dettaglio disponibile prima del caricamento dei blob. Profilare memoria e latenza su dispositivi concordati prima di fissare un SLO numerico.

## Decisioni Architetturali

### Accesso Semplice

Valutazione in ordine richiesto:

1. **Microsoft:** prima scelta da verificare sul provider attuale; richiede registrazione applicazione, audience/tenant, redirect consentiti e callback web/mobile. Non esporre segreti nel frontend e non utilizzare account aziendali per configurare questo progetto personale.
2. **Google:** seconda scelta; verificare supporto e abilitazione reali, origini e redirect. Nessuna sostituzione account basata solo su un'email non verificata; account linking con riautenticazione e consenso.
3. **Magic Link:** alternativa senza password per chi non usa i provider; plugin/provider verificato, SMTP dedicato, link monouso/scadenza, rate limit e messaggio antienumerazione. Callback/deep link preserva una destinazione interna consentita; nessun token persistito nei log o nel service worker.
4. **Password:** fallback di compatibilita', non percorso predefinito. Non rimuovere prima di verificare recupero degli account esistenti e linking.

Mantenere Neon Auth se soddisfa e permette di verificare questi contratti. In caso contrario, documentare una migrazione identita' prima di introdurre un secondo sistema parallelo. I nomi dei metodi SDK non provano che un provider sia configurato. La password del vault locale protegge una chiave crittografica: non puo' essere eliminata come fosse soltanto una password di login. Eventuale sblocco biometrico nativo richiede keychain/keystore e migrazione dedicata.

### Frontend E Mobile

Estrarre progressivamente funzionalita' accesso/profilo, diario, dettaglio, posizione e monitoraggio dal componente principale. Conservare signals e servizi di persistenza, introdurre Angular Material/CDK e navigazione reale per incrementi testati. Non trasformare subito tutte le classi o ricreare repository gia' funzionanti.

Il dettaglio resta un'unica vista con otto sezioni; dentro l'area registrazione i tab Audio, Spettrogramma e Analisi non cambiano pagina. Player e selezione temporale condividono lo stato. GPS, planimetria e allegati hanno stati vuoto/caricamento/errore/permesso negato. Pulsanti operativi accessibili, pannelli non annidati, buona densita' e priorita' all'inserimento rapido.

Ionic/Capacitor riusa dominio e contratti dati. Verificare compatibilita' Angular/Ionic prima dell'installazione e separare shell mobile da componenti Material desktop dove necessario. La PWA non garantisce registrazione affidabile in background; non prometterla senza un requisito esplicito e implementazione nativa validata.

### API, Storage E Affidabilita'

Introdurre API dominio Node.js per operazioni sensibili, ruoli, upload completati, report e job; mantenere PostgreSQL e il bucket S3 esistenti. Applicare ownership/ruoli e validazione sul server, non soltanto nel form. Usare revisioni ottimistiche, idempotency key e stati espliciti; per DB/S3 serve un workflow con compensazione/outbox e riconciliazione, non la promessa di una transazione unica tra servizi diversi.

Elenco paginato e filtri sul server; query dedicate per metadati e cancellazioni, download audio su richiesta. Eventuali nuovi indici relazionali derivano da query misurate. Impostazioni endpoint per ambiente; mai credenziali S3 o client secret nel bundle. Pipeline backend distinta dalla pubblicazione Pages, con migrazioni additive, backup e rollback verificati.

### Audio E Similarita'

Usare librerie collaudate per decodifica/FFT e rendering interattivo, con verifica licenza e supporto codec, non una FFT scritta da zero. Per il web valutare WaveSurfer e plugin spettrogramma/regioni; per elaborazione riproducibile usare un worker Node con tool audio collaudati. La scelta finale richiede una prova sui codec effettivamente acquisiti.

L'upload completato produce un job idempotente basato su hash e versione algoritmo. Originale immutabile; risultato STFT multirisoluzione e features persistiti separatamente con parametri (finestra, hop, FFT, canali, campionamento e scala). Elaborazione pesante fuori dal thread UI, retry limitato e messaggi di errore. Limite superiore della frequenza non oltre Nyquist del segnale analizzato; salvare il campionamento effettivo dopo eventuale ricampionamento, senza confonderlo con quello del dispositivo.

Energia/RMS e livelli digitali dBFS non sono dB SPL. Una stima SPL richiede dati di calibrazione e catena di acquisizione dichiarata; in assenza mostrare non disponibile, non convertire una scala soggettiva in decibel. Il microfono non misura automaticamente vibrazioni strutturali: registrare la vibrazione percepita come osservazione, non come accelerazione strumentale.

Per correlati, confrontare features acustiche normalizzate su dati autorizzati dello stesso diario; versionare metrica e soglie, escludere l'evento stesso e gestire audio insufficienti. Verificare il ranking con un corpus sintetico/documentato prima di mostrare punteggi al pubblico. Le frequenze dominanti non identificano la causa. Il testo ammesso e' ad esempio: "Questo evento presenta somiglianza acustica con altri 5 eventi registrati"; il numero deve derivare dai risultati effettivi.

### PDF E Documentazione Tecnica

Report su intervallo/selezione, anteprima e oscuramento opzionale; sezioni cronologia, posizione, immagini, spettrogrammi, statistiche, note e indice registrazioni. Includere durata, hash e riferimenti autorizzati stabili agli audio, mai URL S3 temporanei che scadono nel documento. Valutare allegati incorporati o pacchetto portabile per ascolto offline: molti lettori PDF non riproducono audio. Dichiarare sempre cosa e' incluso/escluso e testare i lettori supportati. Il PDF non conferisce valore probatorio certificato.

## Roadmap E Backlog Prioritizzato

Le dipendenze governano l'ordine; nessuna data o stima di consegna non verificata. Stato `completato locale` non significa pubblicato.

### Fase 0: Base Sicura E Recuperabile

**Plan:0.1, REQ-001/003/024.** Consolidare accesso, contenimento privacy e test prima di aggiungere flussi.

- [x] T001 [P0] [Plan:0.1] Normalizzazione email e client auth testabile; [servizio](../src/app/services/neon-auth.service.ts) e [test](../src/app/services/neon-auth.service.spec.ts). Completato locale, 7 test passati.
- [x] T002 [P0] [Plan:0.1] Distinguere conservazione locale/cloud nel consenso e stato vuoto; [template](../src/app/app.html), [test](../src/app/app.spec.ts). Completato locale, suite App 15 test passati.
- [x] T003 [P0] [Plan:0.1] Escludere credenziali e backup da Git e impedire dot-segment storage; [.gitignore](../.gitignore), [Function](../functions/diary-audio/index.ts). Completato locale; 13 casi validatore passati. Aggiungere regressione persistente al gate backend T006 prima di pubblicare la Function.
- [x] T004 [P0] [Plan:0.1] Separare passphrase export cloud e password vault locale in [backup](../src/app/services/local-backup.service.ts), [vault](../src/app/services/local-vault.service.ts) e [App](../src/app/app.ts). Completato locale: export senza vault, passphrase confermata, password errata rifiutata, chiavi locali preservate e formato precedente mantenuto. Round-trip browser con evento/audio e password destinazione diversa verificato.
- [x] T005 [P0] [Plan:0.1] Aggiungere invalidazione delle richieste al cambio sessione/archivio in [App](../src/app/app.ts). Completato locale: regressioni con risposte/errori differiti dopo logout, cambio account/profilo con ID coincidenti, selezione audio A-B-A, distruzione e backup completato dopo logout. La risposta vecchia non nasconde il caricamento del nuovo account.

**Plan:0.2, REQ-003/007/023/024.** Rendere affidabili i contratti cloud.

- [ ] T006 [P0] [Plan:0.2] Test backend della [Function](../functions/diary-audio/index.ts) e dello [schema RLS](../database/migrations/001_user_diaries.sql), gate nel [workflow](../.github/workflows/content-validation.yml). Accettazione: JWT assente/scaduto/errato, ID traversal, accesso A/B, size/MIME e origini negati; distinguere test locali da distribuiti.
- [ ] T007 [P0] [Plan:0.2] Upload immutabili/staging e riconciliazione in [NeonAudioRepository](../src/app/services/neon-audio.repository.ts) e [NeonDiaryService](../src/app/services/neon-diary.service.ts), coordinati dall'API Node. Accettazione: errori in ciascun passo non eliminano originali; retry idempotente, cancellazione riprendibile, import parziale dichiarato.

### Fase 1: Account Semplice E Struttura Operativa

**Plan:1.1, REQ-001/002/003.** Passwordless e profilo, senza lock-out degli utenti esistenti.

- [ ] T008 [P1] [Plan:1.1] Verificare/abilitare Microsoft, poi Google, poi Magic Link; estendere [NeonAuthService](../src/app/services/neon-auth.service.ts) e UI solo per metodi realmente configurati. Dipende da T004-T006. Accettazione: callback autorizzato, annullato, scaduto, primo accesso, ritorno web/mobile e linking senza duplicare account. Richiede configurazione esterna del proprietario, non segreti in chat.
- [ ] T009 [P1] [Plan:1.1] Profilo e ruoli server con migrazioni additive in [database](../database/migrations/) e API Node. Accettazione: profilo aggiornato riappare dopo login; un utente non puo' promuoversi modificando payload/token client; amministratore non legge diari altrui per default.

**Plan:1.2, REQ-021/024.** Struttura frontend sostenibile.

- [x] T010 [P1] [Plan:1.2] Attivare TypeScript strict e strictTemplates in [tsconfig](../tsconfig.json). Completato locale, build production passata senza allentare i controlli.
- [ ] T011 [P1] [Plan:1.2] Separare accesso/diario/dettaglio e introdurre Angular Material/CDK e route in [src/app](../src/app/). Accettazione: stessi dati e azioni coperti dai test attuali; focus, tastiera, mobile e stati di navigazione verificati; nessuna riscrittura del vault.
- [ ] T012 [P1] [Plan:1.2] Profilare elenco/audio/backup e introdurre query paginata, comandi per evento, revisioni e download lazy nei [servizi cloud](../src/app/services/). Accettazione: modifica non rispedisce gli altri eventi; cancellazione non scarica blob; conflitto multi-dispositivo esplicito.

### Fase 2: Evento Completo E Posizione

**Plan:2.1, REQ-004/005/006/007/008/020/023.** Schema ed esperienza di raccolta.

- [ ] T013 [P1] [Plan:2.1] Evolvere [NoiseEvent](../src/app/domain/noise-event.model.ts), validatori, form, backup e schema server: titolo, fuso/precisione, posizioni, note e storia. Dipende da T007/T011/T012. Accettazione: round-trip tutti i campi e versioni precedenti; DST, fine precedente all'inizio e durata incoerente rifiutati; modifica posizione microfono conservata.
- [ ] T014 [P1] [Plan:2.1] Upload audio/immagini/video con validazione contenuto e limiti server, gestione EXIF/privacy e URL autorizzati. Accettazione: file mascherati/corrotti/eccessivi rifiutati; retry e annullamento non lasciano file invisibili o riferimenti rotti.
- [ ] T015 [P1] [Plan:2.1] GPS facoltativo e mappa nel dettaglio, senza richiesta automatica all'avvio. Accettazione: rifiuto permesso e assenza GPS non impediscono salvataggio; rimozione e accuratezza persistite.

**Plan:2.2, REQ-009/010/011.** Planimetria e dettaglio unico.

- [ ] T016 [P1] [Plan:2.2] Recuperare prima il modulo planimetria citato, verificarne API/licenza e poi integrarlo; se non disponibile, documentare il modulo da realizzare in [src/app](../src/app/). Dipende da T013/T014. Accettazione: upload privato, pan, zoom, rotazione, marker percezione/rilevazione distinti, note, riapertura stabile e revisione immagine.
- [ ] T017 [P1] [Plan:2.2] Dettaglio con otto sezioni e tab registrazione in [src/app](../src/app/), caricamento indipendente dei pannelli. Accettazione: dati, note testuali, allegati, mappa e planimetria consultabili senza cambiare pagina; errore di un pannello non nasconde il resto.

### Fase 3: Audio Analizzabile

**Plan:3.1, REQ-006/012/013/014/015/017/023.** Elaborazione e visualizzazione.

- [ ] T018 [P1] [Plan:3.1] Prova codec/librerie e job audio Node, schema analisi e stato nel dettaglio. Dipende da T007/T014/T017. Accettazione: enqueue su upload/acquisizione, retry idempotente, silenzio/corrotto/codec non supportato e toni noti; originali invariati, parametri/versione persistiti.
- [ ] T019 [P1] [Plan:3.1] Player sincronizzato a spettrogramma multirisoluzione, zoom, cursore, selezione e limiti frequenza; analisi energia/bande/picchi in [src/app/audio](../src/app/audio/). Accettazione: Nyquist rispettato, intervallo/cursore coerenti, unita' dichiarate e nessun valore SPL inventato; UI resta reattiva durante elaborazione.

### Fase 4: Monitoraggio E Documentazione

**Plan:4.1, REQ-016/017/018/019/020.** Correlati, dashboard e report.

- [ ] T020 [P2] [Plan:4.1] Ranking di similarita' autorizzato e versionato, su corpus di verifica, in API Node e dettaglio. Dipende da T018/T019. Accettazione: conteggio/punteggio/date/durata/posizione/link corretti, nessun confronto con dati non autorizzati, nessuna attribuzione causale.
- [ ] T021 [P2] [Plan:4.1] Dashboard per stanze, ore, giorni, frequenze, settimane e mesi con filtri condivisi. Dipende da T012/T013/T018. Accettazione: conteggi su fixture note, confini fuso/DST, assenza dati e analisi mancanti non trattate come zero misurato.
- [ ] T022 [P2] [Plan:4.1] PDF con anteprima, redazione, manifest e riferimenti audio; [API Node e frontend](../src/app/). Dipende da T014/T017/T019/T021. Accettazione: tutti i contenuti richiesti, impaginazione lunga, dati filtrati, hash originali e autorizzazioni; niente link temporanei stampati come permanenti, niente testo utente eseguito come codice/HTML.

### Fase 5: App Mobile E Rilascio

**Plan:5.1, REQ-001/021/022/024.** Convalida nativa e operativa.

- [ ] T023 [P2] [Plan:5.1] Shell Ionic/Capacitor e configurazioni Android/iOS, riuso contratti e storage sicuro delle sessioni. Dipende da T008/T011/T014. Accettazione: permessi, deep link OAuth/Magic Link, lifecycle, audio interrotto e rete assente su dispositivi; non considerare sufficiente il solo viewport mobile.
- [ ] T024 [P1] [Plan:5.1] Gate di rilascio frontend/backend, E2E persistenti, timeout lock locale, retention/cancellazione, provider email e documentazione privacy aggiornata. Dipendenza trasversale: blocca ogni rilascio che ne richieda le garanzie, non si rinvia tutto alla fine. Normalizzazione editoriale in attivita' distinta; nessun deploy automatico eseguito da questo piano.

### Mappatura Requisiti

| Requisito | Piano              | Task di completamento              |
| --------- | ------------------ | ---------------------------------- |
| REQ-001   | 0.1, 1.1, 5.1      | T001, T008, T023, T024             |
| REQ-002   | 1.1                | T009                               |
| REQ-003   | 0.1, 0.2, 1.1      | T004, T005, T007, T008             |
| REQ-004   | 2.1                | T013, T014                         |
| REQ-005   | 2.1                | T013                               |
| REQ-006   | 2.1, 3.1           | T013, T018, T019                   |
| REQ-007   | 0.2, 2.1           | T007, T014                         |
| REQ-008   | 2.1                | T015                               |
| REQ-009   | 2.2                | T016                               |
| REQ-010   | 2.2                | T016                               |
| REQ-011   | 2.2                | T017                               |
| REQ-012   | 3.1                | T019                               |
| REQ-013   | 3.1                | T018                               |
| REQ-014   | 3.1                | T019                               |
| REQ-015   | 3.1                | T018, T019                         |
| REQ-016   | 4.1                | T020                               |
| REQ-017   | 3.1, 4.1           | T018, T019, T020, T022             |
| REQ-018   | 4.1                | T021                               |
| REQ-019   | 4.1                | T022                               |
| REQ-020   | 2.1, 4.1           | T013, T017, T022                   |
| REQ-021   | 1.2, 5.1           | T010, T011, T023                   |
| REQ-022   | 5.1                | T023                               |
| REQ-023   | 0.2, 2.1, 3.1      | T006, T007, T009, T013, T014, T018 |
| REQ-024   | 0.1, 0.2, 1.2, 5.1 | T002, T003, T005, T006, T012, T024 |

## Strategia Di Verifica

- Applicazione SPA/PWA con backend esterno. Riutilizzare Vitest/TestBed e fake-indexeddb per test locali; client auth iniettato e nessuna chiamata a utenti reali nei test unitari. I test nuovi devono restare raggiungibili dai comandi canonici di progetto.
- Flussi critici: accesso/recupero/logout, isolamento tra proprietari e archivi, raccolta/correzione, backup/restore, upload/analisi/dettaglio, correlati/dashboard/PDF e permessi/deep link nativi.
- Integrare test reali PostgreSQL/RLS e S3 su ambiente di test dedicato, con dati sintetici/UUID e cleanup limitato a quel perimetro. Docker non risulta disponibile sul PATH verificato: non usare SQLite come prova delle policy PostgreSQL. Fino a un ambiente equivalente, dichiarare questo gate non verificato.
- Node osservato: 22.22.3; browser Playwright integrato disponibile. Eseguire browser E2E indipendentemente da Docker. Fixture solo sintetiche e nessuna planimetria domestica reale negli asset o screenshot.
- Casi audio: toni noti, due toni, silenzio, impulso, durata lunga, corrotto, multicanale e codec mobile. Confronti ripetibili con tolleranza dichiarata, non valutazioni della causa di rumori reali.
- Controlli ad ogni incremento: test della parte toccata, suite canonica, build strict, controlli contenuti, formattazione circoscritta e gate backend quando modificato. Una failure preesistente va riportata, non nascosta aumentando budget o disattivando controlli.

## Evidenze Del Primo Incremento

- Suite auth: 7 test superati dopo normalizzazione email e sostituzione del mock relativo non supportato dal runner Angular.
- Suite completa finale: 8 file, 54 test superati; suite App mirata: 15 test superati, inclusa la nuova regressione cloud.
- Build production finale con strict/strictTemplates superata: 377,37 kB iniziali grezzi, chunk Neon 628,48 kB; warning CSS preesistente riportato, non eliminato aumentando budget.
- Esclusioni Git verificate con `git check-ignore`; template ambiente ancora tracciabili. Validatore ID storage: 13 casi superati. Non e' un test end-to-end del backend e la correzione non e' distribuita.
- `content:check` superato: una situazione e 45 file Markdown del perimetro editoriale, avviso revisore non assegnato. Il comando non certifica l'assenza di segreti in tutti i file o nella cronologia.
- `lint` globale non superato: 63 file preesistenti segnalati da Prettier prima dell'aggiunta di questo documento. Nessuna riformattazione massiva eseguita.
- Browser: accesso desktop a 1440x900, mobile a 390x844 e navigazione recupero/ritorno verificati senza credenziali; nessun overflow orizzontale o controllo mobile fuori viewport rilevato, screenshot esaminati. Prova di rendering, non login OAuth o verifica invio email. Anteprima finale su `http://localhost:4200`, coerente con l'origine CORS gia' prevista dalla Function; nessuna modifica remota.
- Nessun errore editor rilevato nei file applicativi modificati; `git diff --check` superato con soli avvisi di conversione LF/CRLF del checkout Windows. La CLI ha memorizzato l'opt-out analytics in [angular.json](../angular.json).

## Evidenze Del Secondo Incremento

- T004 e T005 implementati nel working tree, senza nuove dipendenze, migrazioni remote o modifiche ai file del diario esistenti.
- Suite completa: 8 file, 71 test superati; suite App: 28 test; backup/vault: 14 test. Incluse regressioni su passphrase errata/annullata, vault locale preservato e concorrenza tra richieste.
- Build production strict superata; resta il warning CSS gia' presente. Controllo contenuti superato con il precedente avviso sul revisore non assegnato.
- Browser Playwright: due contesti isolati, fetch esterni bloccati, sessione/repository cloud simulati solo in memoria; cifratura, file importato e IndexedDB reali dell'app. Export senza vault locale di un file cifrato di 1531 byte con un evento e un audio sintetici; ripristino in un profilo pulito con password diversa e verifica dopo blocco/sblocco riusciti. Nessuna verifica del provider auth o dello storage cloud reale; nessuna verifica della riproduzione/decodifica audio, perche' i byte del test sono sintetici.
- I primi tentativi con intercettazione di rete del browser sono terminati in timeout; la prova completa e' riuscita con blocco fetch tramite script iniziale e API File/DataTransfer native. Nessun dato utente usato o modificato.

## Prossimo Incremento

T006 (test backend e policy) e T007 (upload immutabili e riconciliazione DB/S3) restano i successivi P0; T006 e' necessario prima di distribuire la Function modificata. T005 protegge i caricamenti e l'export: importazioni e mutazioni cloud gia' avviate richiedono ancora i contratti idempotenti/di ownership di T007. In parallelo alla preparazione tecnica, il proprietario deve configurare/verificare i provider e fornire il riferimento al modulo planimetria gia' analizzato. Non vengono richiesti segreti in chat e non si bloccano le correzioni locali su questi prerequisiti esterni.
