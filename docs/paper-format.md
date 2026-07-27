# `.paper` format specification

## Contents

1. Status and goals
2. File encoding
3. Document structure
4. Frontmatter fields
5. Paper kinds
6. Paper statuses
7. Markdown body
8. Planning convention
9. Paths and workspace layout
10. Identity and links
11. Reading and recovery
12. Writing rules
13. Compatibility
14. Examples

## 1. Status and goals

This document defines Paper Format version 1.

The format is designed to be:

- Directly readable by people.
- Easy for language models to write correctly.
- Editable in normal text editors.
- Friendly to Git diffs.
- Portable between operating systems and agent hosts.
- Extensible without requiring a proprietary parser.

A `.paper` file is Markdown with YAML frontmatter and a `.paper` extension.

The extension signals that the document participates in an agent-work lifecycle. It does not make the body non-Markdown.

## 2. File encoding

Writers must use:

- UTF-8.
- Unix or Windows line endings.
- A final newline.

Readers should accept:

- UTF-8 with or without a byte-order mark.
- `LF` and `CRLF`.

Writers should not emit:

- UTF-16.
- Binary attachments embedded in the document.
- NUL bytes.

Attachments should remain external artifacts referenced by path or URL.

## 3. Document structure

```paper
---
paper_version: 1
id: 65c51024-524a-4d3a-86cc-186f910292c6
title: Example Paper
kind: plan
status: active
project: paper-workspace
created_at: '2026-07-24T23:30:00.000Z'
updated_at: '2026-07-24T23:34:00.000Z'
agent: codex
tags:
  - example
---
# Example Paper

Markdown begins here.
```

The document has two layers:

1. Typed frontmatter for stable machine operations.
2. Markdown for human and agent communication.

Readers must not require a fixed Markdown heading order for all Paper kinds.

## 4. Frontmatter fields

### `paper_version`

- Type: integer.
- Required for canonical v1 documents.
- Current value: `1`.

Readers may recover a missing version as version 1 when the document is otherwise recognizable. Writers must emit it.

### `id`

- Type: string.
- Required.
- Recommended value: UUID.
- Stable across rename and move.

The path is not the identity. Moving a Paper must not change `id`.

### `title`

- Type: string.
- Required.
- Maximum recommended length: 180 characters.

The first Markdown H1 should normally match the title. Metadata remains canonical when they conflict.

### `kind`

- Type: enum string.
- Required.
- Values: `plan`, `note`, `decision`, `memory`, `checkpoint`, `workspace`.

Unknown values should be treated as `note` by tolerant readers without automatically rewriting the source.

### `status`

- Type: enum string.
- Required.
- Values: `draft`, `active`, `paused`, `completed`, `superseded`, `archived`.

Unknown values should be treated as `draft`.

### `project`

- Type: lowercase slug string.
- Required.
- Example: `paper-workspace`.

Project scope prevents unrelated Papers from dominating retrieval.

Recommended slug rules:

- Normalize Unicode where possible.
- Remove combining marks.
- Lowercase.
- Replace non-alphanumeric sequences with `-`.
- Remove leading and trailing `-`.

### `created_at`

- Type: ISO 8601 timestamp string.
- Required.
- Immutable after creation.

### `updated_at`

- Type: ISO 8601 timestamp string.
- Required.
- Updated after a meaningful content or metadata write.

Merely reading or indexing a Paper must not modify it.

### `agent`

- Type: string.
- Optional.

Identifies the agent or person responsible for the latest structured work when useful. It must not be treated as an authorization identity.

### `tags`

- Type: string array.
- Required, may be empty.

Tags support lightweight retrieval. They are not a replacement for project scope, kind, or status.

### `source`

- Type: string.
- Optional.

References the origin of imported or derived knowledge. It may be a path, URL, issue, commit, or another Paper identifier.

### `supersedes`

- Type: string.
- Optional.

Contains the stable `id` of a Paper whose current authority this Paper replaces. The earlier Paper should remain readable and receive `status: superseded`.

## 5. Paper kinds

### `plan`

The default kind for every new non-trivial task.

Expected content:

- Intention.
- Plan.
- Activity.
- Outcome.

### `note`

Durable project information that does not represent a choice, long-term memory, or task plan.

Examples:

- Research summary.
- Design exploration.
- Meeting notes.
- External reference synthesis.

### `decision`

A meaningful choice with context.

Recommended content:

- Decision.
- Alternatives.
- Rationale.
- Consequences.
- Supersession state.

Do not create a separate decision Paper for every minor implementation choice. Small decisions may remain in the active plan Paper.

### `memory`

Stable, reusable knowledge.

Appropriate:

- Explicit user preference.
- Verified project constraint.
- Reusable procedure.
- Confirmed domain fact with provenance.

Inappropriate:

- Guesses.
- Temporary errors.
- Raw chat messages.
- Secrets.
- Hidden chain-of-thought.

### `checkpoint`

Standalone continuation state when a checkpoint needs its own lifecycle.

Most checkpoints should be appended to the active plan Paper through `paper_checkpoint`.

### `workspace`

Top-level workspace identity and durable global context.

The canonical workspace Paper is:

```text
.paper/workspace.paper
```

## 6. Paper statuses

### `draft`

Created but not yet authoritative or active.

### `active`

Current work or current knowledge.

Only one plan should normally be active for one task identity.

### `paused`

Work is valid but waiting. The latest checkpoint should state the blocker and next action.

### `completed`

The intended outcome was achieved. A completed plan should contain a final checkpoint or outcome.

### `superseded`

Another Paper replaces the current authority. Preserve provenance and link the replacement.

### `archived`

Retained for history but excluded from default active retrieval.

## 7. Markdown body

The body supports CommonMark and GitHub Flavored Markdown conventions.

Recommended features:

- Headings.
- Paragraphs.
- Task lists.
- Ordered and unordered lists.
- Blockquotes.
- Links.
- Fenced code blocks.
- Tables when exact comparison benefits from them.

Writers should favor concise, observable state. The body is not a private scratchpad for unrestricted reasoning.

## 8. Planning convention

New task Paper template:

```markdown
# Task title

## Intention

Describe the desired outcome and why it matters.

## Plan

- [ ] First meaningful step
- [ ] Second meaningful step

## Activity

_Waiting for the first meaningful update._

## Outcome

_Open._
```

Agent behavior:

1. Create the Paper before starting a new non-trivial task.
2. Record a plan that is useful to resume.
3. Update after meaningful milestones, not after every token or tool call.
4. Check completed steps.
5. Append checkpoints at handoff or pause.
6. Mark the status completed only when the goal is complete.

## 9. Paths and workspace layout

Canonical v1 layout:

```text
.paper/
├── workspace.paper
├── projects/
│   └── <project-slug>/
│       ├── papers/
│       │   └── <timestamp>-<title-slug>.paper
│       ├── decisions/
│       ├── memories/
│       └── artifacts/
└── .trash/
```

Only `workspace.paper` and project `papers/` are required by the current implementation.

Directory names beginning with `.` are reserved for implementation state and should be excluded from the visible tree unless explicitly requested.

Public paths use `/` separators even on Windows.

Readers and writers must reject relative paths that escape `.paper/`.

## 10. Identity and links

### Path links

Use relative paths when the relation depends on workspace location:

```markdown
[Architecture decision](../decisions/local-app.paper)
```

### Stable identity links

Use a Paper identifier when rename resilience matters:

```text
paper:65c51024-524a-4d3a-86cc-186f910292c6
```

The v1 implementation does not yet resolve `paper:` links automatically, but writers may preserve them for future indexes.

## 11. Reading and recovery

A tolerant reader should:

1. Parse frontmatter if present.
2. Recover missing title from the first H1.
3. Assign safe in-memory defaults for missing kind or status.
4. Keep the original raw file available.
5. Report conflicts or corruption.
6. Avoid writing repaired content until the user or agent performs a write.

This prevents a mere viewer from causing large Git diffs.

## 12. Writing rules

Canonical writers should:

- Preserve stable `id`.
- Preserve `created_at`.
- Update `updated_at`.
- Order known metadata consistently.
- Preserve Markdown semantics.
- Write complete files through a temporary file and rename.
- Avoid duplicate unrelated content.
- Avoid secrets and private reasoning.

Writers may preserve unknown frontmatter fields in future versions. The current v1 writer normalizes the known contract.

## 13. Compatibility

### Plain Markdown tools

Most Markdown editors do not recognize `.paper` automatically. Users may associate the extension with Markdown syntax or open it as text.

### Git

`.paper` is text and works with normal Git diffs. Projects may choose whether `.paper/` is committed.

Recommended decisions:

- Commit project plans and decisions when team sharing is desired.
- Ignore local-only personal Papers when they contain private context.
- Never commit secret material.

### Obsidian-style links

Wiki links may appear in the Markdown body. Paper does not require them for identity or retrieval.

### Future versions

Readers must inspect `paper_version`. A reader that cannot safely interpret a future version should return the raw document instead of rewriting it as v1.

## 14. Examples

### Decision

```paper
---
paper_version: 1
id: 43c986e5-8841-4a73-9907-855133152c82
title: Use SSE for local updates
kind: decision
status: active
project: paper-workspace
created_at: '2026-07-24T23:40:00.000Z'
updated_at: '2026-07-24T23:40:00.000Z'
tags:
  - app
  - realtime
---
# Use SSE for local updates

## Decision

Use Server-Sent Events from the local app server to the browser.

## Rationale

Paper updates are primarily one-way notifications. User mutations already use HTTP.

## Consequences

- Lower protocol complexity than WebSocket.
- Automatic browser reconnection.
- No binary messages.
```

### Memory

```paper
---
paper_version: 1
id: 3283a5ff-b76b-4e7e-95cf-26bc947e7662
title: Interface density preference
kind: memory
status: active
project: paper-workspace
created_at: '2026-07-24T23:42:00.000Z'
updated_at: '2026-07-24T23:42:00.000Z'
tags:
  - interface
  - preference
source: explicit-user-instruction
---
# Interface density preference

Keep the sidebar attached to the main surface. Avoid detached cards, empty dashboard spacing, and technical metrics that do not help the person understand the active Paper.
```
