import { randomUUID } from "node:crypto";
import matter from "gray-matter";
import {
  PAPER_KINDS,
  PAPER_STATUSES,
  PAPER_VERSION,
  type CreatePaperInput,
  type PaperDocument,
  type PaperKind,
  type PaperMetadata,
  type PaperStatus,
} from "./types.js";

const validKind = (value: unknown): value is PaperKind =>
  typeof value === "string" &&
  (PAPER_KINDS as readonly string[]).includes(value);

const validStatus = (value: unknown): value is PaperStatus =>
  typeof value === "string" &&
  (PAPER_STATUSES as readonly string[]).includes(value);

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "untitled";
}

export function createPaperMetadata(input: CreatePaperInput): PaperMetadata {
  const now = new Date().toISOString();

  return {
    paper_version: PAPER_VERSION,
    id: randomUUID(),
    title: input.title.trim() || "Untitled Paper",
    kind: input.kind ?? "plan",
    status: input.status ?? "active",
    project: slugify(input.project ?? "workspace"),
    created_at: now,
    updated_at: now,
    ...(input.agent ? { agent: input.agent } : {}),
    tags: input.tags ?? [],
  };
}

export function createPaperBody(input: CreatePaperInput): string {
  const steps = input.steps?.length
    ? input.steps.map((step) => `- [ ] ${step}`).join("\n")
    : "- [ ] Define the next meaningful step";

  return [
    `# ${input.title.trim() || "Untitled Paper"}`,
    "",
    "## Intention",
    "",
    input.intention?.trim() || "Describe what this work should accomplish.",
    "",
    "## Plan",
    "",
    steps,
    "",
    "## Activity",
    "",
    "_Waiting for the first meaningful update._",
    "",
    "## Outcome",
    "",
    "_Open._",
    "",
  ].join("\n");
}

export function parsePaper(path: string, raw: string): PaperDocument {
  const parsed = matter(raw);
  const source = parsed.data as Partial<PaperMetadata>;
  const now = new Date().toISOString();

  const metadata: PaperMetadata = {
    paper_version:
      typeof source.paper_version === "number"
        ? source.paper_version
        : PAPER_VERSION,
    id: typeof source.id === "string" ? source.id : randomUUID(),
    title:
      typeof source.title === "string" && source.title.trim()
        ? source.title
        : titleFromContent(parsed.content),
    kind: validKind(source.kind) ? source.kind : "note",
    status: validStatus(source.status) ? source.status : "draft",
    project:
      typeof source.project === "string"
        ? slugify(source.project)
        : "workspace",
    created_at:
      typeof source.created_at === "string" ? source.created_at : now,
    updated_at:
      typeof source.updated_at === "string" ? source.updated_at : now,
    ...(typeof source.agent === "string" ? { agent: source.agent } : {}),
    tags: Array.isArray(source.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    ...(typeof source.source === "string" ? { source: source.source } : {}),
    ...(typeof source.supersedes === "string"
      ? { supersedes: source.supersedes }
      : {}),
  };

  return {
    path,
    metadata,
    content: parsed.content.trimStart(),
    raw,
  };
}

export function stringifyPaper(
  metadata: PaperMetadata,
  content: string,
): string {
  const ordered: PaperMetadata = {
    paper_version: PAPER_VERSION,
    id: metadata.id,
    title: metadata.title,
    kind: metadata.kind,
    status: metadata.status,
    project: metadata.project,
    created_at: metadata.created_at,
    updated_at: metadata.updated_at,
    ...(metadata.agent ? { agent: metadata.agent } : {}),
    tags: metadata.tags,
    ...(metadata.source ? { source: metadata.source } : {}),
    ...(metadata.supersedes ? { supersedes: metadata.supersedes } : {}),
  };

  return matter.stringify(content.trimEnd() + "\n", ordered);
}

function titleFromContent(content: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || "Untitled Paper";
}
