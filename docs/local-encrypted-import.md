# Diario locale: cifratura e importazione

## Modello di privacy

GitHub Pages pubblica il codice della PWA, non il diario personale. Non aggiungere PDF, JSON, registrazioni o episodi reali al repository, a `public/` o a un workflow: l'app non dispone di autenticazione online né di un backend.

Al primo avvio crea una password locale di almeno 12 caratteri. Il browser deriva una chiave AES-256-GCM tramite PBKDF2-SHA-256 (310.000 iterazioni e sale casuale). Episodi e registrazioni sono cifrati prima di essere scritti in IndexedDB; la chiave resta in memoria fino al blocco o alla chiusura della pagina. I dati legacy in IndexedDB e `localStorage` vengono migrati dopo lo sblocco.

La password non può essere recuperata. Se la dimentichi, l'app non può decifrare i dati: conserva la password in un gestore sicuro e crea periodicamente un'esportazione privata. L'esportazione JSON è in chiaro e non contiene le registrazioni audio. La cifratura protegge i dati salvati a riposo, ma non da codice malevolo eseguito nella pagina mentre il diario è sbloccato.

## Importazione JSON

1. Prepara un JSON con un array `events`, ad esempio un'esportazione di Diario Rumore.
2. Apri la PWA e sblocca il diario con la password locale.
3. Scegli **Importa storico JSON** e seleziona il file. Il limite è 5 MB.
4. Verifica gli episodi importati nell'elenco; gli ID già presenti vengono ignorati.

Il file è letto localmente dal browser; non viene caricato su GitHub Pages o su un server. Un file non valido o con ID duplicati viene rifiutato senza modificare il diario.

Importa solo gli orari o gli intervalli datati presenti nella fonte. Lascia non indicati intensità, durata, stanza e contesto quando non sono documentati; non trasformare righe mensili prive di data/ora precisa in episodi datati.
