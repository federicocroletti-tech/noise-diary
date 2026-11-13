# Guida all’uso di Diario Rumore

Diario Rumore serve ad annotare ciò che hai percepito, aggiungere il contesto e ritrovare gli episodi nel tempo. L’intensità è una valutazione soggettiva: l’app non è un fonometro e non accerta la sorgente o le responsabilità di un rumore.

Nell’app trovi le stesse istruzioni dal collegamento **Guida all’uso** nell’intestazione, anche prima dell’accesso. La pagina usa l’indirizzo `#/guida`, compatibile con la pubblicazione su GitHub Pages. **Torna all’app** riapre il lavoro senza cancellare il modulo in compilazione; un ricaricamento o la chiusura della pagina, invece, può far perdere dati non salvati.

## Indice

- [Primi passi](#primi-passi)
- [Account o diario locale](#account-o-diario-locale)
- [Annotare un episodio](#annotare-un-episodio)
- [Cercare, correggere o eliminare](#cercare-correggere-o-eliminare)
- [Registrare e riascoltare audio](#registrare-e-riascoltare-audio)
- [Backup e importazione](#backup-e-importazione)
- [Password e recupero](#password-e-recupero)
- [Privacy, installazione e limiti](#privacy-installazione-e-limiti)
- [Risolvere i problemi comuni](#risolvere-i-problemi-comuni)

## Primi passi

1. Scegli se usare un account online o un diario locale in questo browser.
2. Apri **Nuovo episodio** e controlla data e ora di inizio.
3. Compila luogo, percezione e contesto, poi premi **Salva evento**.
4. Seleziona l’episodio nel diario per rivederlo o aggiungere una registrazione audio.
5. Dal menu **Backup**, esporta una copia cifrata e conservala privatamente.

I dati non compilati non vanno inventati. Se non conosci la sorgente, lascia il campo vuoto; distingui sempre osservazioni dirette e ipotesi.

## Account o diario locale

### Account online

Sceglilo per ritrovare episodi e audio su più dispositivi accedendo allo stesso account.

1. Premi **Crea account** e inserisci email e password di almeno 12 caratteri.
2. Conferma la password e verifica l’email con il codice ricevuto.
3. Accedi con email e password. Per sincronizzare serve una connessione.

Eventi e audio sono trasferiti ai servizi cloud dell’account. L’accesso è riservato all’account, ma i dati non sono cifrati end-to-end dall’app. Usa **Account → Esci** sui dispositivi condivisi.

### Diario locale

Sceglilo per conservare i dati cifrati solo in questo browser, senza sincronizzazione.

1. Dalla schermata di accesso scegli **Apri diario salvato in questo browser**.
2. Crea un profilo con un nome riconoscibile oppure scegli un profilo esistente.
3. Al primo utilizzo imposta una password di almeno 12 caratteri.
4. Conserva la chiave di recupero separatamente e conferma di averla salvata.

I profili locali sono archivi distinti, non account. Usa **Profilo → Blocca** quando ti allontani. Cambiare browser o cancellarne i dati non trasferisce il diario: esporta prima un backup ed evita la navigazione privata per conservarlo nel tempo.

Un diario locale non viene importato automaticamente nell’account. Per trasferirlo, sblocca il profilo locale, esporta un backup cifrato, accedi all’account e importalo. Verifica il risultato prima di eliminare l’originale.

## Annotare un episodio

Il modulo è organizzato in quattro gruppi. I campi obbligatori sono segnati con un asterisco.

- **Quando:** data e ora di inizio sono obbligatorie. La durata è facoltativa, espressa in minuti e deve essere maggiore di zero.
- **Dove:** indica il luogo in cui hai percepito il rumore e, se utile, la stanza. Non è necessario inserire un indirizzo preciso.
- **Cosa hai percepito:** scegli tipologia, intensità da 1 a 5, andamento, effetto e stato dell’episodio. L’intensità non rappresenta decibel.
- **Contesto:** aggiungi un’eventuale sorgente sospetta, condizione di finestra e porta, descrizione, note e tag separati da virgole. La sorgente è salvata come ipotesi, non come fatto accertato.

Esempio di descrizione:

> Ronzio intermittente percepito dalla camera per circa dieci minuti; finestra chiusa. Sorgente non identificata.

Premi **Salva evento** anche se scegli lo stato **Bozza**. Il modulo non viene salvato automaticamente. Controlla che l’episodio compaia nel diario e verifica eventuali messaggi di errore prima di chiudere la pagina.

## Cercare, correggere o eliminare

La ricerca trova testi in luogo, stanza, descrizione, note, sorgente sospetta e tag. Puoi ordinare per episodi più recenti, intensità o stanza. Se non trovi un episodio, svuota la ricerca e verifica di essere nell’account o profilo corretto.

Seleziona un episodio per aprire il dettaglio. Con **Modifica episodio** puoi correggere i dati; indica il **Motivo della modifica** e premi **Salva correzione**. La cronologia conserva motivo e versione precedente. **Annulla modifica** non applica la correzione.

**Elimina episodio** rimuove l’episodio e i relativi audio dopo conferma: dal cloud nell’account online, dal profilo attivo nella modalità locale. Non c’è un cestino di recupero; le copie già esportate non vengono eliminate.

## Registrare e riascoltare audio

1. Salva e seleziona un episodio; nel dettaglio apri la sezione **Registrazioni audio**.
2. Scegli **Evento** oppure **Rumore di fondo**.
3. Premi **Avvia registrazione** e autorizza il microfono nel browser.
4. Se il browser lo supporta, usa **Pausa** e **Riprendi**.
5. Premi **Ferma e salva** e verifica che la registrazione compaia nell’elenco.

Il limite per registrazione è di **5 minuti o 50 MB**. Ferma e salva prima di cambiare episodio, aprire la guida o uscire. Per registrare servono un browser compatibile, un microfono e una pagina HTTPS (oppure localhost durante lo sviluppo).

Puoi riascoltare l’audio, usare **Scarica copia** o eliminarlo. Nell’account l’audio è caricato nel cloud; nel diario locale resta cifrato nel browser. Evita conversazioni e persone non necessarie. Le registrazioni non sono misurazioni fonometriche professionali; l’analisi delle frequenze non è attualmente disponibile.

## Backup e importazione

### Salva una copia cifrata

Scegli **Backup → Esporta backup cifrato**. Il file `.ndbackup` include episodi e registrazioni audio.

- Nell’account scegli e conferma una passphrase dedicata di almeno 12 caratteri, diversa come funzione dalla password di login.
- Nella modalità locale viene richiesta la password del profilo.

Conserva file e password separatamente: il backup non si aggiorna automaticamente.

### Importa senza cancellare il diario

Scegli **Backup → Importa file (aggiungi)** e seleziona un `.ndbackup` oppure un `.json`, fino a **120 MiB**. Per il backup cifrato inserisci la password usata all’esportazione.

Gli episodi identici con lo stesso ID vengono saltati; per versioni diverse scegli quale mantenere e conferma l’importazione.

### Prepara un JSON a mano

1. Scarica il [modello JSON compilabile](../public/modello-importazione-diario.json) e sostituisci i dati fittizi con i tuoi.
2. Conserva tutti i campi del modello. Per più episodi duplica l’oggetto nell’elenco `events`, separa gli oggetti con virgole e assegna ID distinti.
3. Usa date con fuso, per esempio `2026-11-12T22:30:00+01:00` (`+02:00` per l’ora legale italiana, `Z` per UTC). L’intensità è un intero da 1 a 5 oppure `null`. La sorgente sospetta deve contenere la parola **ipotesi**.
4. Salva come testo UTF-8 `.json`, non `.json.txt`, con virgolette doppie, senza commenti né virgole finali. Lascia `attachmentIds` a `[]`: questo formato non importa audio.
5. Importa il file e conferma l’avviso sul JSON in chiaro. Nel diario trovi anche **Come importare i dati: formati e modello da compilare**, con tutti i codici ammessi e i campi facoltativi.

CSV, Excel, Word e PDF non sono accettati. ID duplicati nello stesso file o campi non validi fanno rifiutare il JSON. Il file compilato è in chiaro: conservalo privatamente.

### Ripristino: attenzione alla sostituzione

**Ripristina backup** non è un’aggiunta: sostituisce tutti gli episodi e gli audio del diario aperto dopo conferma. Un JSON senza audio elimina gli audio già presenti. Esporta prima un backup cifrato e verifica l’importazione prima di cancellare gli originali.

Nel cloud un errore di rete o storage può lasciare un’importazione parziale: controlla episodi e audio dopo il trasferimento. Per i dettagli tecnici e le precauzioni aggiuntive, consulta [cifratura e importazione locale](./local-encrypted-import.md).

## Password e recupero

- **Account:** dalla schermata di accesso scegli **Password dimenticata?**, richiedi il codice via email e imposta una nuova password. È il recupero del login, non dei backup esportati.
- **Profilo locale:** scegli **Password dimenticata? Usa la chiave di recupero**. Inserisci la chiave di quel profilo, imposta la nuova password e conserva la nuova chiave generata. Senza password e senza chiave il diario locale non è recuperabile.
- **Backup:** serve sempre la password usata per esportare quella copia. Il reset dell’account o del profilo non cambia la password dei backup precedenti e non li rende recuperabili senza di essa.

## Privacy, installazione e limiti

Se il browser lo consente, puoi installare la PWA dal suo menu **Installa app** o **Aggiungi alla schermata Home**. L’installazione non crea un backup e non trasforma il profilo locale in un account.

Dal menu Account o Profilo puoi eliminare l’intero diario con conferma esplicita. Questa operazione elimina gli episodi e gli audio dell’archivio selezionato, non i file scaricati, i backup esportati o gli altri profili locali.

- Non pubblicare episodi reali, registrazioni, chiavi o password nel repository.
- Raccogli solo dati necessari e separa fatti osservati, ipotesi e valutazioni professionali.
- L’app non genera PDF, lettere, fascicoli o allegati immagine.
- Non accerta responsabilità o conformità a limiti e non sostituisce consulenze legali, tecniche o sanitarie.

Per approfondire, leggi [Privacy](../PRIVACY.md) e [Disclaimer](../DISCLAIMER.md).

## Risolvere i problemi comuni

### Non vedo i miei episodi

Controlla account o profilo attivo, browser e ricerca. Un diario locale non compare automaticamente su un altro dispositivo o nell’account online.

### Il microfono non parte

Controlla i permessi del sito, la disponibilità del microfono e il messaggio di errore. Usa un browser aggiornato su HTTPS.

### Il file non viene importato

Verifica estensione, limite di 120 MiB e password del backup. Per un JSON ricontrolla sintassi, campi, codici e ID univoci usando il modello.

### Salvataggio o sincronizzazione non riusciti

Leggi il messaggio nell’app. Per l’account verifica la connessione; per il diario locale controlla che il browser consenta l’archiviazione. Non cancellare i dati del browser o gli originali nel tentativo di risolvere il problema: conserva prima un backup se possibile.

---

[Torna al README](../README.md)
