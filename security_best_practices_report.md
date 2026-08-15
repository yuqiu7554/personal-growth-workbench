# Security and privacy review

## Executive summary

No plaintext API secrets were found. Credentials are isolated in macOS Keychain and SQLite is user-visible. Encrypted backup/restore and portable export are implemented and deterministically tested. Public 1.0 remains blocked by final attachment authorization review, release signing/notarization, clean-machine testing and the author's license decision.

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

### SEC-03: Dynamic HTML rendering needs continued escaping discipline

- Location: dynamic render functions in `workbench-prototype/app.js`.
- Evidence: the UI uses `innerHTML`; current user/network values are mostly passed through `escapeHtml`.
- Impact: a future unescaped import or network field could cause DOM injection.
- Fix: prefer `textContent`/DOM construction for imported content. A local CSP was added; existing dynamic layout styles still require `style-src 'unsafe-inline'` until those styles are refactored.

### SEC-04: Public release controls remain incomplete

- Evidence: no finalized license, public GitHub repository, CI security scan, Developer ID/notarized release or updater signature.
- Fix: complete `docs/RELEASE_READINESS.md` and `docs/OPEN_SOURCE_WORKFLOW.md` before publishing source or binaries.
