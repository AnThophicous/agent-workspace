import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { File02, RefreshCw01 } from "@untitledui/icons";
import { captureSessionToken, PaperApi } from "./api";
import { NewPaperDialog } from "./components/NewPaperDialog";
import { PaperEditor } from "./components/PaperEditor";
import { Sidebar } from "./components/Sidebar";
import type {
  PaperDocument,
  PaperEvent,
  PaperTreeNode,
  WorkspaceInfo,
} from "./types";

export function App() {
  const api = useMemo(() => new PaperApi(captureSessionToken()), []);
  const [workspace, setWorkspace] = useState<WorkspaceInfo>();
  const [nodes, setNodes] = useState<PaperTreeNode[]>([]);
  const [paper, setPaper] = useState<PaperDocument>();
  const [activePath, setActivePath] = useState<string>();
  const [newPaperOpen, setNewPaperOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [writing, setWriting] = useState(false);
  const activePathRef = useRef<string | undefined>(undefined);
  const writingTimer = useRef<number | undefined>(undefined);

  const refreshTree = useCallback(async () => {
    const nextNodes = await api.getTree();
    setNodes(nextNodes);
    return nextNodes;
  }, [api]);

  const selectPaper = useCallback(
    async (path: string) => {
      setError(undefined);
      setActivePath(path);
      activePathRef.current = path;
      try {
        setPaper(await api.getPaper(path));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Paper unavailable.");
      }
    },
    [api],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.getWorkspace(), refreshTree()])
      .then(async ([workspaceInfo, tree]) => {
        if (cancelled) return;
        setWorkspace(workspaceInfo);
        const firstPaper = findFirstPaper(tree);
        if (firstPaper) await selectPaper(firstPaper.path);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Paper Workspace could not open.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = api.subscribe((event: PaperEvent) => {
      void refreshTree();
      if (event.path === activePathRef.current) {
        window.clearTimeout(writingTimer.current);
        setWriting(true);
        writingTimer.current = window.setTimeout(() => setWriting(false), 1_400);
        void selectPaper(event.path);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearTimeout(writingTimer.current);
    };
  }, [api, refreshTree, selectPaper]);

  const createPaper = async (input: {
    title: string;
    project: string;
    intention?: string;
  }) => {
    const created = await api.createPaper(input);
    await refreshTree();
    await selectPaper(created.path);
  };

  const createFolder = async () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    const project = slug(workspace?.name ?? "workspace");
    await api.createFolder(`projects/${project}/${slug(name)}`);
    await refreshTree();
  };

  const trash = async (path: string) => {
    const title = findNode(nodes, path)?.title ?? "this Paper";
    if (!window.confirm(`Move “${title}” to Paper trash?`)) return;
    await api.trashNode(path);
    const tree = await refreshTree();
    if (path === activePath) {
      const next = findFirstPaper(tree);
      if (next) await selectPaper(next.path);
      else {
        setPaper(undefined);
        setActivePath(undefined);
      }
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        workspaceName={workspace?.name ?? ""}
        nodes={nodes}
        activePath={activePath}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        onSelect={selectPaper}
        onNewPaper={() => setNewPaperOpen(true)}
        onNewFolder={() => void createFolder()}
        onTrash={(path) => void trash(path)}
      />

      <section className="workspace-stage">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              className="stage-message"
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="loading-line" />
              Opening Papers
            </motion.div>
          ) : error ? (
            <motion.div
              className="stage-message"
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <strong>Paper could not open.</strong>
              <span>{error}</span>
              <button
                className="quiet-button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw01 size={16} />
                Try again
              </button>
            </motion.div>
          ) : paper ? (
            <PaperEditor
              key="paper"
              paper={paper}
              writing={writing}
              onSave={async (path, input) => {
                const updated = await api.updatePaper(path, input);
                setPaper(updated);
                await refreshTree();
                return updated;
              }}
            />
          ) : (
            <motion.div
              className="stage-message empty-stage"
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <File02 size={22} />
              <strong>No Paper open</strong>
              <span>Create one and give the work somewhere to begin.</span>
              <button
                className="primary-button"
                onClick={() => setNewPaperOpen(true)}
              >
                New Paper
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <NewPaperDialog
        defaultProject={slug(workspace?.name ?? "workspace")}
        open={newPaperOpen}
        onOpenChange={setNewPaperOpen}
        onCreate={createPaper}
      />
    </div>
  );
}

function findFirstPaper(nodes: PaperTreeNode[]): PaperTreeNode | undefined {
  for (const node of nodes) {
    if (node.type === "paper") return node;
    const child = node.children ? findFirstPaper(node.children) : undefined;
    if (child) return child;
  }
  return undefined;
}

function findNode(
  nodes: PaperTreeNode[],
  path: string,
): PaperTreeNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    const child = node.children ? findNode(node.children, path) : undefined;
    if (child) return child;
  }
  return undefined;
}

function slug(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}
