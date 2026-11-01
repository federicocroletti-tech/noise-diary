# Prompt iniziale del progetto

Trascrizione del prompt iniziale fornito per l’audit e la Fase 0.

Agisci come Senior Software Engineer, Software Architect, Security Engineer e Privacy-by-Design specialist con conoscenza prudente della normativa italiana in materia di rumore, immissioni, documentazione informatica e protezione dei dati.

Devi riprendere e migliorare un progetto già esistente destinato, in questa fase, esclusivamente all’uso privato del proprietario dell’abitazione.

## OBIETTIVO DEL PROGETTO

L’applicazione deve permettere di registrare in modo rapido, ordinato, verificabile e non suggestivo gli episodi di rumore o disturbo percepiti all’interno di un appartamento.

Il sistema deve aiutare l’utente a:

- registrare data, ora di inizio e fine dell’evento;
- indicare la stanza nella quale il rumore è stato percepito;
- descrivere il rumore con caratteristiche osservabili;
- distinguere fatti, percezioni personali e ipotesi;
- allegare audio, immagini, video o documenti;
- annotare eventuali persone presenti;
- registrare soggetti ed enti contattati;
- memorizzare comunicazioni, protocolli e risposte;
- ricostruire frequenza, durata e distribuzione temporale degli eventi;
- produrre esportazioni selettive da consegnare a un amministratore di condominio, avvocato, tecnico competente in acustica, Polizia Locale, Comune, ARPA o altra autorità competente;
- predisporre in futuro una rappresentazione delle stanze e della posizione nella quale il rumore è stato percepito.

Il sistema NON deve:

- dichiarare che un fatto costituisce un reato o un illecito;
- affermare che sia stato superato un limite legale;
- presentare i valori rilevati da smartphone o microfoni consumer come misurazioni fonometriche certificate;
- attribuire automaticamente il rumore a una persona, un appartamento o un impianto;
- generare accuse;
- modificare o sovrascrivere silenziosamente gli eventi già consolidati;
- pubblicare o trasmettere automaticamente registrazioni;
- registrare continuamente l’ambiente;
- usare servizi di intelligenza artificiale esterni sui dati reali senza consenso esplicito e configurazione consapevole;
- inserire dati personali reali nel repository, nei test, nelle fixture, negli screenshot o nella documentazione.

## PRINCIPIO DI AFFIDABILITÀ

Il diario è una documentazione prodotta dall’utente e non è una certificazione tecnica o una prova incontestabile.

Ogni evento deve distinguere chiaramente:

1. FATTO OSSERVATO
   Esempio: “Alle 23:42 ho percepito un rumore intermittente nella camera da letto.”

2. PERCEZIONE O IMPATTO PERSONALE
   Esempio: “Il rumore ha interrotto il sonno.”

3. IPOTESI NON VERIFICATA
   Esempio: “Il rumore sembrava provenire dalla parete nord.”

4. DATO STRUMENTALE NON CERTIFICATO
   Esempio: “Valore indicativo rilevato dal telefono, non utilizzabile come misura fonometrica certificata.”

5. DATO O ATTO ESTERNO
   Esempio: verbale, relazione tecnica, numero di protocollo, comunicazione dell’amministratore o intervento della Polizia Locale.

## CONTESTO NORMATIVO DA CONSIDERARE CON PRUDENZA

Considera come riferimenti da verificare, senza trasformare l’app in un consulente legale:

- articolo 844 del Codice civile sulle immissioni;
- articolo 659 del Codice penale sul disturbo delle occupazioni o del riposo delle persone;
- Legge 26 ottobre 1995 n. 447;
- DPCM 14 novembre 1997;
- DM 16 marzo 1998;
- Legge Regionale Lombardia 10 agosto 2001 n. 13;
- disposizioni e procedure vigenti del Comune di Milano;
- Regolamento di Polizia Urbana del Comune di Milano;
- Regolamento UE 2016/679;
- D.Lgs. 196/2003 come modificato;
- principi di necessità, proporzionalità, minimizzazione, limitazione della conservazione, integrità e riservatezza.

Non dare per certa l’applicabilità di una norma senza aver controllato una fonte istituzionale aggiornata.

Non riportare sentenze, massime, soglie, sanzioni, termini o interpretazioni giuridiche se non sono verificabili.

Se un punto giuridico è dubbio, inseriscilo nel documento OPEN_QUESTIONS.md e non inventare una risposta.

## FASE 0: ANALISI OBBLIGATORIA

Non modificare immediatamente il codice.

Analizza prima l’intero repository:

- README;
- package.json e lockfile;
- framework, versione e dipendenze;
- struttura delle cartelle;
- componenti;
- routing;
- modelli dati;
- servizi;
- state management;
- meccanismo di persistenza;
- autenticazione;
- gestione allegati;
- test;
- configurazione lint e formatting;
- build;
- CI/CD;
- sicurezza;
- documentazione;
- cronologia Git disponibile;
- branch corrente;
- file non tracciati;
- TODO e funzionalità incomplete.

Controlla inoltre:

- se esistono dati personali reali;
- se esistono segreti o credenziali;
- se sono presenti registrazioni reali;
- se file sensibili vengono tracciati da Git;
- se la persistenza attuale è appropriata;
- se gli allegati sono protetti;
- se esistono dipendenze vulnerabili o non mantenute;
- se il progetto contiene codice generato o incoerente;
- se sono presenti funzionalità apparentemente complete ma tecnicamente false o simulate.

Non stampare in chat valori di segreti eventualmente trovati.

Non cancellare o spostare file senza motivazione e senza aver prima verificato dipendenze e riferimenti.

## OUTPUT DELLA FASE 0

Crea o aggiorna esclusivamente questi documenti:

1. docs/PROJECT_AUDIT.md
2. docs/CURRENT_ARCHITECTURE.md
3. docs/LEGAL_PRIVACY_BOUNDARIES.md
4. docs/SECURITY_THREAT_MODEL.md
5. docs/ROADMAP.md
6. docs/OPEN_QUESTIONS.md
7. docs/DATA_CLASSIFICATION.md

PROJECT_AUDIT.md deve contenere una tabella con:

- area;
- stato: OK, PARZIALE, MANCANTE, RISCHIO;
- implementazione attuale;
- problema;
- impatto;
- intervento consigliato;
- priorità;
- file coinvolti;
- verifica effettuata.

LEGAL_PRIVACY_BOUNDARIES.md deve chiarire almeno che:

- l’app non certifica il superamento di limiti acustici;
- le registrazioni non vanno diffuse;
- la documentazione deve essere condivisa solo in modo selettivo;
- l’utente deve poter oscurare dati non pertinenti;
- i valori rilevati da dispositivi consumer sono indicativi;
- la classificazione giuridica resta di competenza di professionisti e autorità;
- il progetto nasce per uso personale e privato;
- una futura commercializzazione richiederà una nuova analisi legale, privacy, sicurezza e organizzativa.

## DATA CLASSIFICATION

Definisci almeno queste classi:

- PUBLIC: documentazione generica del progetto;
- INTERNAL: configurazioni non sensibili;
- CONFIDENTIAL: eventi, indirizzi, stanze e contatti;
- HIGHLY_CONFIDENTIAL: audio, video, immagini, documenti, dati sanitari, dati giudiziari, identificativi e comunicazioni con autorità o legali.

Nessun dato CONFIDENTIAL o HIGHLY_CONFIDENTIAL deve essere committato.

## PERSISTENZA E PRIVACY

In questa fase privilegia un’architettura local-first.

Valuta l’implementazione esistente prima di scegliere la soluzione.

Requisiti minimi:

- nessun backend pubblico necessario per il prototipo;
- nessun caricamento automatico verso servizi cloud;
- database locale strutturato;
- allegati separati dai metadati;
- possibilità di backup cifrato;
- possibilità di ripristino verificato;
- blocco automatico dell’app dopo inattività;
- autenticazione locale o altra protezione proporzionata;
- nessun dato sensibile in localStorage se evitabile;
- nessun segreto hardcoded nel frontend;
- Content Security Policy compatibile con lo stack;
- protezione da XSS;
- validazione dei file caricati;
- limiti di dimensione;
- blocco dei formati pericolosi;
- nomi file normalizzati;
- cancellazione esplicita e confermata;
- registrazione degli accessi se tecnicamente sensata;
- modalità privacy per nascondere indirizzi e nomi durante demo o screenshot.

Se il progetto è una web app frontend-only, considera IndexedDB per i dati strutturati e una strategia sicura per gli allegati, ma non introdurre una tecnologia solo per moda.

## MODELLO DATI MINIMO

Progetta un’entità NoiseEvent con almeno:

- id UUID;
- occurredAtStart;
- occurredAtEnd opzionale;
- timezone;
- recordedAt;
- lastModifiedAt;
- status: draft, confirmed, corrected, archived;
- roomId;
- perceptionPoint opzionale;
- observableDescription;
- subjectiveImpact opzionale;
- sourceHypothesis opzionale;
- hypothesisConfidence: unknown, low, medium, high;
- sourceDirection: unknown o valore non accusatorio;
- noiseCharacteristics;
- continuity: continuous, intermittent, impulsive, unknown;
- perceivedIntensity: very_low, low, medium, high, very_high;
- deviceReading opzionale;
- deviceReadingDisclaimer obbligatorio;
- witnesses opzionali;
- attachments;
- tags;
- relatedContacts;
- relatedCommunications;
- correctionHistory;
- integrityMetadata;
- privacyClassification;
- freeNotes.

Evita campi denominati “colpevole”, “responsabile certo”, “reato”, “violazione accertata” o equivalenti.

## INTEGRITÀ DOCUMENTALE

Implementa progressivamente:

- identificativo univoco;
- timestamp di creazione;
- timestamp delle modifiche;
- history append-only per le correzioni importanti;
- motivo della correzione;
- hash SHA-256 degli allegati;
- hash del manifest di esportazione;
- versione dello schema dati;
- versione dell’app che ha creato l’evento;
- indicazione dell’orario del dispositivo;
- avviso se l’orologio locale cambia in modo anomalo.

Non usare blockchain.

Non definire l’hash come “firma digitale” o come prova di autenticità.

L’hash serve a rilevare modifiche successive, non a dimostrare da solo chi abbia creato il file o quando sia stato creato.

## FUNZIONALITÀ MVP

Ordine consigliato:

1. inserimento rapido di un evento in meno di 30 secondi;
2. salvataggio come bozza;
3. conferma successiva;
4. elenco cronologico;
5. filtri per data, ora, stanza, durata, tipo e intensità percepita;
6. dettaglio evento;
7. allegati audio, immagini e documenti;
8. correzioni versionate;
9. calendario e riepilogo;
10. timeline giornaliera;
11. gestione stanze;
12. report selettivo;
13. esportazione JSON, CSV e pacchetto ZIP;
14. stampa o PDF solo se già supportata in modo affidabile;
15. backup e ripristino;
16. modalità demo con dati sintetici.

## MAPPA DELL’APPARTAMENTO

Non partire da un GIS complesso.

Prevedi prima un modello semplice:

- Apartment;
- Floor;
- Room;
- RoomGeometry;
- ObservationPoint;
- WallSide;
- Connection tra stanze.

La prima versione può utilizzare una planimetria SVG o un’immagine caricata localmente con punti selezionabili.

Non memorizzare coordinate geografiche precise se non sono realmente necessarie.

Non caricare planimetrie reali nel repository.

## AUTENTICAZIONE E ACCESSO ESTERNO

In questa fase:

- l’app è privata;
- esiste un solo proprietario;
- non creare ancora account per forze dell’ordine, Comune, ARPA, tecnici o avvocati;
- implementa invece esportazioni selettive;
- ogni export deve essere separato dai dati originali;
- ogni export deve indicare data, filtri applicati, eventi inclusi, eventi esclusi, hash dei file e disclaimer;
- deve essere possibile creare una copia oscurata;
- non inviare automaticamente email o PEC.

Prepara soltanto un’architettura futura per ruoli:

- OWNER;
- TRUSTED_REVIEWER;
- PROFESSIONAL;
- AUTHORITY_READ_ONLY.

Non attivare tali ruoli finché non esiste un backend sicuro e una revisione legale specifica.

## GIT E BRANCHING

Prima di lavorare:

1. esegui git status;
2. identifica branch corrente;
3. non sovrascrivere modifiche non committate;
4. non usare force push;
5. non modificare main direttamente per funzionalità non banali;
6. crea branch piccoli e coerenti.

Naming:

- audit/repository-assessment
- docs/legal-privacy-boundaries
- feat/noise-event-domain
- feat/quick-event-entry
- feat/secure-attachments
- feat/selective-export
- feat/apartment-map
- fix/<descrizione>
- chore/<descrizione>

Ogni branch deve affrontare una sola attività principale.

Prima del merge:

- format;
- lint;
- typecheck;
- unit test;
- integration test;
- end-to-end test, se configurato;
- production build;
- controllo dipendenze;
- controllo segreti;
- revisione della diff;
- aggiornamento documentazione.

Non committare se uno dei controlli obbligatori fallisce.

Non disabilitare test o regole lint solo per ottenere una pipeline verde.

## COMMIT

Usa Conventional Commits:

- docs(audit): document current repository status
- docs(privacy): define private-use data boundaries
- feat(events): introduce noise event domain model
- feat(events): add rapid event capture
- feat(exports): add redacted evidence package
- test(events): cover event correction history
- fix(storage): prevent attachment metadata loss

Ogni commit deve essere:

- piccolo;
- atomico;
- compilabile;
- testato;
- privo di dati reali;
- privo di segreti;
- accompagnato dalla documentazione necessaria.

Non eseguire push o merge se non sei autorizzato dall’ambiente.

Se puoi modificare i file ma non puoi eseguire realmente push o merge, prepara i comandi e dichiaralo esplicitamente senza fingere di averli eseguiti.

## CI

Se la repository usa GitHub, valuta una GitHub Actions pipeline con:

- installazione deterministica tramite lockfile;
- lint;
- typecheck;
- unit test;
- integration test;
- build;
- secret scanning;
- dependency review;
- CodeQL, se compatibile;
- upload limitato degli artifact di build;
- nessun caricamento di database, registrazioni o dati utente;
- permessi workflow impostati al minimo;
- action bloccate a versioni affidabili;
- nessun secret disponibile alle pull request non attendibili.

## TEST OBBLIGATORI

Copri almeno:

- creazione evento;
- salvataggio bozza;
- conferma;
- modifica con history;
- allegato con hash;
- eliminazione;
- filtri temporali;
- cambio timezone;
- ora legale;
- export selettivo;
- redazione;
- backup;
- restore;
- migrazione schema;
- file non valido;
- file troppo grande;
- persistenza dopo refresh;
- protezione route;
- blocco sessione;
- assenza di dati reali nei test.

## ACCESSIBILITÀ E USABILITÀ

L’inserimento rapido deve essere utilizzabile:

- da smartphone;
- di notte;
- con una mano;
- senza compilare testi lunghi;
- senza includere interpretazioni suggerite;
- con contrasto adeguato;
- con navigazione da tastiera;
- con etichette accessibili;
- senza notifiche sonore predefinite;
- senza pattern manipolativi.

L’interfaccia deve usare formulazioni neutrali.

Preferire:

“Da quale direzione sembrava provenire?”

Evitare:

“Quale vicino ha provocato il rumore?”

## PRIMO CICLO DI LAVORO

Esegui soltanto la Fase 0.

Non iniziare ancora nuove funzionalità.

Al termine mostra:

1. stack rilevato;
2. stato reale dell’applicazione;
3. funzionalità complete;
4. funzionalità parziali;
5. funzionalità simulate o non affidabili;
6. problemi di privacy;
7. problemi di sicurezza;
8. rischi per i dati;
9. qualità dei test;
10. stato Git;
11. proposta del primo branch implementativo;
12. file che verrebbero modificati;
13. criteri di accettazione;
14. test da eseguire;
15. dubbi che richiedono una decisione.

FERMATI DOPO LA FASE 0.

Non implementare la fase successiva finché l’audit non è stato letto e approvato.

Se scopri dati personali reali, segreti, registrazioni o file sensibili tracciati da Git, fermati, non mostrarne il contenuto e indica solo percorso, categoria del rischio e intervento necessario.
