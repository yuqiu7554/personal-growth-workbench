---
name: workbench-builder
description: Discover requirements, update, test, build, and deliver the Personal Growth Workbench macOS desktop application. Use whenever defining or changing a module, interface, native shell, AI integration, data behavior, implementation documentation, or desktop package; every completed update must be synchronized to the Desktop app and verified.
---

# 工作台制作

Maintain the local-first macOS desktop application in this repository. Preserve user data, secrets, existing requirements, and the restrained visual language.

## Requirements Discovery Gate

When the user introduces a new module, workflow, substantial behavior change, or a set of product requirements:

1. Do not start implementation immediately. Summarize the understood behavior and ask focused questions about page states, required fields, validation, lifecycle, scheduling, deletion/recovery, AI permissions, failure handling, data history, and cross-module effects as relevant.
2. Ask in short rounds. Carry confirmed answers forward and do not repeat resolved questions. Explicitly surface contradictions with earlier requirements and propose one conservative resolution.
3. Continue until the behavior, page transitions, data rules, edge cases, and MVP boundary are clear enough for approximately 97% implementation confidence.
4. Record the final decisions in the authoritative product specification. Mark superseded rules explicitly rather than leaving silent contradictions.
5. Begin coding only after discovery is complete and the user has authorized implementation, either in the original request or in a later message.

Skip this gate for narrow, unambiguous bug fixes, verification requests, copy changes, or implementation details already fixed by the specification. If the user explicitly asks to keep discussing and not code, remain in discovery.

## Workflow

1. Read `DEVELOPMENT.md`, relevant source, and current tests before editing.
2. Make small, scoped changes. Do not embed API keys, personal files, copyrighted documents, or user data.
   Do not bulk-clone reference repositories or install unused dependencies. Prefer official packages,
   shallow/sparse temporary checkouts, and stable file references. Before adding a third-party resource,
   record its purpose, source, license, version, and replacement boundary in `OPEN_SOURCE_RESOURCES.md`.
3. Keep AI-generated analysis distinct from verified source facts. Require confirmation before AI suggestions change plans or records.
4. Run focused static and behavior checks. Fix failures before delivery.
5. Run `scripts/deliver-desktop.sh` from this skill directory after every completed application update.
6. Keep only `$HOME/Desktop/个人成长工作台.app` as the Desktop entry. Before replacement, retain the current Desktop app as `desktop-dist/backup/个人成长工作台.previous.app`; replace that backup only when the next build begins. Do not report completion unless the project app and Desktop app pass signing, byte-for-byte resource/binary checks, and launch verification. Restore the backup if launch verification fails.

## Desktop Delivery Gate

The Desktop copy is the user-facing product. Updating only HTML, source files, `desktop-dist`, or a browser preview is incomplete.

The delivery script must:

- build `desktop-dist/个人成长工作台.app`;
- replace only the explicit Desktop app path;
- retain exactly one previous application version outside the Desktop and never accumulate older backups;
- verify both app signatures;
- compare the native executable and all embedded interface resources;
- open the Desktop app after successful verification;
- avoid dependency installs, broad copies, caches, and repeated builds.

## Disk Protection

- Download only the files or packages needed for the current implementation step.
- Check expected and actual size before dependency fetches or builds that may exceed 100 MB.
- Never retain a full competitor repository merely as a visual or architectural reference.
- Prefer one dependency fetch and one verified build per completed batch.

If delivery fails, preserve the source edits, report the exact failed gate, and do not claim that the Desktop version was updated.
