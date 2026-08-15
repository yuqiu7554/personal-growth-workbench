# Open-source resource registry

Last reviewed: 2026-08-15

This registry prevents untracked code copying and unnecessary downloads. A resource is not an
application dependency until its row is changed to `Adopt when implementing` and the relevant
feature is being built. Pin an exact released version when adopting it and preserve all required
license notices.

## Installed development skills

| Resource | Source | Purpose | Status |
| --- | --- | --- | --- |
| `playwright` | `openai/skills`, curated | Desktop WebView interaction and regression checks | Installed globally |
| `screenshot` | `openai/skills`, curated | Release screenshot and visual verification | Installed globally |
| `security-best-practices` | `openai/skills`, curated | Secrets, permissions and local-data review | Installed globally |
| `macos-development` | [`rshankras/claude-code-apple-skills`](https://github.com/rshankras/claude-code-apple-skills), MIT, commit `9ffb83138209057875698dd11c1720c657c47a92` | Objective-C/AppKit/WebKit native shell, AppKit/SwiftUI bridges, sandbox, architecture, persistence, platform capabilities and macOS UI review | Installed globally; use for macOS-specific implementation and review |
| `privacy-manifests` | [`rshankras/claude-code-apple-skills`](https://github.com/rshankras/claude-code-apple-skills), MIT, commit `9ffb83138209057875698dd11c1720c657c47a92` | `PrivacyInfo.xcprivacy`, Required Reason APIs and third-party SDK declarations | Installed globally; use before public 1.0 or App Store preparation |
| `macos-app-distribution-dmg` | [`aka-kika/akakika-skills`](https://github.com/aka-kika/akakika-skills), MIT, commit `da0c4859a4b153d284694b0464f66ae8d7049dd3` | Developer ID, Hardened Runtime, signing, notarization, stapling, DMG and Gatekeeper verification | Installed globally; use before public desktop distribution |
| `macos-permissions-privacy` | [`aka-kika/akakika-skills`](https://github.com/aka-kika/akakika-skills), MIT, commit `da0c4859a4b153d284694b0464f66ae8d7049dd3` | Microphone, speech, file access, TCC, Info.plist, entitlements and denied-permission recovery | Installed globally; use for recording, speech and file-access work |
| `macos-notifications` | [`aka-kika/akakika-skills`](https://github.com/aka-kika/akakika-skills), MIT, commit `da0c4859a4b153d284694b0464f66ae8d7049dd3` | Notification authorization, categories, actions, routing, grouping, deduplication and preferences | Installed globally; use for health reminders and background-job status |

The skills are development tooling only and are not bundled into the application. Their source
commits are pinned above for reproducibility; repository popularity is discovery evidence, not a
quality guarantee. Each skill must still be applied only within its stated boundary.

### macOS skill selection decision (2026-08-15)

The workbench already has general specification, incremental implementation, database migration,
SQL, end-to-end testing, WCAG, security and release skills. The five additions above fill platform-
specific gaps without changing the app runtime or adding application dependencies. Use them in this
order when applicable:

1. `macos-development` for native shell, AppKit, sandbox and platform architecture;
2. `macos-permissions-privacy` for microphone, speech, TCC and file access;
3. `macos-notifications` for health reminders and background job notifications;
4. `privacy-manifests` for public 1.0 or App Store privacy declarations;
5. `macos-app-distribution-dmg` for Developer ID signing, notarization and DMG release gates.

Rejected candidates remain reference-only and were not installed: `twostraws/SwiftUI-Agent-Skill`
and `AvdLee/SwiftUI-Agent-Skill` are too SwiftUI-specific for the Objective-C/AppKit/WebKit shell;
`cameroncooke/AXe` targets iOS Simulator automation; `Abdullah4AI/apple-developer-toolkit` adds heavy,
overlapping dependencies; and `xcsift` does not yet justify installation for the current lightweight
build flow.

## Approved implementation resources

| Resource | License | Intended use | Adoption boundary |
| --- | --- | --- | --- |
| macOS system SQLite (`libsqlite3`) | System library | Current native preview state persistence and backup-based migration | Adopted on 2026-08-02; no downloaded dependency |
| [Tauri SQL plugin](https://github.com/tauri-apps/tauri-plugin-sql) | Apache-2.0 | Future Tauri SQLite adapter | Evaluate when replacing the native preview; preserve the existing schema and migration contract |
| [Tauri Store plugin](https://github.com/tauri-apps/tauri-plugin-store) | Apache-2.0 | Small non-sensitive preferences | Adopt only if SQLite is inappropriate for a setting |
| [Tauri Notification plugin](https://github.com/tauri-apps/tauri-plugin-notification) | Apache-2.0 | macOS task, review and health reminders | Adopt with notification permissions and scheduling |
| [Tauri Dialog plugin](https://github.com/tauri-apps/tauri-plugin-dialog) | Apache-2.0 | File/folder import and export pickers | Adopt with the first native import flow |
| [Tauri FS plugin](https://github.com/tauri-apps/tauri-plugin-fs) | Apache-2.0 | Scoped attachment access and relinking | Adopt only with least-privilege capabilities |
| [Tauri Updater plugin](https://github.com/tauri-apps/tauri-plugin-updater) | Apache-2.0 | Signed application updates | Adopt after signing and release infrastructure exists |
| [Tauri Stronghold plugin](https://github.com/tauri-apps/tauri-plugin-stronghold) | Apache-2.0 | Additional protected secrets | Evaluate against macOS Keychain; do not duplicate secret stores |
| [FullCalendar](https://github.com/fullcalendar/fullcalendar) | MIT | Week/day calendar and time-block interactions | Evaluate bundle size and accessibility before adoption |
| [Chart.js](https://github.com/chartjs/Chart.js) | MIT | Weekly/monthly progress and health trend charts | Adopt only when real trend data is persisted |
| [PDF.js](https://github.com/mozilla/pdf.js) | Apache-2.0 | Local PDF viewing for study and research files | Use packaged release modules; never copy the full repository |
| [Mozilla Readability](https://github.com/mozilla/readability) | Apache-2.0 | User-triggered extraction of permitted web articles | Store metadata/excerpts by default, not copyrighted full text |
| [Free Dictionary API](https://dictionaryapi.dev/) | GPL-3.0 server implementation; public API is free to use | English IPA, pronunciation audio, parts of speech, definitions and examples for interactive word lookup | Adopted as a remote service on 2026-08-02; no server code or bulk dictionary data is bundled, responses are displayed on demand with source attribution, and Youdao remains the Chinese translation source |

## External application integrations

| Service | Supported path | Decision |
| --- | --- | --- |
| [Zotero Local API v3](https://www.zotero.org/support/dev/web_api/v3/local_api) | `http://localhost:23119/api/`; offline reads without authentication; Zotero 10+ writes after an in-app authorization dialog | Approved. Implement read-only discovery/import first, then separately authorize writes |
| [Zotero Web API v3](https://www.zotero.org/support/dev/web_api/v3/start) | Cloud library access with a user-created API key | Approved as an optional later fallback; store its key in macOS Keychain |
| [`zotero-api-client`](https://github.com/tnajdek/zotero-api-client) | JavaScript client listed by Zotero documentation | Reference only. Version 0.51.0 declares AGPL-3.0, so use direct documented HTTP calls unless the application license is deliberately made compatible |
| [Youdao text translation API](https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html) | Official HTTPS form API; translation, dictionary/web Deeplinks and optional speech URLs | Adopted in native preview on 2026-08-02. User supplies App ID and App Secret; native v3 signing and Keychain storage |
| Youdao Dictionary app | Open the official `dict.url` returned by the API, such as the `yddict://` scheme | Approved with web fallback; do not depend on undocumented app internals |
| [IELTS Bro](https://www.ieltsbro.com/) | Public site/app launch and user-owned screenshot/PDF import | Limited integration only. No verified public developer API was found |
| [Shanbay](https://web.shanbay.com/web/main) | App/site launch and user-directed PDF/manual import | Limited integration only. Do not use cookies, reverse-engineered endpoints, or encrypted-response workarounds |

Implementation notes are stored in `resources/integrations/README.md`.

## Reference-only projects

These projects may inform product behavior but their source must not be copied into this repository.

| Project | Reason for reference-only use |
| --- | --- |
| [Super Productivity](https://github.com/super-productivity/super-productivity) | Study timeboxing, focus mode and local-first task flows; the workbench needs its own domain model and visual identity |
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | Study onboarding and data ownership messaging; its AGPL license and broad workspace scope make code reuse unsuitable |
| [AFFiNE](https://github.com/toeverything/AFFiNE) | Study modular dashboard presentation; do not reproduce its canvas or branded layout |
| [Khoj](https://github.com/khoj-ai/khoj) | Study cited document chat and scheduled research; implement through the workbench provider interface |
| [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) | Study multi-provider AI configuration and attachment states; avoid importing its large application architecture |
| [Zotero](https://github.com/zotero/zotero) | Study literature metadata and research workflows; integrate only through documented formats or APIs |
| [Anki](https://github.com/ankitects/anki) | Study spaced-repetition behavior; its AGPL code is not copied and the workbench keeps its independently specified schedule |

## Prohibited bundled content

- User API keys, databases, health records, review text, personal paths or logs.
- CET-6 or IELTS papers and audio, publisher PDFs, news full text or proprietary dictionary data.
- Competitor names, logos, screenshots or copied interface assets in product branding.
- Unpinned packages, abandoned libraries, or dependencies without a verified license.
- Cookies, session tokens, intercepted traffic, or reverse-engineered private APIs from learning applications.

## Adoption checklist

1. Confirm the feature cannot be implemented more safely with the existing stack.
2. Verify repository ownership, recent maintenance, release history and license.
3. Pin a released version and record it here and in the dependency lockfile.
4. Enable only required Tauri capabilities and document network/file access.
5. Run license, security, size and interaction checks.
6. Update the Desktop application through `skills/workbench-builder/scripts/deliver-desktop.sh`.
