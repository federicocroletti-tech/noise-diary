# Diario locale: cifratura e backup

## Modello di privacy

GitHub Pages pubblica il codice della PWA, non il diario personale. Non aggiungere backup, registrazioni o episodi reali al repository, a `public/` o a un workflow: l'app non dispone di autenticazione online, Keycloak o backend.

Al primo avvio crea una password locale di almeno 12 caratteri. L'app genera anche una chiave di recupero casuale: conservala separatamente dalla password e dal dispositivo. Una chiave dati casuale AES-256 è cifrata con chiavi derivate tramite PBKDF2-SHA-256 (310.000 iterazioni e sale casuale) dalla password e dalla chiave di recupero. Episodi e registrazioni sono cifrati prima di essere scritti in IndexedDB; la chiave dati resta in memoria fino al blocco o alla chiusura della pagina.

Se dimentichi la password, dalla schermata di accesso scegli **Password dimenticata? Usa la chiave di recupero** e inserisci la chiave per impostare una nuova password. Il recupero genera una nuova chiave di recupero; salvala e conferma di averla conservata prima che la modifica diventi attiva. La chiave non viene salvata dall'app: chiunque la possieda può accedere ai dati e cambiarne la password. Senza la password e la chiave di recupero non è possibile decifrare il diario. Per i vault creati con una versione precedente, accedi prima con la password attuale per migrare; l'app mostra la nuova chiave da conservare. Non esiste un account amministrativo o un reset remoto. Il backup `.ndbackup` contiene episodi e registrazioni audio cifrati separatamente con AES-GCM e PBKDF2. Durante l'importazione, la password inserita per l'esportazione viene richiesta per decifrare e validare il file; i dati vengono poi cifrati con la chiave locale del browser di destinazione. Conserva separatamente file e password del backup. La cifratura protegge i dati salvati a riposo, ma non da codice malevolo eseguito nella pagina mentre il diario è sbloccato.

## Creare e importare un backup

1. Sblocca il diario con la password locale.
2. Scegli **Esporta backup cifrato**. Il file `.ndbackup` include gli episodi e le registrazioni audio e non rivela i relativi contenuti senza la password.
3. Conserva il file in un luogo privato e sicuro. La copia non si aggiorna automaticamente.
4. Sul browser di destinazione, crea o sblocca il diario locale. Scegli **Importa backup (aggiungi)**, seleziona il file e inserisci la password usata per esportarlo.
5. L'importazione aggiuntiva conserva i dati già presenti. Gli episodi con lo stesso ID richiedono una scelta esplicita; le registrazioni già presenti non vengono sovrascritte né eliminate.
6. Scegli **Ripristina backup** solo se vuoi sostituire tutti gli episodi e le registrazioni locali: l'app chiede conferma prima di procedere.

Il limite attuale del file è 120 MiB. Il file viene letto, decifrato, validato e re-cifrato localmente; non viene caricato su GitHub Pages o su un server. Un file cifrato con password errata, contenuto non valido o audio che non supera il controllo SHA-256 viene rifiutato senza applicare l'importazione.

I vecchi file JSON in chiaro possono ancora essere importati per compatibilità; l'app mostra un avviso esplicito prima di accettarli. Non contengono le registrazioni audio e vanno trattati come dati sensibili. I nuovi backup sono sempre cifrati.

La password locale non è un account e non c'è un pannello Keycloak. La chiave di recupero consente il reset locale della password, ma non sostituisce la password usata per esportare ciascun backup; dopo un reset, quella dei backup precedenti può essere diversa dalla password corrente. Senza la password usata per l'esportazione non è possibile recuperare il backup. Il lock manuale svuota i dati decifrati dalla vista, ma la cifratura non protegge da codice malevolo in esecuzione mentre il diario è sbloccato.
