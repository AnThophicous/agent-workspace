# Paper Workspace | App

## Contents

1. Purpose
2. Starting the app
3. Interface model
4. Realtime behavior
5. Editing behavior
6. Local API
7. Accessibility and motion
8. Resource behavior
9. Development

## 1. Purpose

Paper Workspace | App is a temporary local window into the same `.paper` files used by the MCP server.

It is intentionally not:

- An Electron application.
- A full code editor.
- An agent runtime dashboard.
- A token, latency, or provider analytics screen.
- A second storage layer.

The person should see only what matters:

- Where the agent is working.
- What Papers exist.
- What the active Paper says.
- Whether the agent is writing.
- Whether the user's edit is saved.

## 2. Starting the app

From the command line:

```bash
paper-workspace app --workspace /absolute/project/path
```

From an AI agent:

```text
paper_app_open
```

Default address:

```text
http://127.0.0.1:43127/
```

The actual opened URL includes an ephemeral token. Do not bookmark or share it.

Options:

```text
--workspace <path>  Project that owns .paper/
--port <number>     Explicit alternate port
--no-open           Start without launching a browser
--token <value>     Development/testing token
```

## 3. Interface model

### Sidebar

The sidebar is attached to the application edge. It is not a floating card.

It contains:

- Paper mark and workspace name.
- Compact search.
- Project and Paper tree.
- New Paper and new folder actions.
- Local live-state indication.

Folders and rows may be rounded because they are interactive controls with hover and selected states. The sidebar itself remains rectangular and connected to the main surface.

### Main surface

The selected Paper is the visual protagonist.

The surface contains:

- A thin location line.
- A subtle writing or save state.
- One edit control.
- Rendered Markdown or the direct editor.

There are no decorative metric cards, technical logs, onboarding banners, or secondary panels competing with the Paper.

### Mobile

On narrow screens:

- The sidebar becomes an edge drawer.
- The document remains the primary surface.
- The topbar preserves editing and state.
- The layout order remains Paper-first.

## 4. Realtime behavior

The app uses Server-Sent Events because Paper updates are primarily server-to-browser notifications.

Events include:

- `created`
- `updated`
- `moved`
- `trashed`
- `external`

On an event:

- The tree refreshes.
- The active Paper refreshes when its path matches.
- A short “AI is writing” state appears.

The interface does not animate every character. It reflects meaningful write boundaries, which is calmer and substantially cheaper.

## 5. Editing behavior

The edit control switches the active Paper between:

- Rendered Markdown.
- Plain Markdown editing.

Changes:

- Remain in local component state immediately.
- Autosave after a short pause.
- Update the `.paper` file through the local API.
- Preserve typed frontmatter.
- Emit the same event stream used by agent writes.

The title is edited separately from the Markdown body because it is canonical metadata.

Deletion in the UI means moving to `.paper/.trash/`. It is recoverable from the filesystem.

## 6. Local API

Every mutation requires the ephemeral session token.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Local health check without content. |
| `GET` | `/api/workspace` | Workspace display information. |
| `GET` | `/api/tree` | Paper tree. |
| `GET` | `/api/paper?path=` | One parsed Paper. |
| `GET` | `/api/search?q=` | Local text search. |
| `POST` | `/api/papers` | Create a Paper. |
| `PUT` | `/api/papers` | Update a Paper. |
| `POST` | `/api/folders` | Create a folder. |
| `POST` | `/api/move` | Move or rename a node. |
| `DELETE` | `/api/node?path=` | Move a node to trash. |
| `GET` | `/events?token=` | SSE change stream. |

The API is an implementation surface for the bundled app, not a remote network API.

## 7. Accessibility and motion

### Keyboard and focus

- Buttons use native button semantics.
- Tree rows expose tree item state.
- Dialogs use Radix focus management.
- Visible focus rings are preserved.
- Form fields carry labels.

### Motion

Motion communicates:

- Sidebar opening.
- Folder expansion.
- Document replacement.
- Save/writing state replacement.
- Dialog entry.

Curves favor quick Apple-like deceleration:

```ts
ease: [0.22, 1, 0.36, 1]
```

Most transitions remain between 140 and 320 milliseconds.

`prefers-reduced-motion` collapses animation and preserves state changes.

## 8. Resource behavior

When the app is closed:

- No web interface process is required.
- The MCP server can continue without starting it.
- `.paper` files remain available to the agent and user.

When the app is open:

- One Node.js process serves static files and the API.
- One browser tab renders React.
- No Electron runtime is duplicated.
- No polling loop repeatedly loads the entire workspace.
- SSE remains idle between change events.

## 9. Development

```bash
npm run dev
```

Development ports:

- API and events: `43127`
- Vite: `43128`

Production build:

```bash
npm run build
node dist/server/cli.js app --workspace ./examples/workspace
```

Visual constraints:

- Maintain a continuous page shell.
- Do not detach the sidebar.
- Do not add empty dashboard cards.
- Do not expose runtime metrics by default.
- Keep the active Paper dominant.
- Use icons only in controls.
- Treat rounding as interaction affordance, not global decoration.
