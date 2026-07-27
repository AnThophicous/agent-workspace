# Paper Workspace

**A place where AI work becomes visible, editable, and continuous.**

Paper Workspace gives AI agents a local, human-readable workspace for planning, writing, remembering, and handing work forward. Every new non-trivial task begins in a new `.paper` document. People can open the optional browser app to watch the structure change in real time, read what the agent is doing, and edit the same Papers themselves.

Paper Workspace is model-agnostic, local-first, and built on MCP.

![Paper Workspace mark](web/public/paper-workspace.png)

## Two ways to use Paper

### Paper Core

Install the skill and MCP server. The agent reads and writes `.paper` documents without running a permanent graphical application.

- Very low idle resource use.
- Works from compatible AI agents.
- Uses normal files in the project.
- Does not require Electron, Docker, an account, or a cloud service.

### Paper Workspace | App

Open the optional local interface when you want to see or edit the workspace.

- Opens in the default browser.
- Runs only on `127.0.0.1:43127`.
- Shows the Paper folder tree and active document.
- Updates in real time while an agent writes.
- Saves edits automatically.
- Closes when the local process stops.

The app is an add-on to the same files. It is not a second source of truth.

## The `.paper` format

A `.paper` file is Markdown with typed YAML frontmatter:

```paper
---
paper_version: 1
id: 65c51024-524a-4d3a-86cc-186f910292c6
title: Build the local Paper app
kind: plan
status: active
project: paper-workspace
created_at: '2026-07-24T23:30:00.000Z'
updated_at: '2026-07-24T23:34:00.000Z'
tags:
  - mcp
  - interface
---
# Build the local Paper app

## Intention

Let the user watch and edit agent planning in real time.

## Plan

- [x] Define the `.paper` contract
- [ ] Implement the MCP tools
- [ ] Open the browser app
```

Any text editor can open it. Without Paper Workspace, it remains readable Markdown.

Read the complete [`.paper` format specification](docs/paper-format.md).

## MCP tools

| Tool | Purpose |
|---|---|
| `paper_workspace_bootstrap` | Open relevant workspace context before planning. |
| `paper_create` | Create the required planning Paper for a new task. |
| `paper_read` | Read one Paper with metadata and Markdown. |
| `paper_list` | List the Paper tree. |
| `paper_search` | Find relevant Papers without loading everything. |
| `paper_update` | Keep the active Paper current. |
| `paper_checkpoint` | Leave a compact continuation state. |
| `paper_move` | Move or rename a Paper safely. |
| `paper_app_open` | Open Paper Workspace \| App locally. |

Read the complete [MCP reference](docs/mcp-reference.md).

## Start from source

Requirements:

- Node.js 20 or newer.
- npm 10 or newer.
- An MCP-compatible agent host.

```bash
git clone https://github.com/AnThophicous/agent-worskpace.git
cd agent-worskpace
npm install
npm run build
```

Initialize Paper in a project:

```bash
node /absolute/path/to/agent-worskpace/dist/server/cli.js init \
  --workspace /absolute/path/to/your-project
```

Start the MCP server:

```bash
node /absolute/path/to/agent-worskpace/dist/server/cli.js mcp \
  --workspace /absolute/path/to/your-project
```

Open the app:

```bash
node /absolute/path/to/agent-worskpace/dist/server/cli.js app \
  --workspace /absolute/path/to/your-project
```

The browser opens at a tokenized local URL on port `43127`.

## MCP configuration

Generic JSON configuration:

```json
{
  "mcpServers": {
    "paper-workspace": {
      "command": "node",
      "args": [
        "/absolute/path/to/agent-worskpace/dist/server/cli.js",
        "mcp",
        "--workspace",
        "/absolute/path/to/your-project"
      ]
    }
  }
}
```

Codex-style TOML configuration:

```toml
[mcp_servers.paper-workspace]
command = "node"
args = [
  "/absolute/path/to/agent-worskpace/dist/server/cli.js",
  "mcp",
  "--workspace",
  "/absolute/path/to/your-project"
]
```

See [Agent integration](docs/agent-integration.md) for the skill, host instructions, Windows paths, and expected lifecycle.

## Development

Run the local server and Vite app:

```bash
npm run dev
```

The development UI runs on `43128` and proxies Paper requests to the fixed app port `43127`.

Validate and build:

```bash
npm run typecheck
npm run build
```

Test the MCP surface interactively:

```bash
npm run inspect
```

## Documentation

- [Architecture](docs/architecture.md)
- [`.paper` format](docs/paper-format.md)
- [MCP reference](docs/mcp-reference.md)
- [Paper Workspace \| App](docs/app.md)
- [Agent integration](docs/agent-integration.md)
- [Security model](docs/security.md)

## Principles

- The files belong to the user.
- A new meaningful task starts in a new Paper.
- Current plans are visible instead of trapped in chat.
- Durable memory is selective and sourced.
- Raw transcripts are not automatically treated as truth.
- The graphical app is optional.
- Search indexes are replaceable; `.paper` files are canonical.
- Paper never asks an agent to expose hidden chain-of-thought.
- Paper never stores secrets intentionally.

## License

MIT
