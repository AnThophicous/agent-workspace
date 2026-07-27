# Paper protocol

Read this reference when MCP tools are renamed, when operating directly on `.paper/`, or when deciding what belongs in a Paper.

## Task lifecycle

| Boundary | Required action |
|---|---|
| New non-trivial task | Bootstrap, then create a new `plan` Paper before acting. |
| Clear continuation | Recover and continue the existing active Paper. |
| Meaningful progress | Update plan state and concise activity. |
| Durable choice | Record decision and rationale in the plan or a decision Paper. |
| Pause or handoff | Append a checkpoint with the next action. |
| Completion | Record outcome, validation, final checkpoint, and completed status. |

## Canonical tools

| Purpose | Tool |
|---|---|
| Recover focused context | `paper_workspace_bootstrap` |
| Start work | `paper_create` |
| Read one document | `paper_read` |
| Orient in the tree | `paper_list` |
| Retrieve relevant work | `paper_search` |
| Maintain current state | `paper_update` |
| Preserve continuation | `paper_checkpoint` |
| Organize safely | `paper_move` |
| Open the optional interface | `paper_app_open` |

Match renamed host tools by semantics. Never call a loosely related tool merely to satisfy the lifecycle.

## Format

A `.paper` file is UTF-8 Markdown with YAML frontmatter:

```paper
---
paper_version: 1
id: 65c51024-524a-4d3a-86cc-186f910292c6
title: Build Paper search
kind: plan
status: active
project: paper-workspace
created_at: '2026-07-24T23:30:00.000Z'
updated_at: '2026-07-24T23:34:00.000Z'
tags:
  - search
---
# Build Paper search

## Intention

Find relevant Papers without loading the complete workspace.

## Plan

- [ ] Define search scope
- [ ] Implement retrieval
- [ ] Validate results

## Activity

_Waiting for the first meaningful update._

## Outcome

_Open._
```

Required metadata:

- `paper_version`
- `id`
- `title`
- `kind`
- `status`
- `project`
- `created_at`
- `updated_at`
- `tags`

Kinds:

- `plan`
- `note`
- `decision`
- `memory`
- `checkpoint`
- `workspace`

Statuses:

- `draft`
- `active`
- `paused`
- `completed`
- `superseded`
- `archived`

## Workspace

```text
.paper/
├── workspace.paper
├── projects/
│   └── <project>/
│       └── papers/
│           └── <timestamp>-<title>.paper
└── .trash/
```

Use `/` in public relative paths. Reject any path that escapes `.paper/`.

## Memory quality

Store:

- Stable user preferences explicitly stated.
- Verified project constraints.
- Reusable procedures.
- Decisions with rationale.
- Research summaries with sources.
- Checkpoints needed for continuation.

Do not store:

- Raw conversation dumps.
- Hidden reasoning.
- Guesses presented as facts.
- Temporary noise.
- Secrets.
- Content already canonical elsewhere unless the Paper adds rationale or relationships.

Preserve conflicts and sources until verification. Mark old authority superseded instead of erasing it.
