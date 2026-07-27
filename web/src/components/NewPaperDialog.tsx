import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { FilePlus02, XClose } from "@untitledui/icons";

interface NewPaperDialogProps {
  defaultProject: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    title: string;
    project: string;
    intention?: string;
  }) => Promise<void>;
}

const entrance = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export function NewPaperDialog({
  defaultProject,
  open,
  onOpenChange,
  onCreate,
}: NewPaperDialogProps) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(defaultProject);
  const [intention, setIntention] = useState("");
  const [creating, setCreating] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        project: project.trim() || defaultProject,
        ...(intention.trim() ? { intention: intention.trim() } : {}),
      });
      setTitle("");
      setIntention("");
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={entrance}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.form
            className="dialog-content"
            onSubmit={submit}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={entrance}
          >
            <div className="dialog-heading">
              <div>
                <Dialog.Title>New Paper</Dialog.Title>
                <Dialog.Description>
                  Give this work a place to begin.
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-button" aria-label="Close">
                <XClose size={18} />
              </Dialog.Close>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What are we working on?"
              />
            </label>

            <label className="field">
              <span>Project</span>
              <input
                value={project}
                onChange={(event) => setProject(event.target.value)}
                placeholder="workspace"
              />
            </label>

            <label className="field">
              <span>Intention</span>
              <textarea
                value={intention}
                onChange={(event) => setIntention(event.target.value)}
                placeholder="Optional — the outcome that matters."
                rows={3}
              />
            </label>

            <div className="dialog-actions">
              <Dialog.Close className="quiet-button" type="button">
                Cancel
              </Dialog.Close>
              <button
                className="primary-button"
                type="submit"
                disabled={!title.trim() || creating}
              >
                <FilePlus02 size={17} />
                {creating ? "Creating…" : "Create Paper"}
              </button>
            </div>
          </motion.form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
