# Security and privacy review

## Executive summary

No plaintext API secrets were found. Credentials are isolated in macOS Keychain and SQLite is user-visible. Encrypted backup/restore and portable export are implemented and deterministically tested. Dynamic markup now passes through a pinned DOMPurify boundary. Public binary distribution remains blocked by final attachment authorization review, release signing/notarization and clean-machine testing; the current GitHub plan remains source-only.

## High priority

### SEC-01: AI attachment UI exceeds implemented behavior

- Location: `workbench-prototype/app.js`, `sendAiChatMessage`; `workbench-prototype/index.html`, `aiChatFiles`
- Evidence: selected files only contribute names; no bytes are sent to the native AI request.
- Impact: users may incorrectly believe attachments were analyzed.
- Fix: retain the new disclosure; implement per-file preview, authorization and bounded transfer or disable the control before 1.0.

### SEC-02: Backup and deletion promises were incomplete (resolved 2026-08-15)

- Location: `native-shell/main.m` and the settings backup/recycle-bin panels.
- Resolution: the native app now creates a consistent SQLite snapshot, packages managed files, encrypts with AES-256-CBC and PBKDF2, validates the manifest, creates a pre-restore snapshot and restores database plus managed files. Existing same-name files are not overwritten.
- Verification: `--backup-self-test` covers database and managed-file round trips. Passwords remain session-only and are never written to the database or backup.

## Medium priority

### SEC-03: Dynamic HTML rendering needs continued escaping discipline (resolved locally 2026-08-16)

- Location: dynamic render functions in `workbench-prototype/app.js`.
- Resolution: all direct `innerHTML` assignments were removed. Rich markup passes through pinned DOMPurify 3.4.13 with forbidden active tags and `srcdoc`, returns a `DocumentFragment`, and is installed with `replaceChildren`. Plain-text extraction uses `DOMParser` plus `textContent` instead of incomplete tag-removal regular expressions.
- Verification: `scripts/check-dom-security.mjs` checks the vendored file SHA-256, script loading order, sanitizer configuration, forbidden code/DOM sinks and adversarial payload corpus. The check is part of release readiness. GitHub CodeQL must still confirm remote data-flow alerts are cleared after push.

### SEC-04: Binary release controls remain incomplete

- Evidence: the GPL-3.0-only license, public GitHub repository, source CI and CodeQL are configured. A Developer ID certificate, notarized distribution and signed updater are not configured.
- Fix: source publication may continue. Do not publish a prebuilt binary until the signing, notarization and clean-machine gates in `docs/RELEASE_READINESS.md` are complete.
