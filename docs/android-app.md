# App Android

L’app Android è un pacchetto nativo (APK) che include l’interfaccia web di Diario Rumore in una WebView Capacitor. Non è un collegamento al sito: l’interfaccia viene inclusa nell’APK e i servizi account, database e archiviazione audio restano quelli cloud già usati dal sito.

## Dati e connessione

- Accedi con lo stesso account email del sito per leggere e modificare gli stessi episodi e audio.
- Per caricare o sincronizzare i dati dell’account serve una connessione Internet. L’app non accoda modifiche offline né le sincronizza in seguito.
- Un profilo **locale** è indipendente dall’account e dagli altri dispositivi; non crea un database condiviso.
- Le credenziali e la sessione dell’app sono separate da quelle del browser del telefono: accedi una volta nell’app con lo stesso account.
- Non creare o condividere un APK che includa credenziali o chiavi amministrative. L’APK usa solo gli endpoint pubblici del client, protetti dall’autenticazione account e dalle policy del database.

## Compilare un APK di debug

Requisiti: Node.js 22+, Android SDK Platform 36, Android Build Tools 36 e JDK 21+. Installa l’SDK Android e accetta le licenze dal tuo ambiente di sviluppo.

Se Gradle non trova l’SDK o usa un JDK precedente, imposta le variabili solo per la sessione corrente, adattando i percorsi alla tua installazione:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

Poi genera l’APK:

```powershell
npm ci
npm run android:apk
```

Il pacchetto installabile è generato in:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Per aprire il progetto Android in Android Studio:

```powershell
npm run android:sync
npm run android:open
```

Poi usa Android Studio per compilare o firmare una versione release. `app-debug.apk` è destinato a test e installazione manuale; non è firmato per la pubblicazione su Google Play. Per distribuire una release occorrono una chiave di firma custodita separatamente e i controlli di pubblicazione appropriati.

## Installare l’APK sul telefono

1. Copia `app-debug.apk` sul telefono, ad esempio via cavo USB o da una cartella cloud privata.
2. Apri il file dal gestore file di Android e consenti l’installazione da questa origine quando richiesto.
3. Avvia **Diario Rumore** e accedi con lo stesso account del sito.
4. Dopo l’installazione, puoi revocare il permesso di installare app dalla stessa origine.

Per aggiornare l’app, installa un nuovo APK firmato con la stessa chiave: i dati dell’account restano nel cloud. Un APK di debug generato su un altro computer usa una chiave diversa e può richiedere di disinstallare prima la versione precedente; un eventuale profilo locale salvato nell’app verrebbe eliminato, quindi esportane prima un backup.

## Note tecniche

L’app usa internamente il dominio `federicocroletti-tech.github.io` come origine HTTPS della WebView: così i servizi account e audio applicano le stesse regole CORS del sito. Non cambiare `server.hostname` in `capacitor.config.ts` senza aggiornare e verificare anche le origini consentite dei servizi.

Il permesso Android del microfono viene richiesto solo quando avvii una registrazione. Se lo neghi, puoi continuare a usare diario, account e backup senza registrare audio.

Su Android, l’esportazione di backup, registrazioni e modello JSON apre il menu nativo **Salva o condividi il file**. L’importazione usa il selettore file di Android. Il file del backup rimane cifrato; un JSON preparato a mano è invece in chiaro e va custodito con attenzione.
