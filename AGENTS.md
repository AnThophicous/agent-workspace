# Paper Workspace development rules

- Keep Paper Workspace independent from any model provider, IDE, or agent runtime.
- Treat `.paper` as Markdown with typed frontmatter, not as a proprietary binary format.
- Keep `.paper/` human-readable; indexes and caches must be rebuildable.
- Require a new planning Paper for every new non-trivial task.
- Keep MCP tool descriptions strong enough to trigger proactive use.
- Bind the browser app to loopback and protect mutations with an ephemeral token.
- Use atomic writes and reject paths that escape the workspace.
- Never persist credentials, private keys, access tokens, or hidden chain-of-thought.
- Preserve provenance, scope, timestamps, uncertainty, and supersession.
- Keep the interface visually continuous: no floating sidebar, detached page shell, card grids, gradients, or decorative technical data.
- Use Untitled UI icons, Radix primitives, Google Fonts, and purposeful Motion transitions.
- Update the documentation and the skill contract whenever public behavior changes.
