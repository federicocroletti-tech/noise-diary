# Diario locale: cifratura e backup

## Modello di privacy

GitHub Pages pubblica il codice della PWA, non il diario personale. Non aggiungere backup, registrazioni o episodi reali al repository, a `public/` o a un workflow. L'app distingue account online Neon e diario locale: questa guida descrive la cifratura locale e i backup portabili di entrambe le modalita'. I profili locali sono etichette del browser, non account o identità verificate e non sincronizzano dati tra dispositivi.

Ogni profilo ha una propria password locale di almeno 12 caratteri e una propria chiave di recupero casuale. Il nome e l'ID del profilo sono metadati in `localStorage`; la configurazione vault è salvata in `noise-diary.vault.<profileId>` e gli eventi/audio in un database IndexedDB `noise-diary.<profileId>`. Il profilo storico mantiene le chiavi originali `noise-diary.vault`, `noise-diary.events` e il database `noise-diary`, senza spostare o sovrascrivere i dati esistenti. Le password e le chiavi di recupero non sono salvate in chiaro: la chiave dati AES-256 casuale è avvolta con chiavi derivate tramite PBKDF2-SHA-256 (310.000 iterazioni e sale casuale). Episodi e registrazioni sono cifrati prima di essere scritti in IndexedDB; la chiave dati resta in memoria fino al blocco o alla chiusura della pagina.

Se dimentichi la password di un profilo, dalla schermata di accesso scegli **Password dimenticata? Usa la chiave di recupero** e inserisci la chiave di quel profilo per impostare una nuova password. Il recupero genera una nuova chiave di recupero; salvala e conferma di averla conservata prima che la modifica diventi attiva. La chiave non viene salvata dall'app: chiunque la possieda può accedere ai dati e cambiarne la password. Senza la password e la chiave di recupero non è possibile decifrare il diario. Per il diario storico creato con una versione precedente, accedi con la password attuale per migrare; l'app mostra la nuova chiave da conservare. Non esiste un account amministrativo o un reset remoto. Il backup `.ndbackup` contiene episodi e registrazioni audio cifrati separatamente con AES-GCM e PBKDF2. Durante l'importazione, la password inserita per l'esportazione viene richiesta per decifrare e validare il file; i dati vengono poi cifrati con la chiave del profilo locale di destinazione. Conserva separatamente file e password del backup. La cifratura protegge i dati salvati a riposo, ma non da codice malevolo eseguito nella pagina mentre il diario è sbloccato.

Per trasferire esplicitamente il diario storico a un altro profilo, sblocca il profilo **Diario esistente**, esporta un backup cifrato, torna alla selezione dei profili e importa il backup nel profilo destinatario. L'originale resta intatto. Senza sbloccarlo o senza un backup valido, l'app non può trasferirne i dati.

## Creare e importare un backup

1. Sblocca il diario con la password locale.
2. Scegli **Esporta backup cifrato**. Il file `.ndbackup` include gli episodi e le registrazioni audio e non rivela i relativi contenuti senza la password.
3. Conserva il file in un luogo privato e sicuro. La copia non si aggiorna automaticamente.
4. Sul browser di destinazione, crea o sblocca il diario locale. Scegli **Backup → Importa file (aggiungi)**, seleziona il file e inserisci la password usata per esportarlo.
5. L'importazione aggiuntiva conserva i dati già presenti. Gli episodi con lo stesso ID richiedono una scelta esplicita; le registrazioni già presenti non vengono sovrascritte né eliminate.
6. Scegli **Ripristina backup** solo se vuoi sostituire tutti gli episodi e le registrazioni locali: l'app chiede conferma prima di procedere.

Il limite attuale del file è 120 MiB. Nel diario locale il file viene letto, decifrato, validato e re-cifrato localmente; non viene caricato su GitHub Pages o su un server. Un file cifrato con password errata, contenuto non valido o audio che non supera il controllo SHA-256 viene rifiutato prima di applicare l'importazione.

## Importare episodi preparati a mano

Nel diario aperto, espandi **Come importare i dati: formati e modello da compilare** e scarica il modello JSON. Lo stesso [modello con dati fittizi](../public/modello-importazione-diario.json) è disponibile nel repository.

1. Apri il file con un editor di testo, sostituisci i dati di esempio e conserva tutti i campi presenti.
2. Per aggiungere episodi, duplica l'oggetto nell'elenco `events`, separa gli oggetti con una virgola e usa ID distinti.
3. Usa date ISO con fuso orario, come `2026-11-12T22:30:00+01:00` (ora solare italiana), `+02:00` per l'ora legale o `Z` per UTC. L'intensità è un intero da 1 a 5 oppure `null`. La sorgente sospetta deve contenere la parola `ipotesi`.
4. I codici ammessi per tipologia, andamento, stato ed effetti sono elencati nella guida nell'app: rispettane maiuscole e minuscole. I testi non compilati possono essere `""`; gli elenchi vuoti sono `[]`. Lascia `attachmentIds` vuoto: il modello non include audio.
5. Salva il file come testo UTF-8 `.json`, non `.json.txt`. Non aggiungere commenti o virgole finali. CSV, Excel, Word e PDF non sono supportati.
6. Scegli **Backup → Importa file (aggiungi)**, seleziona il JSON e conferma l'avviso sul file in chiaro. Verifica gli episodi importati.

L'importazione accetta sia `{"events": [...]}` sia un elenco `[...]` non vuoto. ID duplicati nello stesso file o un episodio non valido fanno rifiutare il JSON. Con l'aggiunta, episodi identici già presenti sono saltati e versioni diverse dello stesso ID richiedono una scelta. **Ripristina backup** sostituisce invece episodi e audio del diario aperto: un JSON senza audio elimina gli audio esistenti dopo conferma. Esporta prima un backup cifrato.

Il JSON compilato contiene dati in chiaro: non pubblicarlo e conservalo privatamente. Nell'account online, l'importazione trasferisce i dati ai servizi cloud dell'account attivo; nella modalità locale restano nel browser.

## Backup dell'account online

Nell'account, **Esporta backup cifrato** richiede una passphrase dedicata di almeno 12 caratteri e la sua conferma. Non e' la password di login e non richiede un vault locale: il file viene cifrato nel browser con AES-GCM e PBKDF2, mantenendo il formato `.ndbackup` versione 1. L'operazione non crea un profilo locale e non cambia password o chiavi locali esistenti. Annullamento, passphrase troppo corta o conferma diversa fermano l'export prima del caricamento degli audio per il backup.

Conserva passphrase e file separatamente. La passphrase non viene salvata dall'app e il recupero dell'account online non permette di recuperare un backup di cui hai perso la passphrase. Un profilo di destinazione puo' avere una password diversa: per importare il file serve quella scelta all'esportazione; dopo la validazione, i dati locali vengono cifrati con la chiave del profilo destinatario.

Se importi nell'account online, il file viene decifrato e validato nel browser, poi eventi e audio vengono trasferiti ai servizi cloud dell'account attivo. Il cloud non e' cifrato end-to-end dall'app. Le operazioni DB/storage non sono ancora atomiche: un errore di rete o storage puo' lasciare un'importazione parziale, che va verificata. Non eliminare l'originale o il backup finche' il trasferimento non e' confermato.

Logout, blocco e cambio archivio invalidano i caricamenti precedenti: una risposta audio/evento o un export completati in ritardo non ripopolano il nuovo diario e non avviano un download nella nuova sessione. Questo non annulla automaticamente scritture backend gia' iniziate o file scaricati in precedenza.

I vecchi file JSON in chiaro possono ancora essere importati per compatibilità; l'app mostra un avviso esplicito prima di accettarli. Non contengono le registrazioni audio e vanno trattati come dati sensibili. I nuovi backup sono sempre cifrati.

La password locale non è un account e non c'è un pannello Keycloak. La chiave di recupero consente il reset locale della password, ma non sostituisce la password usata per esportare ciascun backup; dopo un reset, quella dei backup precedenti può essere diversa dalla password corrente. Senza la password usata per l'esportazione non è possibile recuperare il backup. Il lock manuale svuota i dati decifrati dalla vista, ma la cifratura non protegge da codice malevolo in esecuzione mentre il diario è sbloccato.
