# Paper Workspace MCP reference

## Contents

1. Transport and lifecycle
2. Behavioral contract
3. Tool index
4. Tool reference
5. Results and errors
6. Host guidance

## 1. Transport and lifecycle

Paper Workspace v0.1 exposes an MCP server over standard input and output.

```bash
paper-workspace mcp --workspace /absolute/project/path
```

The server:

- Initializes `.paper/` when necessary.
- Registers nine tools.
- Does not write logs to standard output.
- Remains alive for the MCP host session.
- Starts the browser app only after `paper_app_open`.

The current implementation targets the stable MCP TypeScript SDK 1.x line rather than the prerelease 2026 protocol line.

## 2. Behavioral contract

MCP makes tools available. The companion skill supplies the required workflow.

The expected sequence for a new meaningful task is:

1. `paper_workspace_bootstrap`
2. `paper_create`
3. Work and periodic `paper_update`
4. `paper_checkpoint`
5. Final status update when complete

A continuation may read and update an existing Paper when the user is clearly resuming the same task.

Tool descriptions repeat the critical behavior because not every host loads companion skills in the same way.

## 3. Tool index

| Tool | Mutates | Expected frequency |
|---|---:|---|
| `paper_workspace_bootstrap` | Initialization only | Start of non-trivial task |
| `paper_create` | Yes | Once per new task |
| `paper_read` | No | As needed |
| `paper_list` | No | As needed |
| `paper_search` | No | Focused retrieval |
| `paper_update` | Yes | Meaningful milestones |
| `paper_checkpoint` | Yes | Pause, handoff, finish |
| `paper_move` | Yes | Rename or organize |
| `paper_app_open` | Starts local server | User wants interface |

## 4. Tool reference

### `paper_workspace_bootstrap`

Open the workspace and retrieve focused context.

Input:

```json
{
  "query": "Implement the Paper browser app",
  "limit": 8
}
```

Fields:

- `query` optional string, maximum 500 characters.
- `limit` integer from 1 to 30, default 8.

Returns:

- Workspace root.
- `.paper` root.
- Folder tree.
- Ranked relevant Papers.
- Reminder to create a new planning Paper.

Do not pass a complete conversation as `query`. Use the user's current goal.

### `paper_create`

Create a new typed Paper.

Input:

```json
{
  "title": "Implement Paper search",
  "project": "paper-workspace",
  "kind": "plan",
  "status": "active",
  "intention": "Find relevant Papers without loading the full workspace.",
  "steps": [
    "Define search fields",
    "Implement local ranking",
    "Validate scoped results"
  ],
  "agent": "codex",
  "tags": ["search", "mcp"]
}
```

Required:

- `title`

Defaults:

- `project`: `workspace`
- `kind`: `plan`
- `status`: `active`

Returns the complete parsed Paper with relative path, metadata, body, and raw representation.

For a new non-trivial task, create the plan before implementation.

### `paper_read`

Read one `.paper`.

Input:

```json
{
  "path": "projects/paper-workspace/papers/example.paper"
}
```

The path is relative to `.paper/`.

Returns:

- Normalized path.
- Parsed metadata.
- Markdown body.
- Raw source.

Use one focused read instead of loading the entire workspace.

### `paper_list`

List the visible workspace tree.

Input:

```json
{}
```

Returns recursive nodes:

```json
{
  "name": "papers",
  "path": "projects/paper-workspace/papers",
  "type": "folder",
  "children": []
}
```

Paper nodes also include title, kind, status, and update time.

Hidden implementation directories such as `.trash` are excluded.

### `paper_search`

Search title, tags, and body.

Input:

```json
{
  "query": "SSE realtime app",
  "limit": 12
}
```

Fields:

- `query` required, maximum 500 characters.
- `limit` integer from 1 to 50, default 12.

Current ranking favors:

1. Title match.
2. Tag match.
3. Body match.

The result includes an excerpt and score. Future indexes may improve ranking without changing the canonical files.

### `paper_update`

Update the active Paper.

Append mode:

```json
{
  "path": "projects/paper-workspace/papers/example.paper",
  "append": "### Activity update\n\nImplemented scoped search."
}
```

Replacement mode:

```json
{
  "path": "projects/paper-workspace/papers/example.paper",
  "content": "# Implement Paper search\n\n## Intention\n\n..."
}
```

Metadata update:

```json
{
  "path": "projects/paper-workspace/papers/example.paper",
  "status": "completed",
  "tags": ["search", "validated"]
}
```

Supported metadata:

- `title`
- `status`
- `tags`
- `agent`

Avoid append updates for noisy tool-by-tool logs. Record meaningful state.

### `paper_checkpoint`

Append a structured continuation checkpoint.

Input:

```json
{
  "path": "projects/paper-workspace/papers/example.paper",
  "summary": "Search is implemented and compiled.",
  "completed": [
    "Added title, tag, and body matching",
    "Added result limits"
  ],
  "validation": [
    "Typecheck passed",
    "MCP smoke test passed"
  ],
  "blockers": [],
  "next": "Add an optional full-text index."
}
```

Required:

- `path`
- `summary`

Use before:

- Final response after material work.
- Pausing.
- Agent handoff.
- Context compaction.

### `paper_move`

Move or rename a Paper or directory.

Input:

```json
{
  "from": "projects/paper/papers/old.paper",
  "to": "projects/paper/archive/renamed.paper"
}
```

Both paths remain scoped to `.paper/`.

The stable Paper `id` does not change.

### `paper_app_open`

Start the optional app server and open the browser.

Input:

```json
{
  "port": 43127
}
```

The default port is `43127`.

Returns:

- Tokenized loopback URL.
- Active port.
- Human-readable instruction.

Repeated calls in the same MCP process return the existing app session.

## 5. Results and errors

Tools return JSON serialized as MCP text content.

Expected errors include:

- Path escapes workspace.
- Non-`.paper` read path.
- Missing Paper.
- Invalid enum.
- Oversized content.
- Port already in use.
- Workspace file removal attempt.

Hosts should present these errors without retrying destructive alternatives.

## 6. Host guidance

### Working directory

Use an absolute `--workspace` path when the host starts MCP servers from a fixed configuration directory.

### Permissions

The server only needs filesystem access to:

- The configured project.
- Its `.paper/` child.
- Temporary sibling files during write.

### Approval behavior

Recommended host policy:

- Read, list, search: normal tool access.
- Create and update Paper: normal project-scoped write access.
- Move Paper: project-scoped write access.
- Open app: explicit user-visible action.

Paper tools do not grant shell or arbitrary project-file access.

### Tool selection

Agents should not call tools merely to satisfy a ritual. Each call should preserve continuity:

- Bootstrap once.
- Create once for a new task.
- Update at milestones.
- Checkpoint at a boundary.

The one firm requirement is that a new non-trivial task receives a new planning Paper before implementation.
