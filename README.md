# Diario Rumore

Diario Rumore è una PWA local-first per annotare episodi di rumore domestico e ambientale. Il progetto sta evolvendo da diario personale a risorsa documentale aperta, multilingue e revisionata per organizzare situazioni domestiche, condominiali e tecniche.

## Cosa offre oggi

- Diario cronologico con ricerca, ordinamento e bozze.
- Intensità percepita (scala soggettiva 1–5), contesto, note e ipotesi dichiarate come tali.
- Password locale e cifratura AES-GCM di episodi e registrazioni nell'archivio del browser.
- Importazione idempotente di episodi JSON ed esportazione JSON dei metadati.
- Registrazioni audio esplicitamente avviate dall'utente e salvate localmente in IndexedDB.
- Contenuti guida pilota per documentare episodi di rumore senza trasformare osservazioni o ipotesi in accertamenti.

**Limiti attuali:** l'applicazione non genera fascicoli, comunicazioni o PDF; l'esportazione non include le registrazioni audio; non supporta allegati immagine, modifica o cancellazione completa dei casi. La password protegge soltanto l'archivio locale: non esistono account online, sincronizzazione o recupero password. I file JSON esportati sono in chiaro e vanno conservati privatamente.

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

## Creare e gestire un caso nell'app

Al primo avvio, crea una password locale di almeno 12 caratteri. Scegli **Nuovo episodio** per annotare osservazioni e ipotesi; usa **Importa storico JSON** per aggiungere episodi validati senza sostituire quelli già presenti. L'importazione viene elaborata nel browser e non invia il file a un server. Gli episodi e le registrazioni vengono cifrati con AES-GCM in IndexedDB; la chiave è derivata dalla password e resta in memoria solo mentre il diario è sbloccato. **Blocca** cancella i dati decifrati dalla vista corrente. Consulta [la guida a cifratura e importazione locale](./docs/local-encrypted-import.md) prima di inserire dati reali.

Non esistono account online o sincronizzazione: la password è locale e non può essere reimpostata. Un'esportazione JSON contiene dati in chiaro; i file audio non sono inclusi nell'esportazione.

La cancellazione completa dei dati non è ancora implementata. La cancellazione dei dati del browser o la disinstallazione non è una procedura affidabile di cancellazione verificata. Non inserire dati che non desideri conservare sul dispositivo; usa un'esportazione privata per avere una copia recuperabile.

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
```

Il workflow pull request non richiede segreti, non carica file degli utenti e valida contenuti, formattazione, test e build. La configurazione amministrativa delle regole di protezione branch è descritta in [GOVERNANCE.md](./GOVERNANCE.md).

## Responsabilità e privacy

Prima di pubblicare, leggi [DISCLAIMER.md](./DISCLAIMER.md), [PRIVACY.md](./PRIVACY.md) e le [politiche di revisione e verifica](./docs/content-review-policy.md). Contenuti pubblici devono essere sintetici o anonimizzati; non pubblicare casi o allegati reali. I dati importati o registrati restano nel browser dell'utente, non fanno parte del bundle GitHub Pages e non vengono inviati ai workflow. La cifratura locale non sostituisce un account o un servizio di sincronizzazione autenticato.
