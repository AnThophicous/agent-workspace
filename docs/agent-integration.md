# Agent integration

## Contents

1. Required pieces
2. Companion skill
3. MCP registration
4. Expected agent behavior
5. Host instruction fallback
6. Windows notes
7. Troubleshooting

## 1. Required pieces

The minimal Paper installation has two pieces:

1. Paper Workspace MCP server.
2. Paper Workspace companion skill or equivalent host instruction.

The MCP provides capability. The skill provides behavior.

Installing only the MCP lets the agent use Papers but does not guarantee that it will plan in them proactively.

Installing only the skill teaches the lifecycle but leaves no safe structured tool interface unless the host can edit an existing `.paper/` directly.

Paper Workspace | App is optional.

## 2. Companion skill

The canonical skill is in:

```text
skill/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    └── paper-protocol.md
```

Its trigger description intentionally says to use Paper proactively for non-trivial work even when the user does not name Paper Workspace.

Core rule:

> Create a new planning Paper before acting on every new non-trivial task.

A task is non-trivial when it has one or more of:

- Multiple meaningful steps.
- File or system changes.
- Research that should survive the chat.
- A decision with lasting project impact.
- Likely pause, continuation, or handoff.
- Validation work.

A short factual answer, casual conversation, or throwaway transformation does not need a Paper.

## 3. MCP registration

### Generic JSON

```json
{
  "mcpServers": {
    "paper-workspace": {
      "command": "node",
      "args": [
        "C:/absolute/path/agent-worskpace/dist/server/cli.js",
        "mcp",
        "--workspace",
        "C:/absolute/path/project"
      ]
    }
  }
}
```

### TOML

```toml
[mcp_servers.paper-workspace]
command = "node"
args = [
  "C:/absolute/path/agent-worskpace/dist/server/cli.js",
  "mcp",
  "--workspace",
  "C:/absolute/path/project"
]
```

### Per-project registration

Prefer a per-project workspace path. A single global `.paper/` causes unrelated work to compete during retrieval.

### Global registration

When the host supports dynamic current working directories reliably, the workspace may be `.`. Verify the server actually starts inside the active project before relying on this.

## 4. Expected agent behavior

### New task

1. Call `paper_workspace_bootstrap` with the current goal.
2. Review only relevant returned context.
3. Call `paper_create` with kind `plan`.
4. Put the goal, constraints, and meaningful steps in the Paper.
5. Perform the work.
6. Update the Paper at milestones.
7. Call `paper_checkpoint` before the final answer.
8. Mark completed when the outcome is actually complete.

### Continuation

1. Bootstrap with the resumed goal.
2. Search or read the existing active Paper.
3. Continue that Paper rather than creating a duplicate.
4. Reconcile old steps with the user's new instruction.
5. Add a new checkpoint.

### Decision

Record a separate decision Paper only when the choice deserves independent retrieval or may supersede earlier policy. Otherwise place the decision and rationale inside the active plan.

### Memory

Promote only stable, sourced knowledge.

Do not store:

- Secrets.
- Complete conversations.
- Tool output dumps.
- Unverified guesses.
- Hidden reasoning.
- Personal information irrelevant to the project.

## 5. Host instruction fallback

If a host does not support skills, add a project instruction:

```markdown
## Paper Workspace

For every new non-trivial task:

1. Call `paper_workspace_bootstrap` before planning.
2. Create a new planning Paper with `paper_create` before acting.
3. Keep that Paper current after meaningful progress.
4. Record decisions and durable knowledge concisely.
5. Call `paper_checkpoint` before pausing, handing off, or replying after material work.
6. Never store secrets or hidden chain-of-thought.

When clearly continuing the same task, resume its active Paper instead of creating a duplicate.
```

Tool descriptions repeat these instructions as a second layer. The strongest guarantee comes from a host runtime that automatically injects the skill and calls bootstrap before the first model turn.

## 6. Windows notes

Use forward slashes in JSON and TOML paths when escaping backslashes becomes inconvenient:

```json
"C:/Users/Elaine/Documents/agent-worskpace/dist/server/cli.js"
```

Quoted backslashes must be doubled in JSON:

```json
"C:\\Users\\Elaine\\Documents\\agent-worskpace\\dist\\server\\cli.js"
```

The browser app still binds to:

```text
127.0.0.1:43127
```

Windows Firewall should not require public-network access because Paper binds only to loopback.

## 7. Troubleshooting

### Agent sees no Paper tools

- Confirm the MCP server command uses the built `dist/server/cli.js`.
- Run `npm run build`.
- Use an absolute script path.
- Confirm Node.js 20 or newer.
- Check the host's MCP logs for standard-error output.

### JSON-RPC breaks immediately

The MCP process must not write logs to standard output. Paper writes MCP mode diagnostics only to standard error.

### Agent ignores Paper

- Install the companion skill.
- Confirm implicit skill invocation is enabled.
- Add the fallback host instruction.
- Inspect whether the host exposes tool descriptions to the model.

### Duplicate Papers

The agent likely failed to distinguish a continuation from a new task. Search for an active Paper with the same project and goal before creating.

### App does not open

Run:

```bash
paper-workspace app --workspace /project --no-open
```

Copy the printed local URL into the browser.

### Port already used

Identify the existing local process or request an explicit alternate port:

```bash
paper-workspace app --workspace /project --port 43129
```

The MCP tool also accepts an explicit port.
