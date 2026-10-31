# Governance

## Decisioni

Il maintainer principale conserva la decisione finale sull'ambito, la qualità e l'accettazione dei contributi. Può accettare, chiedere modifiche, sospendere o respingere una pull request; quando una decisione non è ovvia, ne documenta il motivo nell'issue o nella pull request.

Accuratezza, sicurezza, privacy, accessibilità e qualità delle fonti prevalgono sulla velocità. Contenuti promozionali, non verificabili, copiati senza permesso o potenzialmente dannosi possono essere respinti. Nessun contributo è garantito.

## Revisione

Tutte le modifiche passano da pull request. `.github/CODEOWNERS` assegna le aree principali al maintainer. I contenuti ad alto rischio — in particolare riferimenti normativi, indicazioni di emergenza, sicurezza fisica e privacy — non si pubblicano senza revisione manuale pertinente. Il workflow automatico è un filtro e non costituisce approvazione editoriale o professionale.

## Protezione del branch `main`

Queste impostazioni richiedono privilegi amministrativi GitHub e non vengono attivate da file del repository. Un amministratore deve configurare manualmente Rulesets o Branch protection:

1. Vietare push diretti e richiedere pull request per `main`.
2. Richiedere almeno un'approvazione del Code Owner e invalidare approvazioni dopo nuovi commit.
3. Richiedere il superamento del job `validate` del workflow `Content and application validation`.
4. Richiedere conversazioni risolte e branch aggiornato prima del merge.
5. Disabilitare auto-merge e force-push; impedire cancellazione del branch.
6. Applicare le regole anche agli amministratori, se compatibile con le procedure di emergenza del progetto.
7. Verificare che i workflow di pull request usino `pull_request`, permessi minimi e nessun segreto; non usare `pull_request_target` per eseguire codice non fidato.

Il workflow di pubblicazione attuale distribuisce su GitHub Pages al push su `main`. Le regole di protezione devono essere attive prima di rendere pubblico il repository.

## Licenze e contributi

Il copyright resta ai rispettivi autori; il codice è MIT e i contenuti editoriali CC BY 4.0. Il maintainer approva l'integrazione, ma non diventa titolare automatico dei contributi.

## Etichette

GitHub non crea queste etichette dai file del repository. Un amministratore deve predisporle manualmente; non è configurato alcun workflow con permessi di scrittura:

`content`, `documentation`, `template`, `procedure`, `jurisdiction`, `legal-review-needed`, `technical-review-needed`, `privacy-review-needed`, `source-needed`, `translation`, `accessibility`, `duplicate`, `rejected`, `approved-for-merge`, `bug`.
