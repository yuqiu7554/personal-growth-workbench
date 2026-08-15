---
version: alpha
name: Personal Growth Workbench
description: A restrained, local-first desktop interface for repeated planning, study, research, health, and reflection workflows.
colors:
  bg: "#f4f4f1"
  surface: "#ffffff"
  surface-2: "#f7f7f4"
  text: "#171715"
  muted: "#6f706a"
  border: "#deded8"
  strong-border: "#c7c8c1"
  accent: "#315c50"
  accent-soft: "#e2ece8"
  warning: "#85682b"
  warning-soft: "#f2ead7"
  danger: "#8b3d38"
  sidebar: "#ecece8"
typography:
  body:
    fontFamily: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, SF Pro Text, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: 15px
    fontWeight: 400
  heading-1:
    fontFamily: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, SF Pro Text, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0px
  heading-2:
    fontFamily: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, SF Pro Text, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0px
  heading-3:
    fontFamily: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, SF Pro Text, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0px
rounded:
  base: 7px
spacing:
  base: 20px
omitted:
  - section: components
    reason: Shared component rules exist in CSS, but no machine-readable component token contract has been established.
---

# Personal Growth Workbench Design

## Overview

The workbench is a quiet, utilitarian desktop product for repeated personal planning and research work. It prioritizes scanning, comparison, direct action, and trustworthy state over decorative composition. Dense information is organized through stable navigation and restrained full-width work surfaces rather than marketing layouts.

## Colors

Neutral backgrounds and surfaces carry most of the interface. The green accent is reserved for focus, progress, selected state, and primary actions. Warning and danger colors communicate actual state and are not decorative. Text and borders must remain legible in data-dense screens.

## Themes

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#f4f4f1` | `#171816` |
| Surface | `#ffffff` | `#20211f` |
| Secondary surface | `#f7f7f4` | `#262725` |
| Text | `#171715` | `#f0f0eb` |
| Muted text | `#6f706a` | `#a5a69f` |
| Border | `#deded8` | `#383a36` |
| Strong border | `#c7c8c1` | `#50524c` |
| Accent | `#315c50` | `#91b9ad` |
| Accent surface | `#e2ece8` | `#293b36` |
| Warning | `#85682b` | `#d4ba79` |
| Warning surface | `#f2ead7` | `#3b3424` |
| Danger | `#8b3d38` | `#e19b95` |
| Sidebar | `#ecece8` | `#1b1c1a` |

Theme switching changes semantic roles, never component structure. New components use the existing semantic CSS variables so that both themes remain complete.

## Typography

The system font stack keeps Chinese and English text native to macOS while allowing Inter when available. Page headings establish location, panel headings remain compact, and metadata uses smaller muted text. Letter spacing remains zero. Large display typography is not used inside dashboards, settings, cards, or tool surfaces.

## Layout

Desktop layout uses a fixed `248px` left navigation rail and a fluid content column. The principal spacing unit separates sections and panels; compact mode may reduce density without changing information hierarchy. Fixed-format elements such as calendars, tables, controls, counters, and progress tracks require stable dimensions so changing data does not shift the surrounding layout.

At narrow widths, navigation becomes an off-canvas panel, multi-column grids collapse to one or two columns, and actions stack when their labels no longer fit. Text wraps before controls overflow. Complex editing belongs in its owning module; the overview exposes only safe, frequent actions.

## Elevation & Depth

Hierarchy is created with borders, surface contrast, spacing, and typography. Shadows are limited to focused overlays and the AI composer; page sections and ordinary panels do not float above the canvas. Cards are reserved for repeated items, modals, and genuinely framed tools, and cards are not nested inside cards.

## Shapes

Rectangular controls and surfaces use restrained corners no larger than the shared base radius unless a familiar circular control requires a full circle. Icon buttons use stable square dimensions. Pills are limited to compact statuses and segmented choices, not general commands.

## Components

Navigation remains predictable and remembers collapsed state. Buttons use icon-only treatment for familiar tools and text for explicit commands; unfamiliar icons require tooltips and accessible names. Forms pair every input with a visible label, concise helper text, and an inline status region. Destructive and AI-applied changes require confirmation appropriate to their impact.

Panels use compact headings, aligned actions, and a single clear content hierarchy. Tables preserve column alignment and provide horizontal containment where necessary. Empty, loading, offline, stale, success, warning, and error states occupy stable space and provide one direct recovery action.

## Do's and Don'ts

- Do keep the interface restrained, work-focused, and optimized for repeated scanning.
- Do use semantic colors and show the source, timestamp, confidence, or state behind automated content.
- Do preserve keyboard focus, visible labels, non-overlapping text, and explicit cancel behavior.
- Do keep private health, reflection, file names, and personal schedules hidden in privacy and share modes.
- Don't use oversized hero text, decorative gradients, floating page-section cards, nested cards, or ornamental blobs.
- Don't use color as the only status signal or let dynamic labels resize fixed controls.
- Don't allow AI suggestions to silently change plans, records, classifications, or user preferences.
- Don't introduce a new component style when an existing shared pattern expresses the same interaction.
