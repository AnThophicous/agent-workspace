---
name: paper-workspace
description: Maintain a persistent, human-readable Paper Workspace shared by AI agents and users through the Paper Workspace MCP or an existing `.paper/` directory. Use proactively, even when the user does not name Paper Workspace, for every new non-trivial task involving multiple steps, project changes, planning, research worth preserving, durable decisions, continuation, handoff, or validation. Before acting on a new non-trivial task, always bootstrap the workspace and create a new planning `.paper`; when clearly continuing the same task, resume its active Paper. Do not use for throwaway questions, casual conversation, or work whose state should not be retained.
---

# Paper Workspace

Make agent work visible and resumable through `.paper` documents. Treat Papers as shared project state, not transcript storage.

## Begin every meaningful task

1. Prefer Paper Workspace MCP tools when exposed.
2. Call `paper_workspace_bootstrap` with the user's current goal before planning.
3. For every **new** non-trivial task, call `paper_create` with `kind: plan` before implementation.
4. Put the intention, constraints, and meaningful steps in that Paper.
5. When the user clearly resumes the same task, search for and continue its active Paper instead of creating a duplicate.

A task is non-trivial when it includes multiple meaningful steps, changes files or systems, creates durable research or decisions, requires validation, or may be paused or handed to another agent.

## Keep the Paper alive

- Read only the active or relevant Papers. Do not load the entire workspace without need.
- Call `paper_update` after meaningful progress, changed constraints, decisions, validation, or blockers.
- Check plan items as they complete.
- Link artifacts by path, URL, issue, or commit instead of copying large contents.
- Keep activity concise and observable. Do not write token-by-token logs.

## Leave a recoverable boundary

- Call `paper_checkpoint` before pausing, handing off, compacting context, or sending the final response after material work.
- Record what changed, what was checked, blockers, and the next executable action.
- Mark the Paper completed only when its intended outcome is complete.
- Mark obsolete knowledge superseded rather than silently replacing its history.

## Use the app only when useful

Call `paper_app_open` when the user asks to see, organize, or edit the Paper structure in the browser. The app is optional; never require it for MCP-only use.

## Fall back safely

If MCP is unavailable but the project already contains `.paper/`, read and edit `.paper` files as Markdown with typed frontmatter. Follow [the Paper protocol](references/paper-protocol.md).

If neither MCP nor `.paper/` exists, continue the user's task and mention setup only when persistence materially matters. Do not claim a Paper was created.

## Protect the workspace

- Never store credentials, tokens, private keys, cookies, or irrelevant personal data.
- Never store hidden chain-of-thought. Store conclusions, evidence, decisions, and useful summaries.
- Prefer project scope over global scope.
- Preserve sources and uncertainty.
- Do not let Paper maintenance displace the user's actual task.
