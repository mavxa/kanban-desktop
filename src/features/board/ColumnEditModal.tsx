import { useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { MdClose, MdDelete } from "react-icons/md";

interface ColumnEditModalProps {
  mode: "create" | "edit";
  initialTitle?: string;
  initialWipLimit?: number;
  onSubmit: (title: string, wipLimit: number) => void;
  onDelete?: () => void;
  onClose: () => void;
  isPending: boolean;
  isDeleting?: boolean;
  error?: string;
}

export function ColumnEditModal({
  mode,
  initialTitle = "",
  initialWipLimit = 0,
  onSubmit,
  onDelete,
  onClose,
  isPending,
  isDeleting = false,
  error,
}: ColumnEditModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [wipLimit, setWipLimit] = useState(String(initialWipLimit));
  const [titleError, setTitleError] = useState("");

  useHotkey("Escape", () => onClose());

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Title is required.");
      return;
    }

    setTitleError("");
    const parsedWip = Math.max(0, parseInt(wipLimit, 10) || 0);
    onSubmit(trimmed, parsedWip);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-4 shadow-2xl shadow-black/40"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {mode === "create" ? "New Column" : "Edit Column"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <MdClose />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
              placeholder="Column title"
            />
            {titleError ? (
              <p className="mt-1 text-xs text-danger">{titleError}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              WIP Limit
            </span>
            <input
              type="number"
              min="0"
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
              placeholder="0 = no limit"
            />
            <p className="mt-1 text-[10px] text-muted">
              0 means no limit
            </p>
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-xs text-danger">{error}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-between">
          {mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-md border border-danger/30 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MdDelete className="text-sm" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
