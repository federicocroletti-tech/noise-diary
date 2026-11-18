# Handoff di sessione

Aggiornato: **2026-11-14**.

## Leggere prima

1. [Stato corrente](../PROJECT_STATUS.md): inventario di funzionalita', codice,
   grafica, impostazioni, configurazione, regole e limiti verificati nel checkout.
2. [Architettura](./CURRENT_ARCHITECTURE.md): responsabilita' e flussi dati.
3. [Guida utente](./guida-utente.md): comportamento destinato all'utente.
4. [Evoluzione NOYSE](./NOYSE_EVOLUTION.md): backlog storico, non inventario attuale.

## Contesto essenziale per il prossimo prompt

- Repository `federicocroletti-tech/noise-diary`; branch rilevato
  `feat/android-apk`, base iniziale `9b24436`. Controllare nuovamente Git.
- Account **Neon** gia' implementati, non Supabase da configurare. Cloud
  PostgreSQL/Object Storage protetto da Auth/RLS, **non cifrato end-to-end**.
- Profili locali indipendenti con vault cifrato e recupero; cloud e locale si
  trasferiscono solo tramite backup/import esplicito.
- Guida integrata con routing; test E2E desktop/mobile gia' presenti.
- Android Capacitor in lavorazione. Esistono modifiche applicative non
  committate e file Android/nativi non tracciati: non eliminarli, ricrearli o
  includerli incidentalmente in commit documentali.
- Questo aggiornamento riguarda solo documenti; niente test applicativi,
  build, modifiche provider, push o deploy. Stato live non verificato.
- Esiti e conteggi dei test del 1/8 novembre sono storici, non garanzie sul
  checkout corrente. Comandi e limiti sono nello stato progetto.

## Vincoli

Preservare dati e compatibilita' backup, usare solo fixture sintetiche,
non committare segreti o `.ndbackup`, non riscrivere la cronologia.
Seguire [governance](../GOVERNANCE.md), [privacy](../PRIVACY.md) e
[regole editoriali](./content-review-policy.md). Il prodotto non certifica
misurazioni acustiche e non fornisce accertamenti o consulenza professionale.

Le note pregresse sui repository satellite sono recuperabili nella cronologia
Git di questo documento; non sono integrazioni verificate in questa analisi.
