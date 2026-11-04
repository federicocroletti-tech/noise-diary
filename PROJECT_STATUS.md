# Stato del progetto

## 1. Identificazione

- **Nome:** Diario Rumore (`noise-diary`).
- **Scopo dichiarato:** annotare episodi di rumore domestico e ambientale e organizzare guide documentali.
- **Utenti previsti:** uso privato dichiarato nel brief; la destinazione definitiva non è stata confermata.
- **Repository:** [federicocroletti-tech/noise-diary](https://github.com/federicocroletti-tech/noise-diary).
- **Branch locale:** `feat/event-list-management`.
- **Deployment dichiarato/configurato:** GitHub Pages; URL e raggiungibilità live non verificati.
- **Tecnologie:** Angular 22, TypeScript 6, RxJS 7, SCSS, Vitest, IndexedDB, Web Crypto e Angular Service Worker.
- **Evidenze:** [README.md](./README.md), [package.json](./package.json), [angular.json](./angular.json), [docs/INITIAL_PROJECT_BRIEF.md](./docs/INITIAL_PROJECT_BRIEF.md).

## 2. Stato verificato

- **Data e ora dell’analisi:** 2026-11-04, circa 23:06 CET.
- **Commit locale analizzato:** `4434ab0` (`docs(handoff): finalize session checklist`, 2026-11-01).
- **Ambiente:** Windows; Node.js `v22.22.3`; npm `10.9.8`; dipendenze già presenti in `node_modules`.
- **Comandi eseguiti:**
  - `git status --short --branch`, `git branch -vv`, `git log`, confronto locale `HEAD...origin/main` (nessun `fetch`);
  - `npm test` — superato, 5 file e 23 test;
  - `npm run build` — superato, con warning sul budget SCSS;
  - `git diff --check` — superato dopo le modifiche CRUD;
  - `npm run content:check` e `npm run lint` — non superati nell’analisi iniziale; non rieseguiti in questa attività.
- **Modifiche della sessione:** correzione del binding di importazione nel template e implementazione CRUD degli episodi, con test e aggiornamento della documentazione. Alcune modifiche al modello e ai test erano già presenti nel worktree.
- Non sono state installate dipendenze, avviata l’app, eseguiti test browser/E2E, né effettuati `fetch`, commit, push o deployment.
- **Evidenze:** stato Git e output dei comandi del 2026-11-04; workflow configurato in [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml).

## 3. Funzionalità presenti

| Funzionalità | Stato ed evidenza | Verifica |
|---|---|---|
| Creazione di una bozza evento | Presente: il form raccoglie data/ora, stanza, intensità percepita e contesto. La stanza non è obbligatoria. | Test componente incluso in `npm test`. |
| Consultazione, ricerca e ordinamento | Presente: lista con ricerca testuale e ordinamento per data, intensità o stanza; non è una tabella. | Ispezione di [src/app/app.html](./src/app/app.html) e [src/app/app.ts](./src/app/app.ts). |
| Modifica evento | Presente: richiede un motivo, salva uno snapshot precedente e mantiene la cronologia nell'evento locale cifrato. | Test componente per salvataggio, annullamento e conservazione dei valori non indicati; `npm test` superato. |
| Eliminazione evento | Presente: richiede conferma e rimuove evento e clip audio associate dalla IndexedDB locale con una transazione. Non attesta cancellazione da backup o altri dispositivi. | Test di componente e storage inclusi in `npm test`. |
| Intensità | Scala numerica discreta 1–5, esplicitamente soggettiva; non è una misura in dB(A). | Template e modello in [src/app/domain/noise-event.model.ts](./src/app/domain/noise-event.model.ts). |
| Persistenza locale | Eventi e audio cifrati con AES-GCM in IndexedDB; configurazione del vault in localStorage. | Ispezione di [noise-event.repository.ts](./src/app/services/noise-event.repository.ts), [local-vault.service.ts](./src/app/services/local-vault.service.ts) e [audio-clip.repository.ts](./src/app/audio/audio-clip.repository.ts). |
| Importazione JSON | Importazione locale con validazione e limite dimensione; il template attuale seleziona la modalità additiva. | Test di importazione incluso in `npm test`. |
| Export JSON | Esporta metadati degli eventi in chiaro; non include l’audio. | Ispezione di [src/app/app.ts](./src/app/app.ts) e documentazione README. |
| Registrazione audio | Avvio esplicito, accesso al microfono, limite temporale e dimensionale, conservazione locale cifrata. | Ispezione di [audio-recording.service.ts](./src/app/audio/audio-recording.service.ts) e [audio-clip.repository.ts](./src/app/audio/audio-clip.repository.ts). |
| Guide documentali | Contenuti editoriali organizzativi; non sono funzioni generate dall’app e non costituiscono consulenza. | [situations/noise/README.md](./situations/noise/README.md). |

## 4. Funzionalità parziali o mancanti

- La consultazione è una lista, non la tabella richiesta.
- La stanza è facoltativa; l’intensità ha un valore iniziale e i valori non hanno descrittori accessibili individuali.
- L’ora locale viene convertita in UTC senza conservare il fuso orario originale.
- Non risultano implementati planimetria, calendario, report, sincronizzazione, backup cifrato, ripristino verificato o cancellazione completa.
- Il pannello “Analisi frequenze” dichiara che l’analisi non è disponibile; l’indicatore “Offline” è statico.
- La correzione del binding d’importazione ha risolto l’errore di compilazione che bloccava la prima esecuzione dei test. Non è stata condotta una revisione funzionale più ampia delle modifiche preesistenti nel branch.

## 5. Build, lint e test

| Comando | Esito | Problemi o note |
|---|---|---|
| `npm test` | Superato — 5 file, 23 test | Include test CRUD, conferma cancellazione, rimozione degli audio associati e conservazione di valori non indicati. |
| `npm run build` | Superato | `src/app/app.scss` è 7,83 kB: supera il warning budget di 4 kB, ma resta sotto il limite di errore di 8 kB. |
| `npm run lint` | Fallito | Prettier segnala 65 file; il comando controlla Markdown/YAML/tool, non il TypeScript. Nessun file è stato formattato automaticamente. |
| `npm run content:check` | Fallito | `situations/README.md` non è aggiornato; è inoltre segnalato il revisore non assegnato in `situations/noise/metadata.yml`. Nessun indice è stato rigenerato. |
| `git diff --check` | Superato | Nessun errore whitespace. |

Non esiste uno script `typecheck` separato; la compilazione Angular è inclusa nei test e nella build. Non sono stati eseguiti E2E, test mobile o verifiche automatiche di accessibilità.

## 6. Git e GitHub

- **Branch:** `feat/event-list-management`; upstream non configurato.
- **Remote:** `origin` configurato per `federicocroletti-tech/noise-diary`.
- **HEAD:** `4434ab0`; le refs locali indicano `HEAD...origin/main` pari a `0 0`. Nessun `fetch` è stato eseguito: il dato non attesta lo stato remoto corrente.
- **File modificati nel worktree:** `README.md`, `docs/CURRENT_ARCHITECTURE.md`, `src/app/app.html`, `src/app/app.spec.ts`, `src/app/app.ts`, `src/app/domain/noise-event.model.ts`, `src/app/services/noise-event.repository.ts`, `src/app/services/noise-storage.service.ts` e `src/app/services/noise-storage.service.spec.ts`.
- **File non tracciato:** `PROJECT_STATUS.md`.
- Alcune modifiche in `app.ts`, `noise-event.model.ts` e `noise-storage.service.spec.ts` erano già presenti prima di questa attività. Il worktree resta non committato e non è stata eseguita alcuna operazione Git remota.
- `.gitignore` esclude dipendenze, build e cache, ma non contiene una regola esplicita per `.env`. Nessun file `.env` è stato rilevato per nome nel progetto; non sono stati letti valori di configurazione né eseguita una scansione completa di segreti.
- La documentazione preesistente segnala un possibile dato residenziale pubblicato in fixture e cronologia. Non è stato riprodotto né verificato in questa analisi.
- Nessun commit, push, merge, fetch o reset è stato eseguito.

## 7. Deployment

- **Provider configurato:** GitHub Pages tramite [deploy-pages.yml](./.github/workflows/deploy-pages.yml); nessun `render.yaml` o Dockerfile rilevato.
- Il workflow Actions pubblico mostra una run di deploy conclusa con successo per lo SHA `4434ab0`: [run 41360482155](https://github.com/federicocroletti-tech/noise-diary/actions/runs/41360482155).
- Tale evidenza riguarda il commit remoto e non include le modifiche locali non committate.
- Nessun URL Pages esplicito individuato nei file. La richiesta all’endpoint API Pages ha restituito 404; non è stato dedotto né testato un URL live.
- Raggiungibilità, HTTPS, asset e allineamento effettivo della versione pubblicata non verificati.

## 8. Architettura

Applicazione Angular standalone a singola vista, con stato locale basato su signals nel componente principale. `app.routes.ts` esporta un array di route vuoto. La persistenza è browser-local; non è stato individuato un backend applicativo. Il Service Worker memorizza bundle e asset statici.

Evidenze: [docs/CURRENT_ARCHITECTURE.md](./docs/CURRENT_ARCHITECTURE.md), [src/app/app.ts](./src/app/app.ts), [src/app/app.routes.ts](./src/app/app.routes.ts), [ngsw-config.json](./ngsw-config.json).

## 9. Dati e persistenza

Gli eventi e i contenuti audio sono cifrati prima della scrittura in IndexedDB. La configurazione del vault locale è in localStorage; la password non viene salvata e non è recuperabile dall’app. L’export JSON è in chiaro e non contiene le registrazioni audio. Non è disponibile un backup cifrato con procedura di ripristino verificata.

## 10. Sicurezza e privacy

- I dati potenzialmente trattati localmente includono data/ora, stanza, descrizioni, note, intensità ed eventuali audio identificabili.
- Nel codice esaminato non sono stati individuati account, backend applicativo, cookie o analytics. La verifica è limitata al sorgente letto e non certifica l’assenza di ogni possibile comunicazione.
- La cifratura locale non protegge da codice malevolo eseguito nella pagina mentre il vault è sbloccato; il lock è manuale.
- L’export è in chiaro; mancano backup/restore verificato e cancellazione completa.
- La documentazione segnala un possibile dato personale nelle fixture/cronologia già pubblica; l’analisi non ha ripetuto una scansione storica.
- Nessuna valutazione di conformità GDPR, valutazione legale o revisione crittografica è stata svolta.

Riferimenti: [PRIVACY.md](./PRIVACY.md), [SECURITY.md](./SECURITY.md), [docs/DATA_CLASSIFICATION.md](./docs/DATA_CLASSIFICATION.md), [docs/SECURITY_THREAT_MODEL.md](./docs/SECURITY_THREAT_MODEL.md).

## 11. Accessibilità

Sono presenti label per vari controlli e alcuni messaggi con ruoli ARIA. Gli elementi selezionabili della lista supportano click, Invio e Spazio; i pulsanti di modifica ed eliminazione hanno etichette accessibili. La UI ha media query responsive, ma non è stata verificata su dispositivi. Nessun test WCAG 2.2, axe o screen reader è stato eseguito; contrasto e target non sono stati misurati.

## 12. Debito tecnico

- La vista è una lista anziché una tabella; il CRUD è verificato tramite test unitari ma non ancora tramite test E2E/browser.
- Nessuna conservazione esplicita del fuso orario.
- Backup, restore, cancellazione e lock automatico da definire.
- Pipeline locale non verde per formattazione e indice editoriale.
- Assenza di test E2E e accessibilità automatizzata.
- Warning di budget sul foglio SCSS.
- Alcuni indicatori/analisi della UI sono statici o non implementati.

## 13. Rischi e blocchi

- **P0 — privacy:** rischio storico dichiarato nei documenti, da valutare senza riscrivere la cronologia senza autorizzazione esplicita.
- **P1 — funzionalità:** la consultazione resta una lista anziché una tabella; modifica ed eliminazione locale sono implementate e verificate, ma non garantiscono la cancellazione da backup o altri dispositivi.
- **P1 — continuità dati:** perdita della password o dello storage può impedire il recupero; export in chiaro e nessun restore verificato.
- **P2 — accessibilità:** navigazione della lista da tastiera e conformità WCAG non verificate.
- **P2 — qualità:** lint e content check falliscono.
- **Non verificabile:** stato live del deployment e configurazioni amministrative GitHub.

## 14. Decisioni da prendere

- Confermare se l’app resterà esclusivamente personale o verrà distribuita ad altri.
- Definire retention, timeout del vault, backup/restore e comportamento di cancellazione.
- Decidere quale fuso orario conservare e come trattare cambi di ora legale.
- Valutare il rischio storico privacy con una procedura separata e autorizzata.
- Confermare requisiti e limiti per una futura planimetria, che contiene dati domestici potenzialmente sensibili.
- Assegnare un revisore qualificato per i contenuti normativi; i documenti attuali non costituiscono verifica legale.

## 15. Roadmap proposta

| Priorità | Attività e motivazione | Dipendenze | Rischio | Complessità | Criterio di accettazione | Test richiesti |
|---|---|---|---|---|---|---|
| P0 | Valutare il rischio di dati personali nella cronologia pubblica. | Decisione del proprietario; nessuna riscrittura senza approvazione. | Alto | M | Decisione e perimetro documentati senza esporre i dati. | Verifica autorizzata di repository/cronologia, senza riportare valori sensibili. |
| P1 | Definire backup cifrato, ripristino e cancellazione. | Decisioni su retention e modello di recupero. | Alto | L | Ripristino verificato e limiti di cancellazione dichiarati chiaramente. | Round-trip, password errata, dati corrotti e cancellazione. |
| P2 | Risolvere formattazione e indice editoriale in attività indipendenti. | Revisione dei contenuti e assegnazione revisore. | Basso | S | `npm run lint` e `npm run content:check` superati senza disabilitare controlli. | Eseguire i due comandi in sola verifica. |
| P2 | Migliorare navigazione da tastiera e verifiche responsive/accessibilità. | Nessuna. | Medio | M | Flussi principali usabili da tastiera con focus evidente. | Test manuale, screen reader e axe su flussi essenziali. |
| P3 | Valutare planimetria locale con overlay immagine/SVG e coordinate normalizzate. | Planimetria fornita e decisione privacy esplicita. | Alto | L | Nessun upload o tile esterno; posizione persistente in locale e indipendente dal ridimensionamento. | Test di resize, zoom, associazione alla stanza, persistenza e assenza di richieste esterne. |

Per la planimetria, un overlay locale su immagine/SVG con coordinate normalizzate `[0,1]` è una prima opzione proporzionata; aree delle stanze possono essere aggiunte successivamente. Leaflet `CRS.Simple` può offrire zoom e pan ma introduce dipendenza e complessità. Un PDF andrebbe elaborato localmente; planimetria e coordinate non dovrebbero essere caricate su servizi esterni o pubblicate senza autorizzazione.

## 16. Prossimo passo consigliato

Rivedere il diff locale e isolare le modifiche CRUD dalle modifiche preesistenti prima di un eventuale commit; non eseguire commit, push o deployment senza autorizzazione esplicita.
