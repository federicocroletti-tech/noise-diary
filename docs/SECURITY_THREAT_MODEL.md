# Modello delle minacce

## Ambito e assunzioni

Applicazione Angular statica distribuita da GitHub Pages; un solo proprietario, dati su un singolo profilo browser, nessun backend o account remoto. La cifratura locale riduce l’esposizione a riposo, ma non protegge da codice malevolo in esecuzione mentre il vault è sbloccato, da compromissione del dispositivo o da divulgazione di una copia di backup.

## Asset e classificazione

- Eventi, luoghi, stanze, contatti e note: `CONFIDENTIAL`.
- Audio, immagini, video, documenti, identificativi, comunicazioni e dati sanitari/giudiziari: `HIGHLY_CONFIDENTIAL`.
- Password e chiavi: segreti locali, mai da loggare o committare.
- Sorgente, documentazione generica e fixture sintetiche: `PUBLIC`.
- Configurazioni di build non sensibili: `INTERNAL`.

Nessun dato `CONFIDENTIAL` o `HIGHLY_CONFIDENTIAL` deve essere committato. Il dettaglio delle classi è in [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md).

## Minacce e controlli

| Minaccia                                          | Superficie/asset                             | Controlli attuali                                                                                                        | Lacune e rischio residuo                                                                                                                                                                                                                | Priorità   |
| ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Accesso al dispositivo o sessione lasciata aperta | Browser sbloccato, dati decifrati in memoria | Password locale; lock manuale; UI svuotata al lock                                                                       | Nessun lock per inattività/background; lock non esegue una garanzia di zeroizzazione della memoria JS                                                                                                                                   | Alta       |
| XSS o dipendenza compromessa                      | Pagina origin, DOM e vault aperto            | Template Angular; ricerca mirata senza `innerHTML`, bypass sanitizer, `eval` o `new Function`                            | Nessuna CSP; ogni script della stessa origine può operare nel contesto dell’app; nessuno scan supply-chain dedicato                                                                                                                     | Alta       |
| Furto/forza bruta offline                         | Configurazione e ciphertext locale o export  | Chiave dati casuale avvolta con AES-GCM; PBKDF2-SHA-256, salt casuali, password minima 12 caratteri                      | Nessun rate limit è possibile per tentativi offline; robustezza password dipende dall’utente; furto della chiave di recupero consente di reimpostare la password; export resta cifrato con la password usata al momento della creazione | Alta       |
| Perdita password, storage o dispositivo           | IndexedDB, chiave di recupero e backup       | Recupero locale tramite chiave; test automatici per round-trip, recovery e migrazione; backup cifrato di episodi e audio | Perdita della chiave e password o dello storage senza backup valido può impedire il recupero; restore non ancora verificato manualmente su profilo separato; nessuna cancellazione completa                                             | Alta       |
| Condivisione eccessiva                            | Backup, download, audio e metadati           | Backup cifrato locale senza invio automatico                                                                             | Backup include audio sensibile e non ha filtri/redazione/manifest/preview; una password debole o file condiviso può esporre i dati                                                                                                      | Alta       |
| Registrazione di terzi non necessaria             | Microfono e audio                            | Azione esplicita, permesso browser, timer, limite 5 minuti e 50 MiB, guida di cautela                                    | Nessuna valutazione automatica di contesto o persone; l’utente deve decidere necessità e regole applicabili; cancellazione solo locale                                                                                                  | Alta       |
| Alterazione o falsa attribuzione                  | Eventi, timestamp, audio e hash              | ID, timestamp base, campo ipotesi e SHA-256 audio calcolato alla creazione                                               | Nessuna storia append-only o motivo correzione; hash non confrontato al recupero e non è firma digitale né prova di origine/data                                                                                                        | Media-alta |
| Import file malformato o enorme                   | Backup locale cifrato o JSON storico         | Versione/formato, AES-GCM, limite 120 MiB, validazione episodi/audio, hash e rifiuto ID duplicati                        | Nessun limite esplicito di profondità/costo parse JSON; input ostile resta locale ma può consumare memoria; i JSON storici richiedono conferma e sono in chiaro                                                                         | Media      |
| Supply-chain/CI                                   | GitHub Actions e npm                         | Lockfile; `npm ci`; workflow PR con permessi `contents: read`; PR non usa segreti                                        | Action su tag maggiori, secret scan/dependency review/CodeQL non configurati; job deploy riceve permessi a livello workflow; branch protection non verificata                                                                           | Media-alta |
| Esposizione tramite repository o cronologia       | Fixture, docs, issue, release e Git history  | Regole editoriali e check regex su subset di Markdown/YAML                                                               | Nessun controllo di segreti dedicato; checker non copre codice e cronologia, ha limiti euristici; possibile dato residenziale individuato nelle fixture pubblicate e non rimosso dalla cronologia remota                                | Alta       |
| Caching e origine pubblica                        | Service worker, bundle statico, URL pubblico | Cache limitata a bundle e asset; nessun dato utente nel deploy previsto                                                  | Nessuna CSP; il bundle dell’app è pubblico e non va confuso con protezione dell’archivio locale; policy host non verificata                                                                                                             | Media      |

## Controlli osservati

- Cifratura applicativa AES-GCM con IV casuale per payload e chiave dati casuale avvolta con chiavi derivate PBKDF2-SHA-256 da password e chiave di recupero.
- Nessun backend, endpoint di upload o servizio AI individuato nel flusso app esaminato.
- Nessun sink XSS ovvio emerso dalla ricerca mirata nei sorgenti Angular.
- Nessun file `.env`, chiave privata, database o registrazione utente individuato nell’inventario del checkout; ciò non equivale a uno scan completo della cronologia.
- `npm ci` ha riportato zero vulnerabilità note al momento dell’installazione. `gitleaks` non è disponibile; secret scanning storico non eseguito.
- La CI non esegue E2E, secret scanning, dependency review o CodeQL.

## Mitigazioni raccomandate

1. Rimuovere i dati personali dalle fixture e impedire nuovi commit di dati reali; concordare separatamente il trattamento della cronologia già pubblica.
2. Aggiungere lock automatico e test di lock, background e cancellazione dello stato visibile.
3. Verificare il ripristino cifrato su un profilo browser separato, definire cancellazione e mantenere evidente che ogni file esportato è una copia indipendente.
4. Definire CSP e headers in base al supporto effettivo dell’hosting statico, senza `unsafe-eval` aggiunto per comodità.
5. Ridurre privilegi GitHub per job, fissare Actions a SHA verificati e aggiungere secret/dependency scanning.
6. Aggiornare le istruzioni `.gitignore` e stabilire una verifica pre-pubblicazione che non mostri valori sensibili nei log.

Il modello è qualitativo e non sostituisce penetration test, revisione crittografica, threat modeling con il proprietario o analisi legale.
