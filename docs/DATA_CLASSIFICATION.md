# Classificazione dei dati

## Classi

| Classe                | Esempi                                                                                                                               | Regole di gestione                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC`              | Documentazione generica del progetto, codice, guide non identificative, fixture generate                                             | Può essere committata dopo revisione; nessun caso reale o identificativo.                                                                  |
| `INTERNAL`            | Configurazioni non sensibili, configurazione build, workflow e note tecniche non riservate                                           | Committabile se non contiene token, endpoint privati, credenziali o dati individuali.                                                      |
| `CONFIDENTIAL`        | Eventi, data/ora, indirizzi, stanze, punti di percezione, contatti, note, tag, frequenza e distribuzione degli episodi               | Solo nell’archivio privato; minimizzare, cifrare a riposo e condividere solo per selezione consapevole. Mai committare.                    |
| `HIGHLY_CONFIDENTIAL` | Audio, video, immagini, documenti, dati sanitari, giudiziari, identificativi, comunicazioni con autorità o legali, planimetrie reali | Protezione più restrittiva, storage locale cifrato, accesso limitato, export oscurato e conservazione minima. Mai committare o pubblicare. |

## Regole di classificazione

- Se un elemento combina più classi, applicare la classe più restrittiva.
- Dati sintetici devono essere chiaramente artificiali e non derivati da persone o luoghi reali.
- Hash, timestamp, nomi file, metadati, log e statistiche possono restare identificativi o rivelare abitudini: non considerarli automaticamente anonimi.
- Anche un aggregato può diventare `CONFIDENTIAL` se consente di ricostruire luogo o comportamento.
- Non inserire dati reali in repository, test, fixture, screenshot, demo, issue, log CI, report pubblici o artefatti di build.
- Le fixture del branch audit sono state rese sintetiche localmente. La versione precedente resta nella cronologia remota pubblica; il valore non viene riprodotto qui. Il presente inventario non equivale a una bonifica della cronologia.

## Ciclo di vita

1. Raccogliere solo ciò che serve a descrivere l’episodio senza attribuire colpe.
2. Conservare metadati e allegati separati e cifrati; la password locale non sostituisce la sicurezza del dispositivo.
3. Usare un backup cifrato soltanto dopo aver testato il ripristino; il JSON attuale è in chiaro.
4. Prima di condividere, selezionare gli eventi necessari e oscurare dati non pertinenti; non inviare automaticamente.
5. Cancellare esplicitamente secondo una procedura documentata; l’eliminazione dal browser non garantisce la rimozione di backup, sincronizzazioni o revisioni Git.

## Esiti dell’inventario locale

- Nessun database, registrazione o allegato utente è stato trovato tra i file del checkout esaminato.
- È stato rilevato un possibile dato residenziale in due fixture pubblicate in precedenza; le fixture locali sono state sostituite con valori sintetici. Nessun contenuto è riprodotto nel report.
- `gitleaks` non è installato e non è stata eseguita una scansione specializzata completa della cronologia Git. Il controllo automatico editoriale è euristico e copre solo un sottoinsieme dei contenuti testuali.
