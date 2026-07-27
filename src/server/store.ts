import { EventEmitter } from "node:events";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import chokidar, { type FSWatcher } from "chokidar";
import {
  createPaperBody,
  createPaperMetadata,
  parsePaper,
  slugify,
  stringifyPaper,
} from "./format.js";
import type {
  CreatePaperInput,
  PaperDocument,
  PaperEvent,
  PaperMetadata,
  PaperTreeNode,
  SearchResult,
} from "./types.js";

const WORKSPACE_FILE = "workspace.paper";

export class PaperStore {
  readonly workspaceRoot: string;
  readonly dataRoot: string;
  readonly events = new EventEmitter();
  #watcher?: FSWatcher;
  #internalChanges = new Set<string>();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.dataRoot =
      path.basename(this.workspaceRoot) === ".paper"
        ? this.workspaceRoot
        : path.join(this.workspaceRoot, ".paper");
  }

  async initialize(): Promise<void> {
    await mkdir(path.join(this.dataRoot, "projects"), { recursive: true });
    await mkdir(path.join(this.dataRoot, ".trash"), { recursive: true });

    const workspacePath = path.join(this.dataRoot, WORKSPACE_FILE);
    try {
      await stat(workspacePath);
    } catch {
      const metadata = createPaperMetadata({
        title: path.basename(this.workspaceRoot) || "Paper Workspace",
        project: "workspace",
        kind: "workspace",
        status: "active",
        tags: ["paper-workspace"],
      });
      const body = [
        `# ${metadata.title}`,
        "",
        "This workspace is shared by people and AI agents.",
        "",
        "Every new non-trivial task begins in a new planning Paper.",
        "",
      ].join("\n");
      await this.atomicWrite(
        workspacePath,
        stringifyPaper(metadata, body),
      );
    }
  }

  async startWatching(): Promise<void> {
    if (this.#watcher) return;

    this.#watcher = chokidar.watch(this.dataRoot, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 120,
        pollInterval: 30,
      },
      ignored: (watchedPath) =>
        watchedPath.includes(`${path.sep}.trash${path.sep}`),
    });

    const emitExternal = (absolutePath: string) => {
      const normalized = path.resolve(absolutePath);
      if (this.#internalChanges.delete(normalized)) return;
      this.emit({
        type: "external",
        path: this.toRelative(normalized),
        at: new Date().toISOString(),
      });
    };

    this.#watcher
      .on("add", emitExternal)
      .on("change", emitExternal)
      .on("unlink", emitExternal)
      .on("addDir", emitExternal)
      .on("unlinkDir", emitExternal);
  }

  async stopWatching(): Promise<void> {
    await this.#watcher?.close();
    this.#watcher = undefined;
  }

  async createPaper(input: CreatePaperInput): Promise<PaperDocument> {
    await this.initialize();
    const metadata = createPaperMetadata(input);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const relativePath = path.posix.join(
      "projects",
      metadata.project,
      "papers",
      `${stamp}-${slugify(metadata.title)}.paper`,
    );
    const absolutePath = this.resolveRelative(relativePath);
    const raw = stringifyPaper(metadata, createPaperBody(input));

    await this.atomicWrite(absolutePath, raw);
    this.emit({
      type: "created",
      path: relativePath,
      at: new Date().toISOString(),
    });

    return parsePaper(relativePath, raw);
  }

  async readPaper(relativePath: string): Promise<PaperDocument> {
    const absolutePath = this.resolvePaper(relativePath);
    const raw = await readFile(absolutePath, "utf8");
    return parsePaper(this.toRelative(absolutePath), raw);
  }

  async updatePaper(
    relativePath: string,
    input: {
      content?: string;
      append?: string;
      metadata?: Partial<
        Pick<PaperMetadata, "title" | "status" | "tags" | "agent">
      >;
    },
  ): Promise<PaperDocument> {
    const current = await this.readPaper(relativePath);
    const content =
      input.content ??
      (input.append
        ? `${current.content.trimEnd()}\n\n${input.append.trim()}\n`
        : current.content);

    const metadata: PaperMetadata = {
      ...current.metadata,
      ...input.metadata,
      updated_at: new Date().toISOString(),
      tags: input.metadata?.tags ?? current.metadata.tags,
    };
    const raw = stringifyPaper(metadata, content);
    const absolutePath = this.resolvePaper(relativePath);

    await this.atomicWrite(absolutePath, raw);
    this.emit({
      type: "updated",
      path: current.path,
      at: metadata.updated_at,
    });

    return parsePaper(current.path, raw);
  }

  async checkpoint(
    relativePath: string,
    input: {
      summary: string;
      completed?: string[];
      next?: string;
      blockers?: string[];
      validation?: string[];
    },
  ): Promise<PaperDocument> {
    const lines = [
      `### Checkpoint · ${new Date().toLocaleString("en", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`,
      "",
      input.summary.trim(),
    ];

    if (input.completed?.length) {
      lines.push("", "**Completed**", ...input.completed.map((item) => `- ${item}`));
    }
    if (input.blockers?.length) {
      lines.push("", "**Blocked by**", ...input.blockers.map((item) => `- ${item}`));
    }
    if (input.validation?.length) {
      lines.push("", "**Checked**", ...input.validation.map((item) => `- ${item}`));
    }
    if (input.next) {
      lines.push("", "**Next**", input.next.trim());
    }

    return this.updatePaper(relativePath, {
      append: lines.join("\n"),
    });
  }

  async listTree(): Promise<PaperTreeNode[]> {
    await this.initialize();
    return this.readDirectory(this.dataRoot, "");
  }

  async search(query: string, limit = 12): Promise<SearchResult[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const papers = await this.collectPaperPaths(this.dataRoot);
    const results: SearchResult[] = [];

    for (const absolutePath of papers) {
      const relativePath = this.toRelative(absolutePath);
      const paper = parsePaper(
        relativePath,
        await readFile(absolutePath, "utf8"),
      );
      const haystack =
        `${paper.metadata.title}\n${paper.metadata.tags.join(" ")}\n${paper.content}`.toLowerCase();
      const firstIndex = haystack.indexOf(normalizedQuery);
      if (firstIndex < 0) continue;

      const titleHit = paper.metadata.title
        .toLowerCase()
        .includes(normalizedQuery);
      const tagHit = paper.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(normalizedQuery),
      );
      const excerptStart = Math.max(
        0,
        paper.content.toLowerCase().indexOf(normalizedQuery) - 80,
      );
      const excerpt = paper.content
        .slice(excerptStart, excerptStart + 240)
        .replace(/\s+/g, " ")
        .trim();

      results.push({
        path: relativePath,
        title: paper.metadata.title,
        kind: paper.metadata.kind,
        status: paper.metadata.status,
        excerpt,
        score: (titleHit ? 10 : 0) + (tagHit ? 4 : 0) + 1,
      });
    }

    return results
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, Math.max(1, Math.min(limit, 50)));
  }

  async createFolder(relativePath: string): Promise<string> {
    const absolutePath = this.resolveRelative(relativePath);
    await mkdir(absolutePath, { recursive: true });
    const normalized = this.toRelative(absolutePath);
    this.emit({
      type: "created",
      path: normalized,
      at: new Date().toISOString(),
    });
    return normalized;
  }

  async moveNode(from: string, to: string): Promise<string> {
    const source = this.resolveRelative(from);
    const destination = this.resolveRelative(to);
    await mkdir(path.dirname(destination), { recursive: true });
    this.#internalChanges.add(source);
    this.#internalChanges.add(destination);
    await rename(source, destination);
    const normalized = this.toRelative(destination);
    this.emit({
      type: "moved",
      path: normalized,
      previousPath: this.toRelative(source),
      at: new Date().toISOString(),
    });
    return normalized;
  }

  async trashNode(relativePath: string): Promise<string> {
    if (!relativePath || relativePath === WORKSPACE_FILE) {
      throw new Error("The workspace Paper cannot be removed.");
    }
    const source = this.resolveRelative(relativePath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const destination = path.join(
      this.dataRoot,
      ".trash",
      `${stamp}-${path.basename(source)}`,
    );
    await mkdir(path.dirname(destination), { recursive: true });
    this.#internalChanges.add(source);
    await rename(source, destination);
    this.emit({
      type: "trashed",
      path: relativePath,
      at: new Date().toISOString(),
    });
    return this.toRelative(destination);
  }

  onEvent(listener: (event: PaperEvent) => void): () => void {
    this.events.on("paper", listener);
    return () => this.events.off("paper", listener);
  }

  private emit(event: PaperEvent): void {
    this.events.emit("paper", event);
  }

  private async atomicWrite(
    absolutePath: string,
    content: string,
  ): Promise<void> {
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const temporaryPath = `${absolutePath}.tmp-${randomUUID()}`;
    await writeFile(temporaryPath, content, "utf8");
    this.#internalChanges.add(path.resolve(absolutePath));
    try {
      await rename(temporaryPath, absolutePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  private resolvePaper(relativePath: string): string {
    if (!relativePath.toLowerCase().endsWith(".paper")) {
      throw new Error("Paper paths must end in .paper.");
    }
    return this.resolveRelative(relativePath);
  }

  private resolveRelative(relativePath: string): string {
    const normalized = relativePath
      .replaceAll("\\", "/")
      .replace(/^\/+/, "");
    const absolutePath = path.resolve(this.dataRoot, normalized);
    const boundary = `${this.dataRoot}${path.sep}`;
    if (absolutePath !== this.dataRoot && !absolutePath.startsWith(boundary)) {
      throw new Error("The requested path escapes the Paper workspace.");
    }
    return absolutePath;
  }

  private toRelative(absolutePath: string): string {
    return path
      .relative(this.dataRoot, absolutePath)
      .split(path.sep)
      .join("/");
  }

  private async readDirectory(
    absoluteDirectory: string,
    relativeDirectory: string,
  ): Promise<PaperTreeNode[]> {
    const entries = await readdir(absoluteDirectory, {
      withFileTypes: true,
    });
    const nodes: PaperTreeNode[] = [];

    for (const entry of entries) {
      if (entry.name === ".trash" || entry.name.startsWith(".")) continue;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const relativePath = path.posix.join(relativeDirectory, entry.name);

      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "folder",
          children: await this.readDirectory(absolutePath, relativePath),
        });
      } else if (entry.isFile() && entry.name.endsWith(".paper")) {
        try {
          const paper = parsePaper(
            relativePath,
            await readFile(absolutePath, "utf8"),
          );
          nodes.push({
            name: entry.name,
            path: relativePath,
            type: "paper",
            title: paper.metadata.title,
            kind: paper.metadata.kind,
            status: paper.metadata.status,
            updatedAt: paper.metadata.updated_at,
          });
        } catch {
          nodes.push({
            name: entry.name,
            path: relativePath,
            type: "paper",
            title: entry.name.replace(/\.paper$/, ""),
            status: "draft",
          });
        }
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return (a.title ?? a.name).localeCompare(b.title ?? b.name);
    });
  }

  private async collectPaperPaths(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.name === ".trash") continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.collectPaperPaths(absolutePath)));
      } else if (entry.isFile() && entry.name.endsWith(".paper")) {
        files.push(absolutePath);
      }
    }

    return files;
  }
}
