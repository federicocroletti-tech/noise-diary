# App Android

L’app Android è un pacchetto nativo (APK) che include l’interfaccia web di Diario Rumore in una WebView Capacitor. Non è un collegamento al sito: l’interfaccia viene inclusa nell’APK e i servizi account, database e archiviazione audio restano quelli cloud già usati dal sito.

## Scaricare e installare l’app

Scarica sempre l’ultima versione da questo indirizzo, anche direttamente dal telefono:

**<https://github.com/federicocroletti-tech/noise-diary/releases/latest/download/diario-rumore.apk>**

1. Apri il link dal browser del telefono e scarica `diario-rumore.apk`.
2. Apri il file scaricato e consenti l’installazione da questa origine quando Android lo chiede.
3. Avvia **Diario Rumore** e accedi con lo stesso account del sito.
4. Dopo l’installazione, puoi revocare il permesso di installare app da quella origine.

Ogni versione è elencata nelle [Release del repository](https://github.com/federicocroletti-tech/noise-diary/releases), con l’impronta SHA-256 del file per verificarne l’integrità.

### Aggiornamenti

Ogni modifica all’app unita su `main` genera automaticamente una nuova Release. Per aggiornare, scarica di nuovo il file dallo stesso link e installalo sopra la versione esistente: gli APK sono firmati sempre con la stessa chiave, quindi non serve disinstallare.

Un APK di **debug** compilato in locale usa invece una chiave diversa: Android rifiuta di installarlo sopra la versione della Release e viceversa. In quel caso devi disinstallare prima l’app, perdendo un eventuale profilo locale salvato al suo interno; esportane prima un backup. I dati dell’account restano nel cloud.

## Dati e connessione

- Accedi con lo stesso account email del sito per leggere e modificare gli stessi episodi e audio.
- Per caricare o sincronizzare i dati dell’account serve una connessione Internet. L’app non accoda modifiche offline né le sincronizza in seguito.
- Un profilo **locale** è indipendente dall’account e dagli altri dispositivi; non crea un database condiviso.
- Le credenziali e la sessione dell’app sono separate da quelle del browser del telefono: accedi una volta nell’app con lo stesso account.
- Non creare o condividere un APK che includa credenziali o chiavi amministrative. L’APK usa solo gli endpoint pubblici del client, protetti dall’autenticazione account e dalle policy del database.

## Build automatica e firma

Il workflow [`android-release.yml`](../.github/workflows/android-release.yml) parte a ogni push su `main` che modifica l’app (sono esclusi i soli documenti) e può essere avviato a mano da **Actions**. Compila l’interfaccia, genera l’APK release, ne verifica la firma e pubblica la Release `android-v1.0.<numero esecuzione>` con il file `diario-rumore.apk`. Il numero di esecuzione è anche il `versionCode` Android, quindi ogni versione è più recente della precedente.

Ogni pull request compila inoltre un APK di debug nel job `android` della [validazione](../.github/workflows/content-validation.yml), così un errore di build viene bloccato prima del merge.

La firma usa una chiave **mai salvata nel repository**:

- nei segreti GitHub Actions `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`;
- in copia locale, fuori dal repository, nella cartella `%USERPROFILE%\.noise-diary-signing\` del computer su cui è stata generata (keystore e file con la password).

**Conserva una copia di keystore e password in un luogo sicuro separato**, ad esempio un gestore di password. I segreti GitHub non si possono rileggere: se la chiave va persa, i nuovi APK avranno una firma diversa e chi ha installato l’app dovrà disinstallarla prima di aggiornarla. Non pubblicare né condividere il keystore.

## Compilare in locale

Requisiti: Node.js 22+, Android SDK Platform 36, Android Build Tools 36 e JDK 21+. Installa l’SDK Android e accetta le licenze dal tuo ambiente di sviluppo.

Se Gradle non trova l’SDK o usa un JDK precedente, imposta le variabili solo per la sessione corrente, adattando i percorsi alla tua installazione:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

Poi genera un APK di debug, per prove sul tuo dispositivo:

```powershell
npm ci
npm run android:apk
```

Il pacchetto è generato in `android/app/build/outputs/apk/debug/app-debug.apk`. Per installarlo copialo sul telefono e aprilo dal gestore file.

Per una build release firmata in locale con la stessa chiave della CI, indica keystore e password solo nella sessione corrente:

```powershell
$signing = "$env:USERPROFILE\.noise-diary-signing"
$env:ANDROID_KEYSTORE_PATH = "$signing\noise-diary-release.jks"
$env:ANDROID_KEYSTORE_PASSWORD = Get-Content "$signing\noise-diary-release-password.txt"
$env:ANDROID_KEY_PASSWORD = $env:ANDROID_KEYSTORE_PASSWORD
$env:ANDROID_KEY_ALIAS = 'noise-diary'
npm run android:release
```

Il risultato è `android/app/build/outputs/apk/release/app-release.apk`. Senza queste variabili Gradle produce un APK release non firmato, che Android non installa. Per aumentare la versione imposta anche `ANDROID_VERSION_CODE` (intero crescente) e `ANDROID_VERSION_NAME`.

Per aprire il progetto Android in Android Studio:

```powershell
npm run android:sync
npm run android:open
```

Gli APK di questo progetto non sono pubblicati su Google Play: la distribuzione avviene tramite le Release del repository.

## Note tecniche

L’app usa internamente il dominio `federicocroletti-tech.github.io` come origine HTTPS della WebView: così i servizi account e audio applicano le stesse regole CORS del sito. Non cambiare `server.hostname` in `capacitor.config.ts` senza aggiornare e verificare anche le origini consentite dei servizi.

Il permesso Android del microfono viene richiesto solo quando avvii una registrazione. Se lo neghi, puoi continuare a usare diario, account e backup senza registrare audio.

Su Android, l’esportazione di backup, registrazioni e modello JSON apre il menu nativo **Salva o condividi il file**. L’importazione usa il selettore file di Android. Il file del backup rimane cifrato; un JSON preparato a mano è invece in chiaro e va custodito con attenzione.
