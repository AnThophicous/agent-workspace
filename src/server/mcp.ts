import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PAPER_APP_PORT, startPaperApp, type PaperAppHandle } from "./app.js";
import { PaperStore } from "./store.js";
import { PAPER_KINDS, PAPER_STATUSES } from "./types.js";

const asToolResult = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(value, null, 2),
    },
  ],
});

export async function runPaperMcp(workspaceRoot: string): Promise<void> {
  const store = new PaperStore(workspaceRoot);
  await store.initialize();
  let appHandle: PaperAppHandle | undefined;

  const server = new McpServer({
    name: "paper-workspace",
    version: "0.1.0",
  });

  server.registerTool(
    "paper_workspace_bootstrap",
    {
      title: "Open Paper Workspace",
      description:
        "Call this before planning any non-trivial task. It initializes the local Paper workspace and returns the current structure plus relevant Papers. A new task must then receive its own planning Paper through paper_create.",
      inputSchema: {
        query: z
          .string()
          .max(500)
          .optional()
          .describe("The user's current goal or a short retrieval query."),
        limit: z.number().int().min(1).max(30).default(8),
      },
    },
    async ({ query, limit }) =>
      asToolResult({
        workspace: {
          root: store.workspaceRoot,
          paperRoot: store.dataRoot,
        },
        tree: await store.listTree(),
        relevant: query ? await store.search(query, limit) : [],
        instruction:
          "For a new non-trivial task, call paper_create before doing the work.",
      }),
  );

  server.registerTool(
    "paper_create",
    {
      title: "Create a new Paper",
      description:
        "Create the required planning Paper for a new non-trivial task before acting. Use one new Paper per new task. Use other kinds only for durable notes, decisions, memories, or checkpoints that need their own document.",
      inputSchema: {
        title: z.string().min(1).max(180),
        project: z.string().max(100).default("workspace"),
        kind: z.enum(PAPER_KINDS).default("plan"),
        status: z.enum(PAPER_STATUSES).default("active"),
        intention: z.string().max(8_000).optional(),
        steps: z.array(z.string().max(500)).max(80).optional(),
        agent: z.string().max(120).optional(),
        tags: z.array(z.string().max(60)).max(20).optional(),
      },
    },
    async (input) => asToolResult(await store.createPaper(input)),
  );

  server.registerTool(
    "paper_read",
    {
      title: "Read a Paper",
      description:
        "Read one .paper document with its typed metadata and Markdown body. Prefer this over loading the entire workspace.",
      inputSchema: {
        path: z.string().min(1).describe("Path relative to the .paper folder."),
      },
    },
    async ({ path }) => asToolResult(await store.readPaper(path)),
  );

  server.registerTool(
    "paper_list",
    {
      title: "List Papers",
      description:
        "List the human-readable Paper folder tree. Use it to orient before selecting a specific Paper.",
      inputSchema: {},
    },
    async () => asToolResult({ nodes: await store.listTree() }),
  );

  server.registerTool(
    "paper_search",
    {
      title: "Search Papers",
      description:
        "Search Paper titles, tags, and Markdown content. Use a focused query and read only the most relevant results.",
      inputSchema: {
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(50).default(12),
      },
    },
    async ({ query, limit }) =>
      asToolResult({ results: await store.search(query, limit) }),
  );

  server.registerTool(
    "paper_update",
    {
      title: "Write in a Paper",
      description:
        "Keep the active planning Paper current while working. Append concise activity or replace the Markdown body; update status only when the task state changes. Never store secrets or hidden chain-of-thought.",
      inputSchema: {
        path: z.string().min(1),
        content: z
          .string()
          .max(2_000_000)
          .optional()
          .describe("Complete replacement Markdown body."),
        append: z
          .string()
          .max(100_000)
          .optional()
          .describe("Markdown to append to the current body."),
        title: z.string().min(1).max(180).optional(),
        status: z.enum(PAPER_STATUSES).optional(),
        tags: z.array(z.string().max(60)).max(20).optional(),
        agent: z.string().max(120).optional(),
      },
    },
    async ({ path, content, append, title, status, tags, agent }) =>
      asToolResult(
        await store.updatePaper(path, {
          ...(content !== undefined ? { content } : {}),
          ...(append !== undefined ? { append } : {}),
          metadata: {
            ...(title !== undefined ? { title } : {}),
            ...(status !== undefined ? { status } : {}),
            ...(tags !== undefined ? { tags } : {}),
            ...(agent !== undefined ? { agent } : {}),
          },
        }),
      ),
  );

  server.registerTool(
    "paper_checkpoint",
    {
      title: "Checkpoint a Paper",
      description:
        "Call before pausing, handing off, or finishing material work. Leave a compact continuation state in the active Paper: what changed, what was checked, blockers, and the next action.",
      inputSchema: {
        path: z.string().min(1),
        summary: z.string().min(1).max(8_000),
        completed: z.array(z.string().max(500)).max(50).optional(),
        blockers: z.array(z.string().max(500)).max(30).optional(),
        validation: z.array(z.string().max(500)).max(50).optional(),
        next: z.string().max(2_000).optional(),
      },
    },
    async ({ path, ...checkpoint }) =>
      asToolResult(await store.checkpoint(path, checkpoint)),
  );

  server.registerTool(
    "paper_move",
    {
      title: "Move a Paper",
      description:
        "Move or rename a Paper or folder inside the Paper workspace while preserving its contents.",
      inputSchema: {
        from: z.string().min(1).max(500),
        to: z.string().min(1).max(500),
      },
    },
    async ({ from, to }) =>
      asToolResult({ path: await store.moveNode(from, to) }),
  );

  server.registerTool(
    "paper_app_open",
    {
      title: "Open Paper Workspace | App",
      description:
        "Open the optional local Paper Workspace interface in the user's browser. It shows the Paper tree and live agent writing without exposing technical runtime data.",
      inputSchema: {
        port: z
          .number()
          .int()
          .min(1_024)
          .max(65_535)
          .default(PAPER_APP_PORT),
      },
    },
    async ({ port }) => {
      if (!appHandle) {
        appHandle = await startPaperApp({
          store,
          port,
          openBrowser: true,
        });
      }
      return asToolResult({
        url: appHandle.url,
        port: appHandle.port,
        instruction: "The interface is running locally in the browser.",
      });
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
