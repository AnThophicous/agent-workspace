# Paper Workspace architecture

## Contents

1. Product boundaries
2. Runtime modes
3. Component map
4. Storage model
5. Write and event flow
6. Failure behavior
7. Portability
8. Future extensions

## 1. Product boundaries

Paper Workspace is a local coordination layer between a person, one or more AI agents, and a normal project directory.

It owns:

- The `.paper/` directory.
- The `.paper` document contract.
- Safe filesystem operations inside that directory.
- MCP tools that expose those operations.
- The optional local browser interface.
- Realtime change notifications.

It does not own:

- The user's source code.
- The AI model or provider.
- The agent's conversation history.
- Hidden model reasoning.
- Authentication to third-party services.
- Cloud synchronization.
- A proprietary database required to read the workspace.

The boundary is deliberate. Paper should remain useful when the app is closed, the MCP server is replaced, or the user changes agent hosts.

## 2. Runtime modes

### MCP mode

```bash
paper-workspace mcp --workspace /project
```

The process communicates over standard input and output using MCP. It does not start the browser app unless the agent calls `paper_app_open`.

Requirements:

- JSON-RPC messages are the only standard-output content.
- Diagnostics go to standard error.
- The process stays scoped to the configured workspace.
- Tool calls validate both data and paths.

### App mode

```bash
paper-workspace app --workspace /project
```

The process starts an HTTP server on loopback, creates an ephemeral access token, and opens a browser.

The app mode exposes:

- Static React assets.
- A small JSON API.
- A Server-Sent Events stream.
- The same `PaperStore` used by MCP mode.

### Init mode

```bash
paper-workspace init --workspace /project
```

The process creates the minimum workspace structure and exits.

Initialization is idempotent. Existing Papers are not rewritten.

## 3. Component map

### CLI

`src/server/cli.ts`

- Parses `mcp`, `app`, and `init`.
- Resolves workspace and port settings.
- Keeps MCP standard output clean.
- Handles graceful app shutdown.

### PaperStore

`src/server/store.ts`

- Resolves `.paper/` paths.
- Rejects path traversal.
- Creates and parses Papers.
- Performs temporary-file writes followed by rename.
- Lists the tree.
- Searches readable content.
- Moves nodes.
- Moves deleted nodes to `.trash/`.
- Emits normalized change events.

### Paper format

`src/server/format.ts`

- Normalizes titles and project slugs.
- Produces ordered frontmatter.
- Applies default metadata.
- Keeps the body as Markdown.
- Recovers reasonable defaults from partially valid files.

### MCP server

`src/server/mcp.ts`

- Registers the public agent tool surface.
- Encodes the planning lifecycle in descriptions.
- Returns structured JSON as MCP text content.
- Starts the optional app only when requested.

### App server

`src/server/app.ts`

- Binds only to `127.0.0.1`.
- Enforces an ephemeral bearer token.
- Serves the built React app.
- Exposes Paper API routes.
- Streams change events with SSE.

### React app

`web/src/`

- Renders the folder tree as a continuous sidebar.
- Opens the selected Paper in the main reading surface.
- Switches between rendered Markdown and direct editing.
- Autosaves edits.
- Responds to SSE changes.
- Shows only user-meaningful state.

## 4. Storage model

```text
project/
└── .paper/
    ├── workspace.paper
    ├── projects/
    │   └── paper-workspace/
    │       └── papers/
    │           └── 2026-07-24T...-build-the-app.paper
    └── .trash/
```

### Canonical state

`.paper` files and directories are canonical.

### Derived state

Future full-text indexes, graph stores, caches, thumbnails, and embeddings must be rebuildable from canonical files. Derived state must never become the only place where user content exists.

### Workspace Paper

`workspace.paper` identifies the workspace and records durable top-level context. It cannot be deleted through the app.

### Project Papers

Each project has a `papers/` directory. A new task receives a new Paper rather than appending unrelated work to a global log.

## 5. Write and event flow

### Agent write

1. Agent host calls an MCP tool.
2. MCP validates the arguments.
3. `PaperStore` resolves the destination within `.paper/`.
4. The new content is written to a sibling temporary file.
5. Rename publishes the completed file.
6. `PaperStore` emits a normalized event.
7. App server publishes the event through SSE.
8. React refreshes the tree and active Paper.

### User write

1. User edits Markdown in the browser.
2. The editor waits briefly for a pause.
3. The app sends the full body and title to the local API.
4. The API validates size and shape.
5. `PaperStore` writes the document.
6. The same event path updates every open local view.

### External editor write

1. A text editor changes a `.paper` file.
2. Chokidar waits for the write to settle.
3. `PaperStore` emits an `external` event.
4. The app refreshes the affected Paper.

Internal-write markers prevent the watcher from producing duplicate user-visible events for writes already emitted by `PaperStore`.

## 6. Failure behavior

### Invalid frontmatter

The parser recovers safe defaults where possible:

- Missing identifiers receive a temporary generated identifier in memory.
- Missing title falls back to the first H1.
- Unknown kind becomes `note`.
- Unknown status becomes `draft`.

The parser does not silently rewrite the file merely because it was read.

### Invalid path

Any resolved path outside `.paper/` fails before filesystem access.

### Port collision

Paper App does not choose a surprising random port. It reports that `43127` is in use. The caller may explicitly request another port.

### Browser unavailable

The server remains usable. Its tokenized local URL is returned by the MCP tool or printed to standard error in app mode.

### App build missing

The JSON API remains diagnosable, and the root returns an instruction to build the app.

### Interrupted write

The temporary file may remain only if the process terminates between the initial write and rename. The canonical Paper is not partially overwritten.

## 7. Portability

Paper uses:

- Node.js filesystem APIs.
- POSIX-style relative paths in public data.
- Platform-native absolute paths internally.
- UTF-8 text.
- ISO 8601 timestamps.
- Markdown and YAML-compatible frontmatter.

The design targets Windows, macOS, and Linux.

Workspace paths passed to the CLI should be absolute when the MCP host may start servers from an unpredictable working directory.

## 8. Future extensions

Extensions should preserve the canonical contract.

Appropriate additions:

- SQLite FTS index.
- Optional local embeddings.
- Explicit Paper-to-Paper links.
- Conflict-aware multi-agent presence.
- Version history.
- Git-aware checkpoints.
- Import from Markdown vaults.
- Export to plain Markdown.
- Browser drag and drop.
- Host-specific installers.

Inappropriate additions:

- Requiring a cloud database to open local Papers.
- Saving raw chain-of-thought.
- Hiding user content in an opaque cache.
- Letting a plugin escape the configured workspace.
- Turning the app into a generic IDE or analytics dashboard.
