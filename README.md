# Diario Rumore

Diario Rumore è una PWA local-first per annotare episodi di rumore domestico e ambientale. Il progetto sta evolvendo da diario personale a risorsa documentale aperta, multilingue e revisionata per organizzare situazioni domestiche, condominiali e tecniche.

## Cosa offre oggi

- Diario cronologico con ricerca, ordinamento e bozze.
- Intensità percepita (scala soggettiva 1–5), contesto, note e ipotesi dichiarate come tali.
- Password locale, chiave di recupero e cifratura AES-GCM di episodi e registrazioni nell'archivio del browser.
- Backup locale versionato, cifrato con la password richiesta all'esportazione, con episodi e registrazioni audio; importazione additiva con gestione dei conflitti.
- Registrazioni audio esplicitamente avviate dall'utente e salvate localmente in IndexedDB.
- Contenuti guida pilota per documentare episodi di rumore senza trasformare osservazioni o ipotesi in accertamenti.

**Limiti attuali:** l'applicazione non genera fascicoli, comunicazioni o PDF e non supporta allegati immagine. La cancellazione completa rimuove i dati gestiti dall'app nell'origine del browser corrente, ma non è una cancellazione sicura dei supporti e non elimina backup esportati, file scaricati o copie/sincronizzazioni del profilo browser. Il recupero è affidato a una chiave generata localmente, non a un account online o al maintainer: senza password e chiave di recupero i dati non sono recuperabili. I backup cifrati restano copie indipendenti.

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

Al primo avvio, crea una password locale di almeno 12 caratteri e conserva la chiave di recupero mostrata dall'app in un luogo sicuro separato. Se dimentichi la password, dalla schermata di accesso puoi usare la chiave per impostarne una nuova; il recupero genera una chiave sostitutiva da conservare. Scegli **Nuovo episodio** per annotare osservazioni e ipotesi; usa **Esporta backup cifrato** per salvare episodi e registrazioni audio in un file `.ndbackup`. Per importarlo, inserisci la password usata per creare quel backup: il file viene decifrato e validato solo nel browser. L'importazione è additiva; gli episodi con ID in conflitto richiedono una scelta esplicita e i file audio locali non vengono eliminati. Il ripristino sostitutivo, se avviato esplicitamente, conferma la rimozione dei dati locali non presenti nel backup. **Blocca** cancella i dati decifrati dalla vista corrente. Consulta [la guida a cifratura e importazione locale](./docs/local-encrypted-import.md) prima di inserire dati reali.

Un episodio può essere corretto indicando un motivo, conservato insieme alla versione precedente nella cronologia locale cifrata. Puoi anche eliminare un singolo episodio dopo una conferma: l'app rimuove dalla IndexedDB di questo browser l'episodio e le registrazioni audio associate. Questa eliminazione non garantisce la rimozione da backup, sincronizzazioni del profilo o altri dispositivi.

Non esistono account online, sincronizzazione o pannello Keycloak. Il recupero locale tramite chiave consente di impostare una nuova password senza perdere i dati, ma non offre accesso amministrativo al maintainer. Proteggi la chiave di recupero e il backup: senza password né chiave non è possibile decifrare il diario. Un backup esportato non si aggiorna quando il diario cambia.

Per rimuovere i dati gestiti dall'app su questo browser, sblocca il diario, chiudi le altre schede dell'app e scegli **Elimina diario locale**. Digita `ELIMINA` per confermare. L'app chiude e rimuove l'archivio IndexedDB (episodi e audio), i vecchi dati locali e la configurazione della chiave; la schermata torna alla configurazione iniziale. Il flusso è stato verificato localmente end-to-end con un episodio e una registrazione sintetici, ripristinati da backup cifrato in un'origine browser pulita. L'operazione non elimina copie esportate, file recuperati/scaricati, altri profili o dispositivi, né garantisce la sovrascrittura fisica dei supporti; i browser possono conservare backup o copie sincronizzate. Salva prima un backup cifrato se vuoi mantenere una copia recuperabile.

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
