# Roadmap di audit e prodotto

La sequenza è proposta, non approvata. Nessuna feature oltre la Fase 0 è stata implementata in questo ciclo.

## 0. Audit e contenimento della privacy

**Stato:** documentazione audit in preparazione su `audit/repository-assessment`; fixture sostituite localmente ma non committate né inviate.

- Completare l’audit e farlo approvare dal proprietario.
- Decidere come trattare la versione già presente nella cronologia pubblica senza eseguire riscritture o push non autorizzati.
- Introdurre regole e controllo per evitare dati reali in fixture, output, screenshot, issue e commit.
- Separare i difetti CI preesistenti (indice contenuti e formattazione) da qualsiasi fix privacy.

## 1. Modello evento affidabile

Branch suggerito dopo contenimento: `feat/noise-event-domain`.

- Definire schema versionato per data/ora locale, timezone, registrazione, fine evento, fatti osservabili, impatto personale, ipotesi e dato strumentale non certificato.
- Mantenere draft, conferma, correzione e archivio con history append-only delle correzioni importanti e motivazione.
- Non introdurre attribuzioni automatiche o campi accusatori.
- Aggiungere migrazioni testate e test per fuso, ora legale e orologio del dispositivo.

## 2. Acquisizione rapida e consultazione

Branch suggeriti: `feat/quick-event-entry`, poi `feat/events-list-and-timeline`.

- Flusso breve, neutrale, mobile, notturno, accessibile con tastiera e utilizzabile con una mano.
- Salvataggio bozza e conferma successiva; niente testi interpretativi precompilati come fatti.
- Ricerca e filtri temporali/stanza/tipo/intensità/durata; dettaglio, calendario e timeline solo dopo modello stabile.
- Test di usabilità con dati sintetici e check accessibilità.

## 3. Sicurezza locale e continuità dei dati

Branch suggeriti: `feat/secure-attachments`, `feat/encrypted-backup`.

- Timeout lock configurabile e comportamento quando la scheda va in background.
- Validazione contenuti e limiti per immagini/documenti/video prima di supportarli; nomi neutralizzati e allegati separati dai metadati.
- Verifica dell’hash al recupero, motivazione e limiti dichiarati; niente claim di firma digitale o autenticità.
- Backup cifrato e procedura di restore verificata, con schema, versione app e avvisi sui dati in chiaro.
- Cancellazione esplicita e confermata con limiti dichiarati per IndexedDB, backup e copie browser.

## 4. Export selettivo

Branch suggerito: `feat/selective-export`.

- Selezione eventi/intervallo, anteprima, oscuramento, manifest con filtri, inclusi/esclusi, timestamp, hash file e disclaimer.
- Export JSON/CSV/ZIP solo dopo formato versionato e test di round-trip.
- Nessun invio automatico, email o PEC; stampa/PDF solo se affidabile.

## 5. Mappa semplice e collaborazione futura

Branch suggerito: `feat/apartment-map`.

- Modello Apartment/Floor/Room/RoomGeometry/ObservationPoint/WallSide/Connection.
- Planimetria caricata e mantenuta localmente con punti selezionabili; nessuna coordinata geografica se non necessaria.
- Nessuna planimetria reale nel repository.
- Ruoli esterni restano disattivati finché non esistono backend sicuro e revisione legale/privacy specifica.

## 6. Gate condivisi

Per ogni branch: formattazione, lint, typecheck/build, test unitari e integrazione, E2E quando configurato, scan dipendenze e segreti, revisione diff e documentazione. Non disabilitare controlli per rendere verde la pipeline. La Fase 0 ha rilevato che i gate attuali di lint e contenuti non sono verdi; correggerli con attività tracciate separate.
