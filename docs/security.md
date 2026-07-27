# Security model

## Contents

1. Threat boundary
2. Filesystem containment
3. Browser app isolation
4. Data minimization
5. Deletion and recovery
6. MCP transport
7. Known limitations
8. Reporting

## 1. Threat boundary

Paper Workspace is a local project tool. It assumes:

- The user chooses the workspace directory.
- The MCP host is allowed to invoke Paper tools.
- Other processes running as the same operating-system user may already access the user's files.

Paper reduces accidental scope expansion. It is not a security sandbox for an untrusted local operating-system account.

## 2. Filesystem containment

Every public Paper path is resolved under the configured `.paper/` root.

The store:

1. Converts backslashes to public `/` separators.
2. Removes leading separators.
3. Resolves the absolute target.
4. Verifies the result equals the data root or begins with its separator boundary.
5. Rejects escape attempts.

Examples rejected:

```text
../../secrets.txt
projects/paper/../../../outside.paper
C:\outside\file.paper
```

Paper read operations also require the `.paper` extension.

The app does not expose arbitrary project source files.

## 3. Browser app isolation

### Loopback binding

The app binds to:

```text
127.0.0.1
```

It does not listen on:

- `0.0.0.0`
- LAN interfaces
- Public interfaces

### Ephemeral token

Each app session receives a random token unless an explicit development token is supplied.

The token:

- Appears in the initial local URL.
- Moves into browser session storage.
- Is removed from the visible address.
- Is required for API mutations and content reads.
- Expires when the server process ends.

The health endpoint exposes no workspace content.

### Browser headers

The app sends:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `X-Frame-Options: DENY`
- A restrictive Content Security Policy

Google Fonts are the only allowed remote style and font origins in the current interface. A future fully offline font bundle may remove those origins.

## 4. Data minimization

Paper Workspace is not a secret store.

Agents are instructed not to persist:

- API keys.
- Access tokens.
- Passwords.
- Private keys.
- Session cookies.
- Hidden chain-of-thought.
- Irrelevant personal data.

The application currently relies on behavioral rules rather than a complete secret scanner. Users should still review Papers before committing `.paper/` to Git.

Recommended future defense:

- Secret-pattern detection before write.
- Configurable deny patterns.
- Sensitive Paper scopes excluded from Git.
- Optional approval for durable memory.

## 5. Deletion and recovery

Browser deletion moves content to:

```text
.paper/.trash/
```

This is recoverable from the filesystem.

The workspace Paper cannot be removed through the API.

Permanent trash deletion is intentionally absent from the v0 MCP tool surface.

## 6. MCP transport

The current server uses stdio.

Advantages:

- No listening network port for normal MCP use.
- Process lifecycle is controlled by the host.
- Workspace arguments are explicit.

Critical rule:

- MCP mode must never write non-protocol data to standard output.

The optional browser server is started separately or by an explicit tool call.

## 7. Known limitations

### Symlink traversal

The current lexical path boundary prevents `..` escape. A malicious symlink created inside `.paper/` may still reference an external location before a write.

Before treating Paper as a hardened untrusted-agent sandbox, implement realpath-based boundary checks and reject symlink traversal.

### Same-user processes

Other processes running as the same user can inspect `.paper/` and may inspect local process arguments. The ephemeral token is protection against accidental browser-origin access, not a same-user privilege boundary.

### Frontmatter size

HTTP bodies are limited, but direct filesystem edits may create very large files. Future readers should add configurable maximum file sizes.

### Concurrent writers

Atomic replacement prevents partial files but does not merge simultaneous edits. The last completed write wins.

Future conflict control should use:

- Content revision identifiers.
- Optimistic concurrency.
- Explicit conflict Papers.

### Google Fonts

The UI currently loads Inter from Google Fonts. Organizations requiring fully offline operation should bundle the font or override the stylesheet.

## 8. Reporting

Security reports should include:

- Paper Workspace version.
- Operating system and Node.js version.
- Exact command mode.
- Minimal reproduction.
- Whether symlinks are involved.
- Whether the issue requires another process under the same user account.

Do not include real secrets or private `.paper` contents in public issues. Use synthetic examples.
