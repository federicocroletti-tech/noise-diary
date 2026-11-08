# Privacy

## Applicazione

L'app è statica e non richiede account online né usa un backend per i casi. Al primo avvio l'utente crea una password locale e riceve una chiave di recupero. Episodi e registrazioni vengono cifrati con AES-GCM in IndexedDB e decifrati soltanto mentre il diario è sbloccato; una chiave dati casuale è protetta da chiavi derivate con PBKDF2 sia dalla password sia dalla chiave di recupero. Le chiavi non vengono inviate al server. Gli archivi locali e i file importati non sono inclusi nel sito GitHub Pages né inviati ai workflow. Le registrazioni audio iniziano solo dopo un'azione esplicita e il permesso del microfono.

La password non è un account e non consente sincronizzazione. Se viene dimenticata, la chiave di recupero permette di impostarne una nuova; l'app genera poi una chiave sostitutiva, da conservare separatamente. La chiave non viene salvata dall'app e chiunque la possieda può accedere ai dati; senza password e chiave di recupero i dati non sono recuperabili. I vault creati con versioni precedenti vengono migrati dopo il primo sblocco con la password corrente e richiedono di conservare la nuova chiave mostrata. La cifratura protegge i dati salvati a riposo, non da codice malevolo eseguito nella pagina mentre il diario è sbloccato. I backup `.ndbackup` sono copie indipendenti cifrate con AES-GCM e includono episodi e audio; conserva privatamente la password usata per l'esportazione. I vecchi JSON in chiaro sono importabili solo dopo un avviso e non contengono audio. Browser, dispositivo, backup e sincronizzazione del profilo possono influenzare conservazione e cancellazione. L'app non offre ancora una funzione verificata di cancellazione completa dei casi.

## Contenuti pubblici e contributi

Non pubblicare dati personali o casi identificabili. Rimuovi nomi, indirizzi, email, telefoni, targhe, firme, volti, voci identificabili, metadati dei file, riferimenti di pratica e dettagli che consentano di riconoscere persone o luoghi. Anche un insieme di dettagli indiretti può identificare qualcuno.

Il controllo automatico cerca alcuni formati comuni di email, telefono, targhe, indirizzi, CAP e coordinate. Non riconosce in modo affidabile nomi, volti, firme, voci, metadati incorporati o identificativi indiretti; può inoltre generare falsi positivi. Ogni pubblicazione richiede revisione manuale. Un allarme automatico blocca il workflow finché il contenuto non viene rimosso o corretto e verificato.
