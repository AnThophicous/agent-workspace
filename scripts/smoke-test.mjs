import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PaperStore } from "../dist/server/store.js";

const workspace = await mkdtemp(path.join(tmpdir(), "paper-workspace-test-"));
const store = new PaperStore(workspace);

try {
  await store.initialize();

  const created = await store.createPaper({
    title: "Verify the Paper lifecycle",
    project: "paper-tests",
    kind: "plan",
    intention: "Prove that a Paper remains readable and resumable.",
    steps: ["Create", "Update", "Checkpoint", "Move"],
  });

  assert.equal(created.metadata.kind, "plan");
  assert.match(created.path, /\.paper$/);

  const updated = await store.updatePaper(created.path, {
    append: "### Activity update\n\nThe write path works.",
  });
  assert.match(updated.content, /The write path works/);

  const checkpointed = await store.checkpoint(created.path, {
    summary: "Core lifecycle works.",
    completed: ["Created and updated the Paper"],
    validation: ["Parsed typed frontmatter"],
    next: "Move the Paper.",
  });
  assert.match(checkpointed.content, /Core lifecycle works/);

  const results = await store.search("lifecycle");
  assert.ok(results.some((result) => result.path === created.path));

  const movedPath = "projects/paper-tests/papers/moved-paper.paper";
  await store.moveNode(created.path, movedPath);
  const moved = await store.readPaper(movedPath);
  assert.equal(moved.metadata.id, created.metadata.id);

  const raw = await readFile(
    path.join(workspace, ".paper", movedPath),
    "utf8",
  );
  assert.match(raw, /^---\n/);
  assert.match(raw, /paper_version: 1/);

  const tree = await store.listTree();
  assert.ok(tree.length > 0);

  process.stdout.write("Paper Workspace smoke test passed.\n");
} finally {
  await store.stopWatching();
  await rm(workspace, { recursive: true, force: true });
}
