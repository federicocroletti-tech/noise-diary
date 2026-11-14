# Diario Rumore

Diario Rumore è una PWA per annotare episodi di rumore domestico e ambientale. Supporta account online email/password con sincronizzazione privata e mantiene separato il diario locale storico.

## App Android

È disponibile un’app Android nativa con la stessa interfaccia e lo stesso account/database cloud. Richiede Internet per leggere e sincronizzare l’account; le modifiche offline non vengono accodate. Consulta [la guida Android](./docs/android-app.md) per prerequisiti, generazione e percorso dell’APK di debug.

## Come usare l’app

Leggi la **[Guida all’uso di Diario Rumore](./docs/guida-utente.md)**: primo accesso, account e profili locali, creazione e correzione degli episodi, audio, backup, importazione e recupero password.

La stessa guida è disponibile nell’app dal collegamento **Guida all’uso** nell’intestazione, anche prima dell’accesso.

## Cosa offre oggi

- Diario cronologico con ricerca, ordinamento e bozze.
- Intensità percepita (scala soggettiva 1–5), contesto, note e ipotesi dichiarate come tali.
- Account online con email/password, verifica email via codice OTP e recupero password via email.
- Diario e registrazioni audio sincronizzati per account; i dati cloud sono isolati tramite `user_id`, Row-Level Security PostgreSQL e bucket audio privato.
- Modalità locale indipendente con profili separati, password, chiave di recupero e cifratura AES-GCM di episodi e registrazioni.
- Backup locale versionato, cifrato con la password richiesta all'esportazione, con episodi e registrazioni audio; importazione additiva con gestione dei conflitti.
- Registrazioni audio esplicitamente avviate dall'utente e salvate nel profilo locale o sincronizzate nell'account attivo.
- Contenuti guida pilota per documentare episodi di rumore senza trasformare osservazioni o ipotesi in accertamenti.

**Limiti attuali:** l'applicazione non genera fascicoli, comunicazioni o PDF e non supporta allegati immagine. I dati dell'account sono conservati nel cloud e non sono cifrati end-to-end dall'app; l'accesso è limitato all'account dalle policy RLS, mentre password, sessioni e recupero sono gestiti da Neon Auth. I dati dei profili locali sono cifrati nel browser. Backup esportati, file scaricati e copie locali non vengono eliminati cancellando un account o un diario cloud.

## Cosa non è

Non sostituisce avvocati, tecnici competenti, medici, amministratori, autorità o altri professionisti abilitati. Non determina la sorgente di un rumore, la sua conformità a limiti, responsabilità o rimedi. Le guide organizzative non sono consulenza legale, tecnica o sanitaria.

Distingui sempre:

- **Fatto osservato:** ciò che una persona ha direttamente osservato, con contesto e data.
- **Misurazione:** valore registrato con strumento, unità e condizioni dichiarati.
- **Documento:** file o comunicazione disponibile, con provenienza descritta.
- **Dichiarazione di terzi:** attribuita alla persona o alla fonte, senza presentarla come verificata.
- **Ipotesi dell'utente:** interpretazione personale, non accertata.
- **Interpretazione automatica:** risultato di uno strumento, non conclusione professionale.
- **Valutazione professionale:** valutazione attribuita al professionista e al relativo documento.

## Mappa del repository

| Percorso                                                                                         | Contenuto                                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [`src/`](./src/)                                                                                 | Applicazione Angular e modelli locali                                                      |
| [`situations/`](./situations/README.md)                                                          | Indice generato e guide per situazione; il pilota è [rumore](./situations/noise/README.md) |
| [`jurisdictions/`](./jurisdictions/README.md)                                                    | Ambito globale organizzativo e future guide nazionali revisionate                          |
| [`docs/`](./docs/content-review-policy.md)                                                       | Regole di revisione editoriale, fonti e contenuti legali                                   |
| [`.github/`](./.github/CODEOWNERS)                                                               | Proprietario delle aree, workflow e modelli di contributo                                  |
| [`tools/content-check.mjs`](./tools/content-check.mjs)                                           | Controlli locali e generazione dell'indice situazioni                                      |
| [`CHANGELOG.md`](./CHANGELOG.md), [`AUTHORS.md`](./AUTHORS.md), [`CITATION.cff`](./CITATION.cff) | Modifiche, riconoscimenti e citazione                                                      |

## Come usare una guida

1. Apri l'indice [`situations/`](./situations/README.md) e la pagina `README.md` della situazione.
2. Escludi prima rischi immediati e consulta i servizi di emergenza locali se vi è un pericolo imminente.
3. Segui le indicazioni di raccolta documentale non invasive; annota data, contesto e incertezza.
4. Verifica la giurisdizione e le fonti ufficiali prima di fare affidamento su procedure o riferimenti normativi.
5. Personalizza ogni modello: è una bozza, non un parere né una comunicazione verificata.
6. Prima di pubblicare, rimuovi nomi, indirizzi, recapiti, targhe, firme, metadati e ogni altro identificativo.

Le guide sono organizzative e globali salvo diversa indicazione esplicita. Una procedura italiana non va generalizzata ad altri Paesi.
La sola sezione globale è [`jurisdictions/global/`](./jurisdictions/global/README.md); non sono ancora pubblicate guide nazionali verificate.

## Account online e credenziali

Per usare la sincronizzazione, crea un account con email e password (almeno 12 caratteri), verifica l'indirizzo con il codice OTP ricevuto via email e accedi. Per una password dimenticata usa **Password dimenticata?**: Neon Auth invia un codice OTP e revoca le sessioni quando la password viene reimpostata. L'app non salva la password in chiaro; email, password e sessioni sono gestite da Neon Auth. Al momento è configurato il mittente email condiviso di Neon: prima di un uso pubblico va configurato e verificato un provider SMTP dedicato nel pannello Neon.

Gli episodi cloud sono righe PostgreSQL con `user_id` assegnato dall'identità autenticata. Le policy Row-Level Security consentono a ciascun account di leggere e modificare solo i propri dati. Gli audio sono in un bucket Object Storage privato con chiavi prefissate dall'ID account; una Neon Function verifica il JWT e rilascia URL firmati a breve durata. Le credenziali S3 restano nella Function e non sono incluse nel bundle pubblico della PWA. La cancellazione del diario cloud elimina episodi e audio dell'account, non backup esportati o copie locali.

## Diario locale e trasferimento dei dati precedenti

Il diario precedente resta nel browser e non viene trasferito o cancellato automaticamente. Per migrarlo nell'account, apri la modalità locale, sblocca il profilo storico, crea un **backup cifrato**, poi accedi all'account e importalo usando la password del backup. Puoi scegliere importazione additiva o ripristino sostitutivo dopo una conferma esplicita. Il backup resta una copia indipendente.

La modalità locale usa profili distinti nello stesso browser con password, chiave di recupero e cifratura AES-GCM; non è un account e non sincronizza dispositivi. Senza password o chiave di recupero i dati locali non sono decifrabili. Consulta [la guida a cifratura e importazione locale](./docs/local-encrypted-import.md).

Un episodio può essere corretto indicando un motivo, conservato insieme alla versione precedente. L'eliminazione dal diario online rimuove i dati sincronizzati dell'account; quella locale rimuove solo il profilo attivo in questo browser. Nessuna delle due elimina backup, file scaricati o copie di altri dispositivi.

Il codice di questa integrazione è nel repository; il sito GitHub Pages non viene aggiornato automaticamente finché la modifica non è pubblicata su `main` e il workflow Pages non termina con successo.

La generazione di lettere, PDF, ZIP o fascicoli non è attualmente disponibile nell'app. I modelli in `situations/noise/documents/` sono documenti di testo da copiare, verificare e personalizzare separatamente; l'indice editoriale viene rigenerato con `npm run content:check -- --write-index`.

## Contribuire e segnalare

- Leggi [CONTRIBUTING.md](./CONTRIBUTING.md) e [GOVERNANCE.md](./GOVERNANCE.md).
- Rispetta il [Codice di condotta](./CODE_OF_CONDUCT.md).
- Proponi una guida o correzione con una pull request; nessun contributo viene integrato automaticamente.
- Le proposte normative devono includere fonte ufficiale, ambito, data di verifica e revisore qualificato.
- Per errori di contenuto, usa un issue senza dati personali.
- Per proporre una situazione, apri un issue di contenuto e descrivi ambito, giurisdizione, rischio e fonti; non duplicare cartelle finché il maintainer non ha approvato la struttura.
- Per proporre un aggiornamento normativo, cita una fonte ufficiale con URL, ambito e data di verifica. Un issue non equivale a revisione o pubblicazione.
- Per problemi di sicurezza o privacy, segui [SECURITY.md](./SECURITY.md); non pubblicare prove o dati sensibili in un issue pubblico.
- L'approvazione finale resta al maintainer principale. Il controllo automatico dei dati personali è euristico e non sostituisce la revisione umana.

## Licenze

Il codice è rilasciato con licenza MIT; la documentazione e i contenuti editoriali sono rilasciati con licenza Creative Commons Attribution 4.0 International (CC BY 4.0). I contributori mantengono il copyright delle proprie opere e autorizzano l'uso secondo la licenza pertinente. Vedi [`LICENSE`](./LICENSE) e [CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

L'evoluzione NOYSE parte dall'[analisi del repository e backlog prioritizzato](./docs/NOYSE_EVOLUTION.md), aggiornati al working tree del 2026-11-10. Il documento distingue implementazioni locali, requisiti futuri e verifiche cloud ancora necessarie.

La roadmap completa e il prossimo singolo passo sono in [ROADMAP.md](./ROADMAP.md). Il primo incremento introduce il caso pilota noise e il processo editoriale; non implementa ancora generazione/esportazione completa dei fascicoli.

## Avvio e verifica

Requisiti: Node.js 22+ e npm 10+.

```bash
npm ci
npm start
```

```bash
npm run content:check
npm run lint
npm test
npm run build
npx playwright install chromium  # solo la prima volta
npm run e2e
```

`npm run e2e` avvia l'app su `localhost:4317` e verifica con Playwright i flussi del diario locale (desktop e mobile), bloccando ogni richiesta verso Neon.

Il workflow pull request non richiede segreti, non carica file degli utenti e valida contenuti, formattazione, test e build. La configurazione amministrativa delle regole di protezione branch è descritta in [GOVERNANCE.md](./GOVERNANCE.md).

## Responsabilità e privacy

Prima di pubblicare, leggi [DISCLAIMER.md](./DISCLAIMER.md), [PRIVACY.md](./PRIVACY.md) e le [politiche di revisione e verifica](./docs/content-review-policy.md). Contenuti pubblici devono essere sintetici o anonimizzati; non pubblicare casi o allegati reali. In modalita' locale i dati restano nel browser; in modalita' account eventi e audio vengono sincronizzati nei servizi cloud configurati e non sono cifrati end-to-end dall'app. I dati del diario non fanno parte del bundle GitHub Pages e non vengono inviati ai workflow. La cifratura locale non sostituisce un account o un servizio di sincronizzazione autenticato.
