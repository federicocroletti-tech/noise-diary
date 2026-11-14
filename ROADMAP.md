# Roadmap

> Contesto corrente (2026-11-14): [stato del progetto](./PROJECT_STATUS.md)
> e [handoff](./docs/SESSION_HANDOFF.md). Le fasi e il prossimo passo sotto
> sono storici: account Neon, profili, guida e test E2E esistono gia';
> Android Capacitor e' in lavorazione. Non interpretarli come funzionalita'
> ancora tutte da implementare.

> Aggiornamento NOYSE, 2026-11-10: il piano applicativo corrente, con inventario verificato, gap e backlog, e' in [NOYSE: analisi e piano di evoluzione](./docs/NOYSE_EVOLUTION.md). La sequenza e il prossimo passo qui sotto sono storici e precedono l'integrazione cloud presente nel working tree.

Le fasi sono sequenziali e soggette a revisione. Non implicano date o funzionalità già disponibili.

1. **Pilota editoriale noise** — struttura `situations/`, guide organizzative, metadati, governance, indice e controlli automatici minimi.
2. **Caso local-first completo** — completare il modello caso, backup locale cifrato di episodi e audio, gestione allegati e cancellazione verificabile, con test di migrazione e privacy. Il backup cifrato con importazione additiva e ripristino esplicito è implementato e verificato localmente end-to-end con dati sintetici. La cancellazione degli archivi gestiti dall'app è disponibile e verificata; restano gestione degli altri allegati e una verifica di regressione dopo la pubblicazione.
3. **Documenti derivati dai dati** — cronologia, indice prove e bozze che usano soltanto dati inseriti; PDF/ZIP dopo definizione e validazione del formato.
4. **Espansione delle guide** — aggiungere situazioni e giurisdizioni solo con fonti ufficiali, revisori e lingue esplicite; nessuna procedura nazionale generalizzata.
5. **Internazionalizzazione e pubblicazione** — localizzazione, accessibilità, indice statico, demo con dati sintetici e processo di segnalazione contenuti obsoleti.

## Prossimo singolo passo

Dopo la revisione e la pubblicazione delle modifiche locali, ripetere il controllo essenziale sulla versione pubblica: confermare che Pages serva il commit atteso e che l'app mostri la nuova funzione di cancellazione. Non usare dati reali né introdurre sincronizzazione server.
