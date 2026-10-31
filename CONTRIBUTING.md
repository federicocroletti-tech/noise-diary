# Contribuire

Grazie per aiutare a migliorare Diario Rumore. Ogni contributo passa da una pull request; non sono ammessi merge automatici o integrazioni senza revisione del maintainer.

Tutti i partecipanti devono rispettare il [Codice di condotta](./CODE_OF_CONDUCT.md).

## Prima di iniziare

- Cerca issue e contenuti esistenti per evitare duplicazioni.
- Per modifiche ampie o ad alto rischio, apri prima un issue senza dati personali.
- Non inviare registrazioni, immagini, documenti o casi reali. Usa soltanto esempi sintetici.
- Non copiare testo, immagini, moduli o materiali di terzi senza una licenza che ne consenta la pubblicazione.

## Informazioni obbligatorie nella pull request

Indica situazione, Paese/territorio, lingua e tipo di contenuto; fonti e relativa data di verifica; rischi, test effettuati, eventuale uso di AI; conferma di aver rimosso dati personali e di avere i diritti necessari sui materiali.

Per contributi normativi o amministrativi, aggiungi fonte ufficiale HTTPS, ambito territoriale, autorità, lingua, data di verifica, stato editoriale e revisore competente. Non presentare una bozza come verificata.

## Revisione e diritti

Gli autori mantengono il copyright dei propri contributi. Inviando una pull request, dichiari di poter contribuire il materiale e di autorizzarne la distribuzione secondo la licenza applicabile al percorso: MIT per il codice, CC BY 4.0 per contenuti editoriali. La licenza non trasferisce il copyright. Se non puoi concedere tali permessi, non inviare il materiale.

Il maintainer può chiedere modifiche o prove, sospendere una pubblicazione o rifiutare il contributo. Accuratezza, sicurezza e privacy prevalgono sulla rapidità.

## Controlli locali

Con Node.js 22+ e npm 10+:

```bash
npm ci
npm run content:check
npm run lint
npm test
npm run build
```

Se modifichi metadati di una situazione, rigenera l'indice con `npm run content:check -- --write-index`, poi riesegui i controlli.

## Segnalazioni

Usa i modelli in GitHub Issues per proposte editoriali o problemi riproducibili. Non includere nomi, indirizzi, recapiti, targhe, firme, identificativi di caso o allegati originali. Per vulnerabilità o incidenti di privacy, segui [SECURITY.md](./SECURITY.md).
