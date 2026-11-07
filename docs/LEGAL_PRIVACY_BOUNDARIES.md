# Confini legali e privacy

## Scopo e limiti

Diario Rumore è, nella fase corrente, uno strumento personale per organizzare annotazioni prodotte dall’utente. Il diario non è una certificazione tecnica, un verbale pubblico, una perizia o una prova incontestabile. L’accuratezza, la completezza, la datazione e la provenienza dipendono dall’utente e dal dispositivo.

- L’app non certifica il superamento di limiti acustici e non determina conformità o violazioni.
- Valori o grafici da smartphone e microfoni consumer, se introdotti, devono essere indicati come valori indicativi non calibrati, mai come misurazioni fonometriche certificate.
- L’app non attribuisce automaticamente rumori a persone, unità immobiliari o impianti e non genera accuse.
- La classificazione giuridica, l’interpretazione normativa e la valutazione tecnica restano di competenza di professionisti e autorità competenti.
- L’app non sostituisce un avvocato, un tecnico competente in acustica, un medico, un amministratore, un’autorità o un servizio di emergenza.
- L’app nasce per uso personale e privato del proprietario dell’abitazione. Una commercializzazione o un servizio per terzi richiede una nuova analisi legale, privacy, sicurezza, organizzativa e di responsabilità.

## Registrazioni, allegati e condivisione

- Non registrare continuamente l’ambiente. La registrazione audio deve essere avviata dall’utente in modo esplicito e fermata quando non necessaria.
- Una registrazione può acquisire conversazioni, voci, immagini, luoghi o informazioni di terzi. Prima di registrare, conservare o condividere, l’utente deve valutare necessità, proporzionalità, contesto e regole applicabili; l’app non stabilisce se la registrazione sia lecita.
- Le registrazioni non vanno diffuse o pubblicate. Ogni condivisione deve essere selettiva, motivata e limitata al destinatario e allo scopo pertinenti.
- L’utente deve poter rimuovere o oscurare nomi, indirizzi, recapiti, targhe, volti, voci identificabili, metadati e dettagli non pertinenti prima dell’export.
- L’app non invia automaticamente email, PEC, audio o documenti ad amministratori, legali, tecnici, forze dell’ordine, Comune, ARPA o altri destinatari.
- Un export JSON attuale è in chiaro e include l’intero insieme degli eventi caricati. Non va condiviso senza revisione manuale; non include gli audio.

## Dati e conservazione

- Preferire minimizzazione e local-first; nessun backend pubblico è necessario per il prototipo e l’app non deve caricare dati automaticamente su servizi cloud.
- Episodi e audio sono cifrati localmente prima della persistenza in IndexedDB. Una chiave di recupero locale consente di impostare una nuova password; chi la possiede può accedere ai dati. L’export JSON è una copia separata non cifrata.
- La cancellazione completa/verificata non è implementata. Eliminazione dal browser, disinstallazione o rimozione di un singolo file non garantiscono la cancellazione di copie, backup, sincronizzazioni del profilo o cronologia Git.
- Definire retention, backup cifrato, ripristino, cancellazione e gestione delle copie prima di trattare dati reali su più dispositivi.
- Non inserire dati reali nei test, nelle fixture, negli screenshot, nel repository, nelle issue o nella documentazione. Le fixture devono essere sintetiche.

## Riferimenti da verificare

I seguenti riferimenti sono stati indicati come possibili ambiti di verifica, ma questo audit non ne attesta vigenza, applicabilità al caso concreto, interpretazione o competenza territoriale. Non devono essere usati dall’interfaccia per formulare conclusioni automatiche:

- Art. 844 Codice civile; art. 659 Codice penale.
- Legge 26 ottobre 1995 n. 447; DPCM 14 novembre 1997; DM 16 marzo 1998.
- Legge Regionale Lombardia 10 agosto 2001 n. 13.
- Disposizioni e procedure vigenti del Comune di Milano e Regolamento di Polizia Urbana del Comune di Milano.
- Regolamento UE 2016/679 e D.Lgs. 196/2003 come modificato.

Per pubblicare indicazioni locali servono fonti istituzionali aggiornate, ambito territoriale, URL diretto, data di verifica, stato editoriale e revisione qualificata. Il registro attuale non contiene fonti normative verificate e la guida pilota è globale, in italiano e `draft`. Ogni dubbio normativo resta in [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md), senza inventare soglie, sanzioni, sentenze, termini o interpretazioni.

## Privacy by design

Applicare necessità, proporzionalità, minimizzazione, limitazione della conservazione, integrità e riservatezza come criteri progettuali, senza presentare questo documento come parere legale o attestazione di conformità GDPR. Non introdurre account per revisori, professionisti o autorità in questa fase. Ruoli futuri `OWNER`, `TRUSTED_REVIEWER`, `PROFESSIONAL`, `AUTHORITY_READ_ONLY` restano solo concettuali e richiedono backend sicuro e revisione specifica.
