import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Edit05,
  File02,
  Save02,
  XClose,
} from "@untitledui/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PaperDocument } from "../types";

interface PaperEditorProps {
  paper: PaperDocument;
  writing: boolean;
  onSave: (
    path: string,
    input: {
      content: string;
      metadata: { title: string };
    },
  ) => Promise<PaperDocument>;
}

export function PaperEditor({
  paper,
  writing,
  onSave,
}: PaperEditorProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(paper.content);
  const [title, setTitle] = useState(paper.metadata.title);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "changed">(
    "saved",
  );
  const saveVersion = useRef(0);

  useEffect(() => {
    setContent(paper.content);
    setTitle(paper.metadata.title);
    setSaveState("saved");
  }, [paper.path, paper.content, paper.metadata.title]);

  useEffect(() => {
    if (
      !editing ||
      (content === paper.content && title === paper.metadata.title)
    ) {
      return;
    }

    setSaveState("changed");
    const version = ++saveVersion.current;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await onSave(paper.path, {
          content,
          metadata: { title },
        });
        if (saveVersion.current === version) setSaveState("saved");
      } catch {
        if (saveVersion.current === version) setSaveState("changed");
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    content,
    editing,
    onSave,
    paper.content,
    paper.metadata.title,
    paper.path,
    title,
  ]);

  return (
    <main className="paper-main">
      <header className="paper-topbar">
        <div className="paper-location">
          <File02 size={15} />
          <span>{paper.metadata.project}</span>
          <span className="location-separator">/</span>
          <strong>{paper.metadata.kind}</strong>
        </div>

        <div className="paper-topbar-actions">
          <AnimatePresence mode="wait">
            {writing ? (
              <motion.span
                className="writing-state"
                key="writing"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
              >
                <span className="writing-pulse" />
                AI is writing
              </motion.span>
            ) : (
              <motion.span
                className="save-state"
                key={saveState}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
              >
                {saveState === "saving" ? (
                  <Save02 size={14} />
                ) : (
                  <Check size={14} />
                )}
                {saveState === "saving"
                  ? "Saving"
                  : saveState === "changed"
                    ? "Unsaved"
                    : "Saved"}
              </motion.span>
            )}
          </AnimatePresence>

          <button
            className={`edit-button ${editing ? "edit-button-active" : ""}`}
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? <XClose size={16} /> : <Edit05 size={16} />}
            {editing ? "Close edit" : "Edit"}
          </button>
        </div>
      </header>

      <motion.article
        className="paper-document"
        key={paper.path}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {editing ? (
          <>
            <input
              className="paper-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Paper title"
            />
            <textarea
              className="paper-editor"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              spellCheck
              aria-label="Paper content"
            />
          </>
        ) : (
          <div className="paper-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </motion.article>
    </main>
  );
}
