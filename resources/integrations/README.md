# Integration implementation notes

Reviewed: 2026-08-02. These notes summarize official public documentation and define the safe
integration boundary. Recheck the linked documentation before implementation because external APIs
can change.

## Zotero

Primary path: Zotero Local API v3 at `http://localhost:23119/api/`.

- The user must enable **Settings > Advanced > Allow other applications on this computer to
  communicate with Zotero**. Disabled access returns HTTP 403.
- Start with `GET /api/` and record the `Zotero-API-Version`, `Zotero-Server-ID`, and
  `Zotero-Schema-Version` headers.
- Read operations are local, offline, unauthenticated and not rate-limited. Never expose or forward
  port 23119.
- Use user ID `0` for the locally logged-in library. Cache data in a partition keyed by
  `Zotero-Server-ID`; a 412 response means the cached partition is stale or belongs to another
  database.
- First release scope: connection test, collection picker, metadata import, tag import, DOI/title
  deduplication, attachment references and manual refresh. Do not modify Zotero data.
- Zotero 10+ write scope: call `POST /api/local/authorize` with the server ID and application name.
  Zotero presents the permission dialog. Save a remembered key only in macOS Keychain and handle
  401/403/412/428/429 explicitly.
- Do not read Zotero's SQLite database directly. The official documentation describes that path as
  more fragile than the APIs.
- Optional cloud path: Web API v3 with a user-provided key. It is not required for local-first use.

WorkBench mapping:

| Zotero | Workbench |
| --- | --- |
| item key and library/server identity | external source identity |
| title, creators, date, publication, DOI, URL | literature metadata |
| collections and tags | project/category and tags |
| notes | imported note with source attribution |
| attachment path or item key | external file reference, not an automatic copy |
| version | incremental sync cursor |

## Youdao

Official endpoint: `https://openapi.youdao.com/api` using UTF-8 form parameters over HTTPS.

The word-detail view combines Youdao's Chinese translation with the public Free Dictionary API
(`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`) for IPA, pronunciation audio, parts of
speech, English definitions and examples. The open dictionary call is read-only and on demand; no
bulk dictionary dataset is downloaded or bundled. If it is unavailable, Youdao translation and
macOS system speech remain available.

- Required credentials are App ID (`appKey`) and App Secret. Store both in macOS Keychain and make
  signed requests from the native layer, never from WebView JavaScript.
- Signature v3 is SHA-256 of `appKey + input + salt + curtime + appSecret`; `salt` should be a fresh
  UUID and `curtime` the current Unix time in seconds.
- For text longer than 20 characters, `input` is the first 10 characters, character length, and last
  10 characters. Otherwise it is the complete text.
- Dictionary results may include an official `yddict://` Deeplink and a web fallback. Successful
  translation may include source/target speech URLs if the account has the required speech service.
- First release scope: word/phrase translation, reference meaning, Deeplink, web fallback and speech
  when returned. The user confirms meanings before they enter the local vocabulary library.
- Show API errors and estimated usage; never silently replace a missing Youdao result with AI text.

## IELTS Bro and Shanbay

No verified public developer API was found for either product during this review.

Approved first release paths:

- Launch the installed application or its official website.
- Import user-selected screenshots, PDFs, CSV/TXT files, or manually entered results.
- Parse imported practice records only after the user selects the file and confirms extracted data.
- Keep each provider's practice records separate from CET-6 and from other IELTS sources.

Prohibited paths:

- Capturing login cookies or authentication tokens.
- Calling undocumented/private endpoints.
- Reproducing encrypted-response logic or scraping paid/copyrighted question banks.
- Bundling their content, branding, screenshots or question material in the open-source repository.

## Provider architecture

Each integration should expose capabilities rather than pretending every service supports the same
operations:

```text
availability -> connection status and setup guidance
launch       -> open application or official web fallback
lookup       -> word/phrase lookup where officially supported
import       -> user-authorized file or metadata import
read         -> API read where officially supported
write        -> separately authorized API write where officially supported
```

Unavailable capabilities remain disabled with an explanation. Provider secrets and permissions are
independent; configuring DeepSeek does not authorize Zotero or Youdao.
