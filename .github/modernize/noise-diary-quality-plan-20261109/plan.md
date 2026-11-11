# Modernization Plan: Noise Diary Quality and Safe Refactoring

**Project**: Diario Rumore (`noise-diary`)

## Technical Framework

- **Language**: TypeScript
- **Framework**: Angular 22, standalone single-page PWA
- **Build and tests**: npm 10.9.8, Angular CLI, Vitest
- **Persistence**: IndexedDB and localStorage; no application backend
- **Current baseline (from assessment)**: production build and 36 unit tests pass; local HTTP smoke check passed. No repository E2E suite is configured.

## Overview

Establish a behavior and runtime baseline, document existing user journeys and architecture, then make small, testable improvements without changing the product’s local-first behavior or stored data and backup formats. Review relevant UI/UX, accessibility against WCAG 2.2 AA, app-shell SEO, and privacy-related technical controls.

The work must remain frontend-only: no backend, accounts, synchronization, telemetry, deployment, or automatic data transmission. Use synthetic data and isolated browser storage for tests. Do not make a legal or GDPR-compliance claim. Preserve unrelated worktree changes and limit formatting to files intentionally changed.

## Phases

1. **Characterize** — map user flows and architecture; record unit, build, runtime, and E2E baseline evidence.
2. **Refactor incrementally** — decompose the broad root-component responsibilities in small, behavior-preserving steps.
3. **Improve interaction quality** — address applicable usability and accessibility findings, then review app-shell SEO without exposing diary data.
4. **Review privacy and security controls** — preserve local-only data handling, assess technical controls and known dependency advisories.
5. **Verify** — rerun the frozen synthetic browser journeys and the relevant unit, build, and runtime checks.

Detailed task requirements, ordering, and acceptance evidence are in `.metadata/tasks.json`.

## Constraints and Acceptance Gates

- Keep vault, IndexedDB, localStorage migration, legacy JSON import/export, and encrypted backup formats backward-compatible. Do not introduce a data migration or alter a format unless a separate requirement and compatibility plan justify it.
- Test only with synthetic fixtures and a fresh, isolated browser profile. Exclude sensitive user-local data from inspection, scans, snapshots, fixtures, and test scope.
- Prefer existing dependencies and browser tooling. The repository has no declared Playwright/Cypress dependency or E2E script. Do not install dependencies or download browsers without explicit approval; if existing automation is unavailable, record the E2E blocker and request approval before changing the toolchain.
- Do not add unnecessary dependencies. Keep changes localized; no global formatting, commit, push, or deployment.
- Require the production build and unit suite to pass; compare browser journeys against the frozen baseline; verify unchanged data/backup compatibility using synthetic fixtures.
- Treat WCAG 2.2 AA as a target for review and remediation, not a conformance claim unless appropriate verification supports it. Record manual and automated findings.
- SEO work is limited to the public app shell. Never expose or index diary records. Prefer a conservative no-index policy until app-shell discoverability is explicitly established; do not add server rendering or routes as an SEO shortcut.
- Verify privacy/security statements against implementation. Technical review is not legal advice, a cryptographic certification, or a GDPR-compliance assessment.

## Open Questions & Questionnaire

- [ ] E2E runner/browser availability is unconfirmed. Can an existing approved browser runner be used? If not, obtain explicit approval before adding a test dependency or downloading a browser; until then, E2E automation remains blocked and must not be represented as completed.
- [ ] Confirm whether the public app shell should be discoverable in search/social previews. Until confirmed, do not index diary data and use a conservative app-shell policy.
