import type {
  PaperDocument,
  PaperEvent,
  PaperTreeNode,
  WorkspaceInfo,
} from "./types";

const TOKEN_KEY = "paper-workspace-token";

export function captureSessionToken(): string {
  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    sessionStorage.setItem(TOKEN_KEY, queryToken);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url);
    return queryToken;
  }
  return sessionStorage.getItem(TOKEN_KEY) ?? "dev";
}

export class PaperApi {
  constructor(private readonly token: string) {}

  getWorkspace(): Promise<WorkspaceInfo> {
    return this.request("/api/workspace");
  }

  async getTree(): Promise<PaperTreeNode[]> {
    const response = await this.request<{ nodes: PaperTreeNode[] }>("/api/tree");
    return response.nodes;
  }

  getPaper(path: string): Promise<PaperDocument> {
    return this.request(`/api/paper?path=${encodeURIComponent(path)}`);
  }

  createPaper(input: {
    title: string;
    project: string;
    intention?: string;
  }): Promise<PaperDocument> {
    return this.request("/api/papers", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        kind: "plan",
        status: "active",
      }),
    });
  }

  updatePaper(
    path: string,
    input: {
      content?: string;
      metadata?: {
        title?: string;
        status?: string;
      };
    },
  ): Promise<PaperDocument> {
    return this.request("/api/papers", {
      method: "PUT",
      body: JSON.stringify({ path, ...input }),
    });
  }

  createFolder(path: string): Promise<{ path: string }> {
    return this.request("/api/folders", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  }

  moveNode(from: string, to: string): Promise<{ path: string }> {
    return this.request("/api/move", {
      method: "POST",
      body: JSON.stringify({ from, to }),
    });
  }

  trashNode(path: string): Promise<{ trashedPath: string }> {
    return this.request(`/api/node?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  subscribe(onEvent: (event: PaperEvent) => void): () => void {
    const source = new EventSource(
      `/events?token=${encodeURIComponent(this.token)}`,
    );
    source.addEventListener("paper", (event) => {
      onEvent(JSON.parse((event as MessageEvent<string>).data) as PaperEvent);
    });
    return () => source.close();
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...init.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `Paper request failed (${response.status})`);
    }

    return (await response.json()) as T;
  }
}
