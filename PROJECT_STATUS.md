# Stato del progetto

## 1. Identificazione

- **Nome:** Diario Rumore (`noise-diary`).
- **Scopo dichiarato:** annotare episodi di rumore domestico e ambientale e organizzare guide documentali.
- **Utenti previsti:** uso privato dichiarato nel brief; la destinazione definitiva non è stata confermata.
- **Repository:** [federicocroletti-tech/noise-diary](https://github.com/federicocroletti-tech/noise-diary).
- **Branch locale:** `main` (allineato a `origin/main` prima delle modifiche locali non committate).
- **Deployment:** GitHub Pages, [noise-diary](https://federicocroletti-tech.github.io/noise-diary/); raggiungibilità verificata via HTTPS.
- **Tecnologie:** Angular 22, TypeScript 6, RxJS 7, SCSS, Vitest, IndexedDB, Web Crypto e Angular Service Worker.
- **Evidenze:** [README.md](./README.md), [package.json](./package.json), [angular.json](./angular.json), [docs/INITIAL_PROJECT_BRIEF.md](./docs/INITIAL_PROJECT_BRIEF.md).

## 2. Stato verificato

- **Data e ora dell’analisi:** 2026-11-08, circa 23:20 CET.
- **Commit remoto/local base:** `7ba2aa9` (merge del PR #3 su `main`); le modifiche della funzione di cancellazione sono locali e non committate.
- **Ambiente:** Windows; Node.js `v22.22.3`; npm `10.9.8`; dipendenze già presenti in `node_modules`.
- **Comandi eseguiti:**
  - `git status --short --branch`, `git branch -vv`, `git log`, confronto locale `HEAD...origin/main` (nessun `fetch`);
  - `npm test` — superato, 6 file e 36 test;
  - `npm run build` — superato, con warning sul budget SCSS;
  - `npm run content:check` — superato, con avviso di revisore non assegnato;
  - `npm run lint` — fallito, Prettier segnala 65 file;
  - `git diff --check` — superato;
  - prova browser locale — backup cifrato di un episodio e un audio sintetici ripristinato su un'origine pulita; cancellazione verificata su entrambi gli archivi di prova (IndexedDB assente, chiave/vault e dati legacy assenti).
- **Modifiche locali:** funzione esplicita di cancellazione, test e documentazione; non ancora committate né pubblicate.
- Nessuna dipendenza è stata installata. Il deploy Pages più recente è il merge `7ba2aa9`; il codice locale di cancellazione non è ancora incluso nel sito live.
- **Evidenze:** verifiche locali del 2026-11-08; workflow configurato in [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml).

## 3. Funzionalità presenti

| Funzionalità                         | Stato ed evidenza                                                                                                                                                                                                                    | Verifica                                                                                                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creazione di una bozza evento        | Presente: il form raccoglie data/ora, stanza, intensità percepita e contesto. La stanza non è obbligatoria.                                                                                                                          | Test componente incluso in `npm test`.                                                                                                                                                                                                                  |
| Consultazione, ricerca e ordinamento | Presente: lista con ricerca testuale e ordinamento per data, intensità o stanza; non è una tabella.                                                                                                                                  | Ispezione di [src/app/app.html](./src/app/app.html) e [src/app/app.ts](./src/app/app.ts).                                                                                                                                                               |
| Modifica evento                      | Presente: richiede un motivo, salva uno snapshot precedente e mantiene la cronologia nell'evento locale cifrato.                                                                                                                     | Test componente per salvataggio, annullamento e conservazione dei valori non indicati; `npm test` superato.                                                                                                                                             |
| Eliminazione evento                  | Presente: richiede conferma e rimuove evento e clip audio associate dalla IndexedDB locale con una transazione. Non attesta cancellazione da backup o altri dispositivi.                                                             | Test di componente e storage inclusi in `npm test`.                                                                                                                                                                                                     |
| Intensità                            | Scala numerica discreta 1–5, esplicitamente soggettiva; non è una misura in dB(A).                                                                                                                                                   | Template e modello in [src/app/domain/noise-event.model.ts](./src/app/domain/noise-event.model.ts).                                                                                                                                                     |
| Persistenza locale                   | Eventi e audio cifrati con AES-GCM in IndexedDB; chiave dati avvolta da password e chiave di recupero locale. Vault precedenti migrano al primo sblocco con la password corrente.                                                    | Test servizio e browser locale; cancellazione dell'archivio verificata con dati sintetici.                                                                                                                                                              |
| Recupero password                    | La chiave di recupero consente di impostare una nuova password e viene sostituita; la chiave nuova va conservata e confermata. Non esiste un reset remoto o admin.                                                                   | Test di servizio/UI inclusi nei 36 test superati.                                                                                                                                                                                                     |
| Backup e ripristino                  | File `.ndbackup` cifrato con password inserita all'esportazione, episodi e audio; importazione additiva con gestione esplicita dei conflitti e modalità sostitutiva confermata. JSON storici in chiaro importabili solo dopo avviso. | Round-trip browser locale con un episodio e una registrazione sintetici; entrambi visibili dopo il ripristino.                                                                                                                                          |
| Cancellazione locale                 | Rimuove database IndexedDB, dati legacy e configurazione del vault dall'origine corrente dopo conferma digitata. Non elimina file/backup esportati né effettua secure erase.                                                         | Test di servizio/UI e verifica browser locale su archivi sintetici.                                                                                                                                                                                    |
| Registrazione audio                  | Avvio esplicito, accesso al microfono, limite temporale e dimensionale, conservazione locale cifrata.                                                                                                                                | Ispezione di [audio-recording.service.ts](./src/app/audio/audio-recording.service.ts) e [audio-clip.repository.ts](./src/app/audio/audio-clip.repository.ts).                                                                                           |
| Guide documentali                    | Contenuti editoriali organizzativi; non sono funzioni generate dall’app e non costituiscono consulenza.                                                                                                                              | [situations/noise/README.md](./situations/noise/README.md).                                                                                                                                                                                             |

## 4. Funzionalità parziali o mancanti

- La consultazione è una lista, non la tabella richiesta.
- La stanza è facoltativa; l’intensità ha un valore iniziale e i valori non hanno descrittori accessibili individuali.
- L’ora locale viene convertita in UTC senza conservare il fuso orario originale.
- Non risultano implementati planimetria, calendario, report o sincronizzazione. La cancellazione degli archivi gestiti dall'app e il ripristino cifrato sono stati verificati con dati sintetici su origini browser locali separate; questa verifica non dimostra cancellazione sicura dei supporti o rimozione di copie esportate/sincronizzate.
- Il pannello “Analisi frequenze” dichiara che l’analisi non è disponibile; l’indicatore “Offline” è statico.
- La cancellazione riguarda gli archivi gestiti dall'app nell'origine corrente; altre origini, profili, backup e copie sincronizzate restano fuori ambito.

## 5. Build, lint e test

| Comando                 | Esito                      | Problemi o note                                                                                                                                              |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`              | Superato — 6 file, 36 test | Include test CRUD, backup cifrato, cancellazione e rimozione degli audio associati.                                                                             |
| `npm run build`         | Superato                   | `src/app/app.scss` è 7,83 kB: supera il warning budget di 4 kB, ma resta sotto il limite di errore di 8 kB.                                                  |
| `npm run lint`          | Fallito                    | Prettier segnala 65 file; il comando controlla Markdown/YAML/tool, non il TypeScript. Nessun file è stato formattato automaticamente.                        |
| `npm run content:check` | Superato                   | È segnalato il revisore non assegnato in `situations/noise/metadata.yml`; nessun indice è stato rigenerato.                                                    |
| `git diff --check`      | Superato                   | Nessun errore whitespace.                                                                                                                                    |

Non esiste uno script `typecheck` separato; la compilazione Angular è inclusa nei test e nella build. La prova browser usa solo dati sintetici e origini localhost distinte; non sono stati eseguiti test mobile o verifiche automatiche di accessibilità.

## 6. Git e GitHub

- **Branch:** `main`, allineato a `origin/main` al commit `7ba2aa9` prima delle modifiche locali di questa attività.
- **Remote:** `origin` configurato per `federicocroletti-tech/noise-diary`.
- **Worktree:** modifiche locali non committate per la funzione di cancellazione, test e documentazione.
- **Modifiche del worktree:** interfaccia e servizi per cancellazione locale, test, README, privacy, roadmap e questo riepilogo di stato. Tutto non committato.
- `.gitignore` esclude dipendenze, build e cache, ma non contiene una regola esplicita per `.env`. Nessun file `.env` è stato rilevato per nome nel progetto; non sono stati letti valori di configurazione né eseguita una scansione completa di segreti.
- La documentazione preesistente segnala un possibile dato residenziale pubblicato in fixture e cronologia. Non è stato riprodotto né verificato in questa analisi.
- Nessun commit, push o deployment delle modifiche locali è stato eseguito.

## 7. Deployment

- **Provider configurato:** GitHub Pages tramite [deploy-pages.yml](./.github/workflows/deploy-pages.yml); nessun `render.yaml` o Dockerfile rilevato.
- Il workflow Actions mostra un deploy riuscito per il merge `7ba2aa9`: [run 42526189349](https://github.com/federicocroletti-tech/noise-diary/actions/runs/42526189349).
- Il sito risponde via HTTPS, ma non include le modifiche locali non committate della cancellazione.

## 8. Architettura

Applicazione Angular standalone a singola vista, con stato locale basato su signals nel componente principale. `app.routes.ts` esporta un array di route vuoto. La persistenza è browser-local; non è stato individuato un backend applicativo. Il Service Worker memorizza bundle e asset statici.

Evidenze: [docs/CURRENT_ARCHITECTURE.md](./docs/CURRENT_ARCHITECTURE.md), [src/app/app.ts](./src/app/app.ts), [src/app/app.routes.ts](./src/app/app.routes.ts), [ngsw-config.json](./ngsw-config.json).

## 9. Dati e persistenza

Gli eventi e i contenuti audio sono cifrati prima della scrittura in IndexedDB. La configurazione del vault locale è in localStorage; una chiave dati casuale è avvolta da chiavi derivate da password e chiave di recupero, che non vengono salvate in chiaro. La chiave di recupero consente il reset locale della password. I vault precedenti migrano al primo sblocco valido e la nuova chiave viene attivata solo dopo che l'utente ne conferma il salvataggio. Il backup `.ndbackup` è cifrato separatamente con la password fornita all'esportazione; il round-trip di episodio e audio è stato provato con dati sintetici. La nuova cancellazione rimuove il database IndexedDB, i dati legacy e la configurazione del vault dall'origine corrente; non rimuove backup esportati né promette cancellazione sicura dei supporti.

## 10. Sicurezza e privacy

- I dati potenzialmente trattati localmente includono data/ora, stanza, descrizioni, note, intensità ed eventuali audio identificabili.
- Nel codice esaminato non sono stati individuati account, backend applicativo, cookie o analytics. La verifica è limitata al sorgente letto e non certifica l’assenza di ogni possibile comunicazione.
- La cifratura locale non protegge da codice malevolo eseguito nella pagina mentre il vault è sbloccato; il lock è manuale.
- I backup cifrati sono copie indipendenti e non si aggiornano; resta necessaria una conservazione sicura della password del backup e del file. La chiave di recupero è un segreto distinto che consente di impostare una nuova password per il vault.
- La cancellazione degli archivi gestiti dall'app è verificata con dati sintetici, ma non equivale a secure erase e non elimina copie esterne.
- La documentazione segnala un possibile dato personale nelle fixture/cronologia già pubblica; l’analisi non ha ripetuto una scansione storica.
- Nessuna valutazione di conformità GDPR, valutazione legale o revisione crittografica è stata svolta.

Riferimenti: [PRIVACY.md](./PRIVACY.md), [SECURITY.md](./SECURITY.md), [docs/DATA_CLASSIFICATION.md](./docs/DATA_CLASSIFICATION.md), [docs/SECURITY_THREAT_MODEL.md](./docs/SECURITY_THREAT_MODEL.md).

## 11. Accessibilità

Sono presenti label per vari controlli e alcuni messaggi con ruoli ARIA. Gli elementi selezionabili della lista supportano click, Invio e Spazio; i pulsanti di modifica ed eliminazione hanno etichette accessibili. La UI ha media query responsive, ma non è stata verificata su dispositivi. Nessun test WCAG 2.2, axe o screen reader è stato eseguito; contrasto e target non sono stati misurati.

## 12. Debito tecnico

- La vista è una lista anziché una tabella; il CRUD è verificato tramite test unitari ma non ancora tramite test E2E/browser.
- Nessuna conservazione esplicita del fuso orario.
- Definire retention e lock automatico; testare errori di password/file backup e condizioni multi-scheda.
- Pipeline locale non verde per formattazione e indice editoriale.
- Assenza di test E2E e accessibilità automatizzata.
- Warning di budget sul foglio SCSS.
- Alcuni indicatori/analisi della UI sono statici o non implementati.

## 13. Rischi e blocchi

- **P0 — privacy:** rischio storico dichiarato nei documenti, da valutare senza riscrivere la cronologia senza autorizzazione esplicita.
- **P1 — funzionalità:** la consultazione resta una lista anziché una tabella; modifica ed eliminazione locale sono implementate e verificate, ma non garantiscono la cancellazione da backup o altri dispositivi.
- **P1 — continuità dati:** perdita della chiave di recupero e della password, o dello storage senza backup valido, può impedire il recupero; il round-trip locale è stato provato con dati sintetici.
- **P2 — accessibilità:** navigazione della lista da tastiera e conformità WCAG non verificate.
- **P2 — qualità:** lint fallisce localmente per formattazione; content check passa con avviso di revisore mancante.
- **Non verificabile:** configurazioni amministrative GitHub e cancellazione da backup del browser/sincronizzazioni esterne.

## 14. Decisioni da prendere

- Confermare se l’app resterà esclusivamente personale o verrà distribuita ad altri.
- Definire retention e timeout del vault; l'eliminazione locale non equivale a secure erase.
- Decidere quale fuso orario conservare e come trattare cambi di ora legale.
- Valutare il rischio storico privacy con una procedura separata e autorizzata.
- Confermare requisiti e limiti per una futura planimetria, che contiene dati domestici potenzialmente sensibili.
- Assegnare un revisore qualificato per i contenuti normativi; i documenti attuali non costituiscono verifica legale.

## 15. Roadmap proposta

| Priorità | Attività e motivazione                                                                                | Dipendenze                                                          | Rischio | Complessità | Criterio di accettazione                                                                            | Test richiesti                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | ----------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| P0       | Valutare il rischio di dati personali nella cronologia pubblica.                                      | Decisione del proprietario; nessuna riscrittura senza approvazione. | Alto    | M           | Decisione e perimetro documentati senza esporre i dati.                                             | Verifica autorizzata di repository/cronologia, senza riportare valori sensibili.            |
| P1       | Verifica di regressione post-pubblicazione per restore e cancellazione locale.                      | Revisione e pubblicazione delle modifiche locali.                   | Alto    | M           | Episodi e audio ripristinati; archivio vuoto dopo cancellazione; limiti dichiarati chiaramente.     | Round-trip sintetico, cancellazione, password errata e file corrotti.                       |
| P2       | Risolvere formattazione e indice editoriale in attività indipendenti.                                 | Revisione dei contenuti e assegnazione revisore.                    | Basso   | S           | `npm run lint` e `npm run content:check` superati senza disabilitare controlli.                     | Eseguire i due comandi in sola verifica.                                                    |
| P2       | Migliorare navigazione da tastiera e verifiche responsive/accessibilità.                              | Nessuna.                                                            | Medio   | M           | Flussi principali usabili da tastiera con focus evidente.                                           | Test manuale, screen reader e axe su flussi essenziali.                                     |
| P3       | Valutare planimetria locale con overlay immagine/SVG e coordinate normalizzate.                       | Planimetria fornita e decisione privacy esplicita.                  | Alto    | L           | Nessun upload o tile esterno; posizione persistente in locale e indipendente dal ridimensionamento. | Test di resize, zoom, associazione alla stanza, persistenza e assenza di richieste esterne. |

Per la planimetria, un overlay locale su immagine/SVG con coordinate normalizzate `[0,1]` è una prima opzione proporzionata; aree delle stanze possono essere aggiunte successivamente. Leaflet `CRS.Simple` può offrire zoom e pan ma introduce dipendenza e complessità. Un PDF andrebbe elaborato localmente; planimetria e coordinate non dovrebbero essere caricate su servizi esterni o pubblicate senza autorizzazione.

## 16. Prossimo passo consigliato

Rivedere le modifiche locali della cancellazione prima di un eventuale commit/PR; non eseguire commit, push o deployment senza autorizzazione esplicita.
