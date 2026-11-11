# Assessment — Diario Rumore

**Assessment ID:** `202611092126`  
**Project:** Angular / TypeScript single-page PWA  
**Workspace:** `C:\Federico\Progetti\noise-diary`  
**Scope:** Baseline, architecture, accessibility, SEO, and privacy review only. No application source changes were made.

## Executive summary

The application is a local-first Angular PWA with a clear privacy-oriented design: diary records and audio are intended to remain in the browser, recordings require an explicit action, and there are no apparent application-level API, analytics, or telemetry calls in the inspected source. The production build and current unit suite pass. The principal modernization need is incremental decomposition of the large root component, preceded by a real browser-flow baseline so behavior and local-data compatibility remain protected.

The project is **not yet assessed as WCAG-conformant or GDPR-compliant**. This is a source-level assessment, not a formal accessibility audit, legal review, or cryptographic review. No conclusion about static-hosting logs, browser/profile synchronization, or user-specific processing context is possible from this repository alone.

## Evidence and baseline

- `package.json` identifies Angular 22, TypeScript 6, Vitest, and scripts for `build`, `test`, `start`, `lint`, and `content:check`. It defines no E2E script or browser-test dependency.
- `npm test`: **passed**, 6 test files and 36 tests. The inspected tests use in-memory fixtures and `fake-indexeddb`; they do not read user backup files.
- Production build: **passed**. Initial bundle was 332.26 kB raw / 85.32 kB estimated transfer. Angular emitted a component-style budget warning: `src/app/app.scss` is 7.90 kB against a 4 kB warning budget (8 kB error budget).
- Local runtime smoke check: the dev server served `/` with HTTP **200**, the expected page title, and `<app-root>`. The server was stopped afterward.
- E2E user interactions were **not run**. There is no existing E2E suite. The pre-existing `.tsupgrader/runtime-validation/eval-plan.json` covers install, build, unit tests, and an HTTP probe only; its existing standalone result is incomplete at dependency setup. Replaying its `npm ci` setup would replace the local `node_modules` tree, so it was not run.
- `npm outdated --json` found patch/minor updates available within declared ranges: Angular framework packages 22.2.3 → 22.2.5; Angular CLI/build 22.2.5 → 22.2.6; `fake-indexeddb` 6.2.6 → 6.2.8; `tslib` 2.8.1 → 2.9.1; and Vitest 5.0.5 → 5.1.0. `jsdom` 30.1.3 is current within the declared range, while 31.0.0 is a newer out-of-range major. TypeScript 6.0.3 is within the declared `~6.0.2` range; TypeScript 7.0.2 is a separate out-of-range major upgrade.
- Workspace status outside the excluded local-data directory was clean after assessment. The production build output was placed in a temporary directory and removed.

## Findings

### Architecture and refactoring

1. **High — Root component has a broad change surface.** `src/app/app.ts` is roughly 1,200 lines and `src/app/app.html` roughly 600 lines. The root component coordinates vault setup/recovery, diary CRUD/corrections, filtering/sorting, audio recording, backup import/export/conflict handling, and view state. This makes changes and end-to-end coverage harder to isolate.
2. **Medium — Existing service boundaries are useful and should be retained.** Vault, storage, backup, audio recording, and audio-clip repository concerns already have separate services. `app.routes.ts` currently has no routes; the product is one primary diary surface, so adding routing is not inherently required.
3. **Medium — Preserve data and behavior before restructuring.** Existing unit tests cover important storage, vault, backup, and recording concerns, but there is no recorded browser-level baseline for the full user journeys.

**Recommended refactor:** characterize the current journeys first, then extract small UI/state boundaries (authentication/recovery, event editor/list/detail, import/export, audio) while keeping existing storage and cryptographic services/schema stable. Avoid a wholesale rewrite or data migration unless a separate, tested requirement justifies it.

### Accessibility (assessment target: WCAG 2.2 AA)

- Positive evidence: `src/index.html` declares `lang="it"`, a page title and description. The main UI uses header/main/footer landmarks, a primary heading, associated labels for many controls, keyboard handlers for event selection, and status/error announcements.
- Follow-up required: event rows use `li role="button"` with custom keyboard handling; test their accessible name, focus order, Space/Enter behavior, and screen-reader announcement. The recovery-key panel uses `role="alertdialog"` and `aria-modal="true"`; verify initial focus, focus containment/restoration, and background interaction.
- No explicit focus-style rules or reduced-motion rules were found in the inspected component/global styles. Confirm visible focus, contrast, zoom/reflow, target size, and error identification with manual keyboard/screen-reader testing and automated checks. No axe/Pa11y/Lighthouse accessibility baseline is configured.
- The production CSS budget warning is a maintainability/performance follow-up, not itself an accessibility failure.

### SEO and PWA

- The document has Italian language metadata, title, description, viewport/theme color, favicon, manifest, and Angular service-worker configuration.
- No canonical/Open Graph metadata, `robots.txt`, sitemap, or server-side rendering/pre-rendering was found in the inspected public entry points. For a single-page local diary this limits search/social previews; do not expose diary data for indexing. Decide whether the public documentation or app shell is intended to be discoverable before expanding SEO scope.

### Privacy and data handling

- `PRIVACY.md`, `README.md`, and the UI describe local storage, recovery-key responsibility, backup limits, recording consent, and deletion caveats. Source inspection found no application-level `fetch`, `HttpClient`, `sendBeacon`, analytics, or telemetry references in the inspected application/public code.
- The implementation uses a local vault configuration, Web Crypto (including AES-GCM and PBKDF2), browser storage, explicit microphone permission, and encrypted backup handling. These observations do **not** establish cryptographic adequacy, absence of browser/hosting logs, or compliance with any law.
- Keep claims precise: local encryption does not protect data from malicious script execution while unlocked; exported files and browser/profile copies are outside app-controlled deletion. Historical plaintext JSON import is explicitly confirmed in the UI.
- A GDPR review, if applicable to the deployment and processing context, should map purposes, data categories, controller/processor roles, lawful basis, notices, retention/deletion, data-subject workflows, hosting/browser processing, and any audio capture of other people. Obtain qualified human legal/privacy review before making compliance claims.

## Recommended plan scope and gates

1. **Baseline and safety:** obtain approval for an isolated browser test toolchain if needed; add deterministic E2E flows using synthetic data and a fresh browser profile. Cover first setup/unlock/recovery, create/edit/correct/search/select/delete, encrypted export/import and conflict handling, lock, and local deletion. Do not use real diary data or the excluded local backup directory.
2. **Incremental architecture:** extract one boundary at a time from the root component, retaining current vault/storage/backup formats. Add focused tests before each extraction; validate import, restore, and deletion behavior after each change.
3. **Accessibility and UX:** establish automated accessibility checks plus manual keyboard, screen-reader, zoom/reflow, focus, contrast, and recording-permission scenarios. Treat WCAG 2.2 AA as a review target, not a conformance claim until verified.
4. **Privacy and SEO:** maintain the local-only/no-telemetry/no-backend constraint; document the data-flow and deletion limits; review the public app-shell metadata and indexing policy separately from diary data.
5. **Dependency maintenance:** take compatible patch/minor updates in small groups with build and test verification. Handle TypeScript/jsdom major upgrades separately with explicit compatibility review.

**Acceptance gates:** existing unit tests and production build pass; synthetic E2E journeys pass; local storage and backup compatibility are preserved; no backend, telemetry, or remote diary-data transfer is introduced; accessibility findings are reviewed and tracked; privacy/legal statements remain evidence-based and receive human review where required.

## Scope exclusions and limitations

The sensitive user-local `backup/` tree was excluded from searches, inventory, tests, and this report; no contents were read, opened, copied, hashed, moved, edited, staged, or deleted. `npm run lint` and `npm run content:check` were not run because their configured glob/traversal can include repository Markdown or recursively inspect files outside the explicitly safe source scope. No code changes, commits, pushes, or deployments were made.
