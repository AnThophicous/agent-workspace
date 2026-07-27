import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type Server as HttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import open from "open";
import { z } from "zod";
import { PaperStore } from "./store.js";
import { PAPER_KINDS, PAPER_STATUSES } from "./types.js";

export const PAPER_APP_PORT = 43_127;
const LOOPBACK = "127.0.0.1";

const createPaperInput = z.object({
  title: z.string().min(1).max(180),
  project: z.string().max(100).optional(),
  kind: z.enum(PAPER_KINDS).optional(),
  status: z.enum(PAPER_STATUSES).optional(),
  agent: z.string().max(120).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  intention: z.string().max(8_000).optional(),
  steps: z.array(z.string().max(500)).max(80).optional(),
});

const updatePaperInput = z.object({
  path: z.string().min(1),
  content: z.string().max(2_000_000).optional(),
  append: z.string().max(100_000).optional(),
  metadata: z
    .object({
      title: z.string().min(1).max(180).optional(),
      status: z.enum(PAPER_STATUSES).optional(),
      tags: z.array(z.string().max(60)).max(20).optional(),
      agent: z.string().max(120).optional(),
    })
    .optional(),
});

export interface PaperAppOptions {
  store: PaperStore;
  port?: number;
  token?: string;
  openBrowser?: boolean;
}

export interface PaperAppHandle {
  url: string;
  port: number;
  token: string;
  close: () => Promise<void>;
}

export async function startPaperApp(
  options: PaperAppOptions,
): Promise<PaperAppHandle> {
  const port = options.port ?? PAPER_APP_PORT;
  const token = options.token ?? randomBytes(24).toString("base64url");
  const app = express();
  const httpServer = createServer(app);
  const clients = new Set<Response>();

  await options.store.initialize();
  await options.store.startWatching();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; script-src 'self'",
    );
    next();
  });

  const authorize = (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    const bearer = request.header("authorization")?.replace(/^Bearer\s+/i, "");
    const queryToken =
      typeof request.query.token === "string" ? request.query.token : undefined;
    if (bearer !== token && queryToken !== token) {
      response.status(401).json({ error: "Paper App session expired." });
      return;
    }
    next();
  };

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, name: "Paper Workspace" });
  });

  app.use("/api", authorize);
  app.get("/api/workspace", async (_request, response, next) => {
    try {
      response.json({
        name: path.basename(options.store.workspaceRoot),
        root: options.store.workspaceRoot,
        paperRoot: options.store.dataRoot,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tree", async (_request, response, next) => {
    try {
      response.json({ nodes: await options.store.listTree() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/paper", async (request, response, next) => {
    try {
      const paperPath = z.string().min(1).parse(request.query.path);
      response.json(await options.store.readPaper(paperPath));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/search", async (request, response, next) => {
    try {
      const query = z.string().max(500).parse(request.query.q ?? "");
      response.json({ results: await options.store.search(query) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/papers", async (request, response, next) => {
    try {
      const input = createPaperInput.parse(request.body);
      response.status(201).json(await options.store.createPaper(input));
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/papers", async (request, response, next) => {
    try {
      const input = updatePaperInput.parse(request.body);
      response.json(
        await options.store.updatePaper(input.path, {
          ...(input.content !== undefined ? { content: input.content } : {}),
          ...(input.append !== undefined ? { append: input.append } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/folders", async (request, response, next) => {
    try {
      const input = z
        .object({ path: z.string().min(1).max(500) })
        .parse(request.body);
      response.status(201).json({
        path: await options.store.createFolder(input.path),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/move", async (request, response, next) => {
    try {
      const input = z
        .object({
          from: z.string().min(1).max(500),
          to: z.string().min(1).max(500),
        })
        .parse(request.body);
      response.json({
        path: await options.store.moveNode(input.from, input.to),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/node", async (request, response, next) => {
    try {
      const nodePath = z.string().min(1).parse(request.query.path);
      response.json({
        trashedPath: await options.store.trashNode(nodePath),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/events", authorize, (request, response) => {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    response.write(`event: ready\ndata: {"ok":true}\n\n`);
    clients.add(response);

    const heartbeat = setInterval(() => {
      response.write(`: paper-heartbeat\n\n`);
    }, 20_000);

    request.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(response);
    });
  });

  const removePaperListener = options.store.onEvent((event) => {
    const payload = JSON.stringify(event);
    for (const client of clients) {
      client.write(`event: paper\ndata: ${payload}\n\n`);
    }
  });

  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const appDirectory = path.resolve(moduleDirectory, "..", "app");
  if (existsSync(appDirectory)) {
    app.use(express.static(appDirectory, { index: false }));
    app.get(/.*/, async (_request, response, next) => {
      try {
        response
          .type("html")
          .send(await readFile(path.join(appDirectory, "index.html"), "utf8"));
      } catch (error) {
        next(error);
      }
    });
  } else {
    app.get("/", (_request, response) => {
      response
        .status(503)
        .type("text")
        .send("Paper Workspace App is not built. Run npm run build.");
    });
  }

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      const message =
        error instanceof Error ? error.message : "Unexpected Paper error.";
      response.status(error instanceof z.ZodError ? 400 : 500).json({
        error: message,
      });
    },
  );

  await listen(httpServer, port);
  const url = `http://${LOOPBACK}:${port}/?token=${encodeURIComponent(token)}`;

  if (options.openBrowser !== false) {
    await open(url);
  }

  return {
    url,
    port,
    token,
    close: async () => {
      removePaperListener();
      for (const client of clients) client.end();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
      await options.store.stopWatching();
    },
  };
}

function listen(server: HttpServer, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleError = (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Paper Workspace App could not start because port ${port} is already in use.`,
          ),
        );
      } else {
        reject(error);
      }
    };
    server.once("error", handleError);
    server.listen(port, LOOPBACK, () => {
      server.off("error", handleError);
      resolve();
    });
  });
}
