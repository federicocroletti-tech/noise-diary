# Architettura attuale

## Vista d’insieme

```mermaid
flowchart LR
  Browser[Browser dell'utente]
  UI[Angular standalone: App]
  Domain[NoiseEvent model e validazione]
  Storage[NoiseStorageService]
  Events[NoiseEventRepository]
  Audio[AudioRecordingService]
  Clips[AudioClipRepository]
  Vault[LocalVaultService]
  IDB[(IndexedDB: noise-events / audio-clips)]
  LS[(localStorage: configurazione vault / migrazione legacy)]
  Crypto[Web Crypto: PBKDF2 + AES-GCM + SHA-256]
  Pages[GitHub Pages: bundle statico pubblico]

  Pages --> Browser
  Browser --> UI
  UI --> Domain
  UI --> Storage --> Events --> IDB
  UI --> Audio --> Clips --> IDB
  Events --> Vault
  Clips --> Vault
  Vault --> Crypto
  Vault --> LS
  Browser -. nessun backend o sync .-> Pages
```

I dati degli eventi e i byte audio sono cifrati dall’app prima della scrittura in IndexedDB. I record IndexedDB espongono gli ID e, per l’audio, l’ID evento; i contenuti restano nel payload cifrato. La configurazione v2 locale del vault contiene una chiave dati casuale avvolta con chiavi derivate da password e chiave di recupero, non le credenziali in chiaro.

## Componenti e responsabilità

- `src/main.ts` avvia direttamente il componente `App`.
- `src/app/app.ts` contiene UI state, form, filtri, selezione, import/export, lifecycle del vault e orchestrazione audio. Lo stato usa Angular signals locali; non è presente uno store dedicato.
- `src/app/app.html` rende il form, elenco, dettaglio, autenticazione locale, controlli audio, placeholder analisi e disclaimer.
- `src/app/domain/noise-event.model.ts` dichiara modelli e validatore runtime per `NoiseEvent`. Non esiste un package/domain service separato.
- `src/app/services/noise-storage.service.ts` valida import/salvataggi e migra dati legacy da localStorage.
- `src/app/services/noise-event.repository.ts` conserva eventi cifrati in IndexedDB.
- `src/app/services/local-vault.service.ts` crea/deriva la chiave e cifra/decifra con Web Crypto.
- `src/app/audio/audio-recording.service.ts` acquisisce il microfono solo su comando esplicito, calcola l’hash iniziale e applica limiti di registrazione.
- `src/app/audio/audio-clip.repository.ts` cifra e conserva contenuto e metadati audio in IndexedDB.
- `src/app/app.routes.ts` esporta un array di route vuoto; l’app è una sola vista/component tree.

## Flusso di accesso e persistenza

1. Al caricamento, `App.initialize()` controlla la configurazione vault in localStorage e mostra setup, lock o errore.
2. L’utente crea una password di almeno 12 caratteri o la inserisce per sbloccare; alla creazione viene generata anche una chiave di recupero casuale.
3. La chiave dati AES-256 è casuale ed è avvolta con AES-GCM da chiavi derivate via PBKDF2-SHA-256 (310.000 iterazioni, sale casuale) dalla password e dalla chiave di recupero. La configurazione non conserva credenziali in chiaro; la chiave dati resta in memoria fino a lock o distruzione del componente.
4. Eventi e audio sono letti/validati da IndexedDB. La migrazione legacy avviene dopo lo sblocco.
5. Il lock manuale svuota gli stati decifrati dell’interfaccia, revoca URL audio e rilascia il riferimento alla chiave.

Non c’è timeout di inattività, sincronizzazione o backend. Il recupero password è locale: la chiave di recupero consente di impostare una nuova password e viene sostituita al termine della conferma di salvataggio. La rotazione e la migrazione legacy restano in sospeso fino alla conferma dell’utente che ha conservato la nuova chiave. I vault v1 sono migrati al primo sblocco con la password esistente; fino al completamento della conferma, il vault legacy resta valido. Il backup portabile è un file cifrato separatamente con AES-GCM e derivazione PBKDF2; per importarlo serve la password inserita quando è stato esportato. Il browser/OS può comunque influire su storage, cache e profilo utente.

## Modello evento effettivo

`NoiseEvent` include ID, `startedAt`, timestamp di creazione/aggiornamento, luogo libero, stanza, tipo, andamento, intensità percepita, effetti, campo sorgente marcato “ipotesi”, descrizione, note, tag, status, riferimenti a clip e cronologia delle correzioni. Una correzione conserva il motivo e uno snapshot precedente; la cronologia resta parte dell'evento cifrato in IndexedDB.

Campi opzionali includono durata, fine calcolata, finestre/porta/posizione microfono, numero di testimoni e cancellazione logica. Non sono persistiti fuso orario dichiarato, orario del dispositivo come dato distinto, allegati documentali, contatti, comunicazioni, coordinate/planimetria, unità e condizioni di una misurazione o versione schema/app nell’export. Gli oggetti aggiuntivi dichiarati nel file modello non equivalgono a funzionalità integrate.

## Audio e hash

La registrazione usa `getUserMedia` e `MediaRecorder`, solo dopo click e permesso. Il limite è 300 secondi o 50 MiB; il tipo MIME è scelto tra i candidati supportati dal browser. SHA-256 è calcolato sul blob acquisito e salvato nei metadati cifrati. Al caricamento viene decifrato il blob ma l’hash non è ricomputato per confronto. L’hash non attesta autore, origine, momento o autenticità.

## Import, export e UI

- Import JSON locale, file fino a 5 MiB, estensione `.json`, parse e validazione; duplicati per ID vengono ignorati. L’export generato è JSON in chiaro, contiene eventi e timestamp di export, non audio, filtri o manifest.
- Gli eventi possono essere modificati con motivo obbligatorio e snapshot precedente, oppure eliminati dopo conferma. La cancellazione di un evento e dei suoi audio associati usa una singola transazione IndexedDB; non garantisce l'eliminazione da backup o sincronizzazioni del profilo.
- Il backup `.ndbackup` contiene eventi e registrazioni audio cifrati; la password principale è richiesta all'importazione. L'importazione aggiuntiva conserva i dati locali, risolve i conflitti di ID esplicitamente e salva eventi e nuovi audio in una transazione IndexedDB. Il ripristino sostitutivo richiede conferma ed elimina i contenuti audio non inclusi nel backup.
- I file JSON storici in chiaro restano importabili solo dopo un avviso e non contengono audio. Non vengono più creati nuovi export in chiaro.
- La UI filtra per testo e ordina per data/intensità/stanza. Non ci sono filtri temporali, calendario, selezione di un sottoinsieme per export o oscuramento.
- Il pannello di analisi frequenze è un placeholder sempre vuoto. La media mostrata è una media aritmetica delle intensità soggettive degli eventi caricati.
- Il servizio worker è attivo nella build production e memorizza bundle/assets statici; non è un archivio di backup dei dati IndexedDB.

## Hosting, CI e configurazione

Il sito è statico su GitHub Pages. Il workflow PR esegue npm ci, controllo contenuti, Prettier su Markdown/YAML/tools, test e build. Il workflow di deploy esegue test/build e pubblica il bundle al push su `main`. I permessi e i tag delle Actions sono definiti nei workflow; branch protection e rulesets sono menzionati in `GOVERNANCE.md` ma non verificabili dal repository. Non c’è configurazione CSP o E2E nel repository.
