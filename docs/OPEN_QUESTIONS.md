# Questioni aperte

Le risposte non sono state inventate. Le decisioni che cambiano sicurezza o pubblicazione devono essere prese dal proprietario prima dell’implementazione.

## Privacy e repository

1. Il possibile dato residenziale rilevato nelle fixture è stato già pubblicato in `origin/main` e nella cronologia Git. Si desidera solo sostituirlo nei commit futuri, oppure richiedere una procedura di rimozione dalla cronologia/cache pubblica? La seconda opzione richiede valutazione e autorizzazione esplicita; non eseguire force-push o purge senza approvazione.
2. Il repository resterà pubblico mentre il prodotto è destinato a uso strettamente personale? La pubblicità del codice non deve mai includere dati del diario o planimetrie.
3. Quanto tempo deve restare sbloccata la UI prima del lock automatico? Quale comportamento adottare su sospensione, cambio scheda, sleep e riavvio?
4. Quali livelli di backup sono accettabili: export JSON in chiaro con avviso, archivio cifrato con password separata, oppure nessun backup fino al completamento del restore verificato?
5. Qual è la retention desiderata per eventi, audio, export e backup? Come documentare i limiti di cancellazione del browser e delle copie sincronizzate?

## Dati e flussi

6. Confermare i campi minimi del flusso privato e come distinguere fatto osservato, impatto personale, ipotesi, indicazione consumer e atto esterno.
7. Quale timezone registrare: timezone IANA del dispositivo al momento dell’evento, offset numerico, ora locale dichiarata o combinazione? Come segnalare cambi anomali dell’orologio senza correggere automaticamente?
8. L’intensità percepita deve rimanere obbligatoria nell’inserimento rapido o deve poter restare non indicata?
9. Quali formati di allegato sono davvero necessari nel primo rilascio, con quali limiti massimi e regole di cancellazione?
10. Quali dati devono comparire nel backup e quali in un export selettivo? Chi deve controllare oscuramenti e riepilogo prima della creazione?
11. Quale comportamento atteso per correzioni, cancellazione evento, cancellazione allegato e riferimenti incrociati?

## Normativa e uso

12. Verificare su fonti istituzionali aggiornate se e come siano pertinenti, al caso concreto: artt. 844 c.c. e 659 c.p.; L. 447/1995; DPCM 14/11/1997; DM 16/03/1998; L.R. Lombardia 13/2001; disposizioni e Regolamento di Polizia Urbana del Comune di Milano; GDPR e D.Lgs. 196/2003 modificato. Questo audit non ha verificato applicabilità, testo vigente o interpretazione.
13. Chi sarà revisore qualificato delle future indicazioni italiane? Quali fonti istituzionali e date di riesame usare? La guida corrente è globale e `draft`, non una guida Milano.
14. Quale informazione neutrale fornire all’utente prima di una registrazione audio o della condivisione di voci/dati di terzi? L’app non può attestare la liceità della registrazione.
15. La rappresentazione futura dell’appartamento deve accettare immagini/planimetrie solo da storage locale e consentire oscuramento dei dati incorporati? Confermare che non si desiderano coordinate precise.

## Prodotto e distribuzione

16. Il progetto resterà personale o è prevista commercializzazione? La seconda ipotesi richiede nuova analisi di ruoli, titolarità/responsabilità, privacy, sicurezza, retention, supporto e normativa.
17. Quale hosting consente di configurare header CSP/security? GitHub Pages non espone una normale configurazione server per header personalizzati; valutare una policy meta solo dopo verifica compatibilità.
18. Quali controlli GitHub sono attivi davvero (branch protection/rulesets, secret scanning, Dependabot, dependency review)? Non sono deducibili dai file clonati.
