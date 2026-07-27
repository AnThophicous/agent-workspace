import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  DotsHorizontal,
  File02,
  FilePlus02,
  FolderClosed,
  FolderPlus,
  Menu01,
  Plus,
  SearchSm,
  Trash01,
  XClose,
} from "@untitledui/icons";
import type { PaperTreeNode } from "../types";

interface SidebarProps {
  workspaceName: string;
  nodes: PaperTreeNode[];
  activePath?: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  onNewPaper: () => void;
  onNewFolder: () => void;
  onTrash: (path: string) => void;
}

export function Sidebar({
  workspaceName,
  nodes,
  activePath,
  mobileOpen,
  onMobileOpenChange,
  onSelect,
  onNewPaper,
  onNewFolder,
  onTrash,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterTree(nodes, query.trim().toLowerCase()),
    [nodes, query],
  );

  return (
    <>
      <button
        className="mobile-menu-button"
        onClick={() => onMobileOpenChange(true)}
        aria-label="Open workspace"
      >
        <Menu01 size={19} />
      </button>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            className="mobile-backdrop"
            aria-label="Close workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onMobileOpenChange(false)}
          />
        )}
      </AnimatePresence>
      <motion.aside
        className={`sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}
        initial={false}
      >
        <div className="sidebar-brand">
          <img
            className="brand-mark"
            src="/paper-workspace.png"
            alt=""
            aria-hidden="true"
          />
          <div className="brand-copy">
            <strong>Paper</strong>
            <span>{workspaceName || "Workspace"}</span>
          </div>
          <button
            className="icon-button sidebar-mobile-close"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close workspace"
          >
            <XClose size={17} />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className="icon-button sidebar-add"
              aria-label="Create"
            >
              <Plus size={18} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="dropdown-content"
                align="start"
                sideOffset={7}
              >
                <DropdownMenu.Item
                  className="dropdown-item"
                  onSelect={onNewPaper}
                >
                  <FilePlus02 size={16} />
                  New Paper
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="dropdown-item"
                  onSelect={onNewFolder}
                >
                  <FolderPlus size={16} />
                  New folder
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <label className="sidebar-search">
          <SearchSm size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a Paper"
            aria-label="Find a Paper"
          />
        </label>

        <div className="tree" role="tree" aria-label="Paper structure">
          {filtered.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              onSelect={(path) => {
                onSelect(path);
                onMobileOpenChange(false);
              }}
              onTrash={onTrash}
            />
          ))}
        </div>

        <div className="sidebar-footer">
          <span className="presence-dot" />
          Live workspace
        </div>
      </motion.aside>
    </>
  );
}

function TreeNode({
  node,
  depth,
  activePath,
  onSelect,
  onTrash,
}: {
  node: PaperTreeNode;
  depth: number;
  activePath?: string;
  onSelect: (path: string) => void;
  onTrash: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";
  const active = activePath === node.path;

  return (
    <div className="tree-branch">
      <div
        className={`tree-row ${active ? "tree-row-active" : ""}`}
        style={{ paddingLeft: 10 + depth * 15 }}
      >
        {isFolder ? (
          <button
            className="tree-main"
            onClick={() => setOpen((value) => !value)}
            role="treeitem"
            aria-expanded={open}
          >
            <motion.span
              className="tree-chevron"
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <ChevronRight size={13} />
            </motion.span>
            <FolderClosed size={16} />
            <span>{humanize(node.name)}</span>
          </button>
        ) : (
          <button
            className="tree-main tree-paper"
            onClick={() => onSelect(node.path)}
            role="treeitem"
            aria-selected={active}
          >
            <span className="tree-chevron-placeholder" />
            <File02 size={15} />
            <span>{node.title ?? humanize(node.name)}</span>
          </button>
        )}

        {!isFolder && node.name !== "workspace.paper" && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className="tree-more"
              aria-label={`Options for ${node.title ?? node.name}`}
            >
              <DotsHorizontal size={15} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="dropdown-content"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  className="dropdown-item dropdown-danger"
                  onSelect={() => onTrash(node.path)}
                >
                  <Trash01 size={16} />
                  Move to trash
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isFolder && open && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="tree-children"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
                onTrash={onTrash}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function filterTree(
  nodes: PaperTreeNode[],
  query: string,
): PaperTreeNode[] {
  if (!query) return nodes;
  return nodes.flatMap((node) => {
    const children = node.children
      ? filterTree(node.children, query)
      : undefined;
    const matches = (node.title ?? node.name).toLowerCase().includes(query);
    if (!matches && !children?.length) return [];
    return [{ ...node, ...(children ? { children } : {}) }];
  });
}

function humanize(value: string): string {
  return value
    .replace(/\.paper$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}t[^-]+-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
