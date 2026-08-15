# DeepSeek recommendation update workflow

Status: first executable desktop slice. Last reviewed: 2026-08-14.

## Current implementation boundary

- Daily news currently reads public metadata from the China Government website and World Bank. The source registry is designed to expand to official government and regulator sites, People's Daily and other official media, Securities Daily and other authoritative specialist media, and reviewed WeChat public accounts.
- Weekly papers are retrieved from OpenAlex, deduplicated by DOI, filtered against the local exclusion list, and checked against Crossref. DOI failures remain visible as pending verification.
- DeepSeek receives only retrieved source metadata and available abstracts. It writes summaries, translations, research relations, and reading priority; a failed AI call does not replace or invent source facts.
- Settings expose topic keywords, paper exclusions, and an AI-processing switch. SQLite stores results, synchronization state, errors, and four-week history.
- The application catches up after launch and checks missed jobs every 15 minutes while open. A macOS background helper for exact execution while the application is fully quit is not implemented yet.
- JCR and CAS journal quartiles are not available from the selected public APIs. Until a legally obtained partition table is imported, papers are explicitly labelled as awaiting partition verification.

DeepSeek is the update executor for daily news and weekly literature. It coordinates the complete job
through Workbench tools; it is not itself the factual database.

## User preference setup

The first launch questionnaire records a local `RecommendationProfile` containing:

- user stage and intended use;
- topics, keywords, exclusions and weights;
- regions and languages;
- trusted and blocked sources;
- daily/weekly quantity and schedule;
- journal quality rules and blocked-journal list;
- optional project, goal and reading-history links.

An optional DeepSeek conversation converts natural language into a structured profile draft. The user
reviews the exact fields before saving. The questionnaire remains fully usable without AI.

## Daily news job

```text
08:00 trigger
  -> load local preference profile
  -> DeepSeek plans source-specific queries
  -> call approved government, association, research and media tools
  -> normalize source metadata and event identity
  -> enforce source/date/exclusion rules
  -> merge duplicate coverage around one event
  -> DeepSeek scores relevance and writes sourced summaries
  -> deterministic final validation
  -> publish up to the user's configured limit
  -> store execution audit and update timestamp
```

All candidates must have a parseable publication date between now and 30 days ago. Missing, invalid,
future, or older dates are rejected; today is preferred and the remainder is ordered newest first.
The limit is a maximum, so the job publishes fewer items instead of filling the feed with weak or old
content.

The built-in daily-news profile has four independent themes: logistics engineering, management
engineering, AI development, and low-altitude economy. Each enabled theme publishes at most five
items and aims for three; fewer than three is valid when trustworthy current material is unavailable.
The first adapter set uses public JSON or RSS/Atom from China Government Network, World Bank, EASA,
NIST, the European Commission digital-strategy portal, MIT Technology Review, The Loadstar and
TechCrunch AI. IEEE is intentionally excluded. P0/P1 sources form the core and P2 sources supplement
industry signals. A failed adapter is recorded but does not cancel successful adapters.

Policy cards preserve the publishing authority, date, document number when present, original URL and
status (consultation, formally released or in force). Event aggregation selects the main source in the
order official authority, authoritative media, industry institution, commercial media and personal
opinion, while retaining cross-source links. DeepSeek may summarize, translate, explain relevance and
rank retrieved records; it cannot create or change these factual fields.

Sources are adapter-based and locally configurable. Official APIs and RSS are preferred, followed by
public pages whose terms permit access. Search engines may discover an official article but their
snippets are not treated as the source. WeChat public accounts require a reviewed operator whitelist,
an original article URL and a verified date. The open-source build supports manual link import for
such articles; it must not bypass login, CAPTCHA, rate limits or platform protections to automate
collection.

Major-event notifications use rule-based thresholds plus source evidence. DeepSeek may explain why an
event is important but cannot independently declare an unsupported event as major.

## Weekly literature job

```text
Monday 08:00 trigger
  -> load research profile, project stage and prior recommendations
  -> DeepSeek builds search expressions
  -> call Crossref, OpenAlex and other legally configured sources
  -> normalize title, authors, journal, year, DOI and abstract
  -> verify DOI and deduplicate against history
  -> enforce Q1/Zone 1, article type and hard journal exclusions
  -> DeepSeek ranks relevance and reading priority
  -> translate the verified original abstract into Chinese
  -> deterministic final validation
  -> publish the configured number and write an audit record
```

The original abstract is displayed verbatim with source attribution. Its Chinese translation is
visually separated and labelled as AI-generated. Missing abstracts are marked missing; DeepSeek does
not reconstruct them.

### Strict journal gate (2026-08-15)

Formal recommendations use the generated 72-journal whitelist derived from the reviewed workbook's
`高质量保留` sheet. ISSN is the primary key and normalized journal title is only a fallback. OpenAlex
print and online ISSNs are checked as aliases for the same source. The app packages the generated
whitelist data, version and evidence fields, but not the source workbook.

IEEE, MDPI, Q2 and Zone 2 are immutable system exclusions. User exclusions are additive. Candidates
that do not match the whitelist, have unknown quality, or appear only in the workbook's raw sheet are
discarded before DOI enrichment and before DeepSeek receives any candidate. DeepSeek cannot override
this gate. Current recommendations and the four-week archive are requalified against the latest
whitelist when state is loaded.

Because the reviewed source does not include an independent JCR Q field, the UI says
`严格白名单匹配`; it must not claim `JCR Q1 已核验`. A future legally imported annual JCR/CAS dataset
may add year-specific verification without weakening this gate.

## Write policy

- Rule-compliant, source-complete items may update automatically when the user enables automation.
- Missing sources, DOI conflicts, uncertain journal quality or low confidence go to a review queue.
- No result generated only from model memory enters the formal feed.
- A failed job retains the last successful data, shows its timestamp and supports one-item or whole-job
  retry.
- Each run records model, time, profile version, queries, tools, candidate count, exclusion reasons,
  final count and errors. Prompts need not be stored in full.

## Provider failure

If DeepSeek is unavailable, the Workbench may still collect and normalize source candidates using
deterministic tools, but it labels the run incomplete and does not fabricate summaries or relevance
scores. The user can retry later or select another configured model explicitly.
