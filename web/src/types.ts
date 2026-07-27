export type PaperKind =
  | "plan"
  | "note"
  | "decision"
  | "memory"
  | "checkpoint"
  | "workspace";

export type PaperStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "superseded"
  | "archived";

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

export interface WorkspaceInfo {
  name: string;
  root: string;
  paperRoot: string;
}

export interface PaperEvent {
  type: "created" | "updated" | "moved" | "trashed" | "external";
  path: string;
  previousPath?: string;
  at: string;
}
