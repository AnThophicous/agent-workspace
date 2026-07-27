export const PAPER_VERSION = 1;

export const PAPER_KINDS = [
  "plan",
  "note",
  "decision",
  "memory",
  "checkpoint",
  "workspace",
] as const;

export const PAPER_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "superseded",
  "archived",
] as const;

export type PaperKind = (typeof PAPER_KINDS)[number];
export type PaperStatus = (typeof PAPER_STATUSES)[number];

export interface PaperMetadata {
  paper_version: number;
  id: string;
  title: string;
  kind: PaperKind;
  status: PaperStatus;
  project: string;
  created_at: string;
  updated_at: string;
  agent?: string;
  tags: string[];
  source?: string;
  supersedes?: string;
}

export interface PaperDocument {
  path: string;
  metadata: PaperMetadata;
  content: string;
  raw: string;
}

export interface PaperTreeNode {
  name: string;
  path: string;
  type: "folder" | "paper";
  title?: string;
  kind?: PaperKind;
  status?: PaperStatus;
  updatedAt?: string;
  children?: PaperTreeNode[];
}

export interface PaperEvent {
  type: "created" | "updated" | "moved" | "trashed" | "external";
  path: string;
  previousPath?: string;
  at: string;
}

export interface CreatePaperInput {
  title: string;
  project?: string;
  kind?: PaperKind;
  status?: PaperStatus;
  agent?: string;
  tags?: string[];
  intention?: string;
  steps?: string[];
}

export interface SearchResult {
  path: string;
  title: string;
  kind: PaperKind;
  status: PaperStatus;
  excerpt: string;
  score: number;
}
