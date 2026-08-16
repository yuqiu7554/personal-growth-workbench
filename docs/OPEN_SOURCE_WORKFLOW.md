# Open-source development and release workflow

Status: working document. Last reviewed: 2026-08-16.

## Goals

- Ship a macOS desktop application, not a hosted web application.
- Keep personal data, credentials, copyrighted material and local paths out of GitHub.
- Make every release reproducible, reversible and understandable to a new contributor.
- Publish the reusable Workbench skill separately from machine-specific delivery settings.
- Maintain a public, copyable Notion companion template alongside the source release.

## Notion companion template

The Notion template is a lightweight companion and acquisition surface, not an alternative desktop
runtime. It may reproduce planning structures that Notion supports well: dashboard views, tasks,
goals, daily reviews, weekly/monthly summaries, learning logs, research progress, a reading library
and health logs.

The template must not imply parity with local SQLite storage, Keychain credentials, deterministic
spaced-repetition scheduling, exam scoring, local file analysis, automated news/paper jobs or the
desktop AI permission model. Publish both an empty version and a synthetic-example version. Neither
version may contain personal records, credentials, copyrighted papers, exam material or private
paths. Any future desktop-to-Notion transfer starts as an explicit Markdown/CSV export and import
workflow; background two-way synchronization requires separate privacy and API design approval.

The empty template is published at
<https://tidal-birth-0a8.notion.site/3be7eec056008023bdf8c560f027f42f>. It contains one dashboard
page and eight empty child databases, with public duplication enabled and public editing disabled.

## Application icon

The user-provided 1.0 brand image will become the bundled first-install icon for personal and
open-source builds. Do not substitute an AI-generated or third-party logo. Runtime customization
stores one normalized 512x512 PNG in Application Support; restoring the default removes that
override and returns to the bundled icon.

## Local change workflow

1. Read `DEVELOPMENT.md`, the product specification, the relevant module, tests and
   `OPEN_SOURCE_RESOURCES.md`.
2. Freeze the behavior being changed and its acceptance criteria.
3. Make one small implementation batch. Do not install unused dependencies or clone competitor
   repositories.
4. Run syntax checks, UI binding checks, dialog checks and module-specific behavior tests.
5. Check secrets, external URLs, file permissions, copyright boundaries and dependency licenses.
6. Build one native application package.
7. Before replacing the Desktop entry, copy the current verified application to the single rolling
   backup path `desktop-dist/backup/个人成长工作台.previous.app`.
8. Replace only `$HOME/Desktop/个人成长工作台.app`, then verify signature, executable and
   embedded resources byte for byte.
9. Launch the new Desktop app. If launch fails, restore the rolling backup and report the failed gate.
10. Record behavior, verification and remaining limitations in the project progress files.

Only one Desktop entry is allowed. The backup is not placed on the Desktop. Older backups are removed
when the next build begins, so exactly one previous version is retained.

## Repository preparation

Before the first public commit:

- Initialize or locate the real Git repository and define the default branch.
- Add ignore rules for databases, Keychain exports, `.env` files, logs, build output, local paths,
  backups, user attachments and imported content.
- Replace synthetic personal targets with optional sample profiles. Keep the user's real profile out
  of the repository.
- Add `LICENSE`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue templates and
  a pull request template.
- Generate a third-party notice from pinned dependency versions.
- Add unit, static, accessibility and desktop smoke checks to CI. CI must never require personal API
  keys for its default test suite.
- Produce signed and notarized macOS artifacts with checksums and a human-readable changelog.

## User-owned AI and retrieval configuration

- Every installation uses the user's own provider account and API key. No author key, proxy account or shared token is shipped; other users cannot consume the author's token balance.
- Settings / AI provides a custom OpenAI-compatible mode with base URL, model, optional input/output prices per million tokens, monthly budget and an automatic pause switch.
- Monthly usage shows calls, input tokens, output tokens and estimated cost. If a provider omits usage data, the call is marked unknown instead of inventing exact tokens or cost.
- Public retrieval from government sites, official media, World Bank, OpenAlex, Crossref and approved source pages does not consume AI tokens. AI is limited to summary, translation, research relation, reading priority and assisted foundational-significance assessment.
- News source configuration is local and exportable without private paths or credentials. Default candidates may include official government sites, People's Daily, Securities Daily and other reviewed official or authoritative sources. WeChat public accounts require a local whitelist and traceable original URL; unsupported automated collection falls back to manual link import.

## First-run module selection

- The first-run wizard lets each user enable or disable top-level sidebar modules. It does not expose every page, tab or sub-feature as a separate switch.
- Dashboard and Settings remain available as the application shell; all business modules are optional. Open-source builds must not silently inherit the author's personal module set.
- Disabling a module hides its navigation and dashboard surfaces and pauses its reminders, scheduled retrieval and automatic task generation. It never deletes SQLite rows, attachments, history or audit records.
- Re-enabling restores the existing data and future schedules. Missed jobs are not fabricated; catch-up behavior requires an explicit user choice.
- Settings / General / Module Management exposes the same switches after onboarding, with dependency and data-impact previews before a module is disabled.

## Release gates

Every tagged release must pass:

| Gate | Required evidence |
| --- | --- |
| Functional | Module tests and a clean desktop smoke test |
| Data safety | Migration backup, rollback test and no destructive default |
| Secrets | Repository scan and runtime Keychain verification |
| Copyright | No exam papers, publisher PDFs, news full text or proprietary dictionaries |
| AI | Provider errors, costs, data scope and model limitations are visible |
| Accessibility | Keyboard path, focus states and readable compact/mobile layouts |
| Supply chain | Pinned lockfiles, verified licenses and dependency review |
| Distribution | Signature, notarization, checksum and install/upgrade test |

The Notion companion has an additional release gate: public-link and duplicate-template testing,
one-step removal of synthetic examples, field-name consistency with the desktop domain model, a
visible capability boundary, version/date labeling, license information and a feedback link.

## Public Workbench skill

The reusable skill should contain:

- `SKILL.md` with the scoped edit, verification, disk-protection and delivery gates.
- A portable delivery script configured by environment or a checked-in example config, never a
  username-specific path.
- Tests that can run without the author's Desktop, API keys or personal database.
- A resource registry template and release checklist.
- Clear supported stack and minimum macOS/toolchain versions.

The public skill must exclude absolute personal paths, API keys, application data, crash reports and
the user's private product specification. A local companion configuration may provide the actual
workspace, Desktop and backup paths and must remain ignored by Git.

## Versioning

- Use semantic versions for the application and skill independently.
- A release note separates user-visible features, migrations, security changes and known issues.
- Database migrations are forward-only in normal use but every migration begins with a recoverable
  snapshot.
- Keep the last known-good application locally until the next version has been launched and used.
