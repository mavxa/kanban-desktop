import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { MdClose, MdDelete } from "react-icons/md";
import type { ColumnData, Priority, TaskData } from "./types";

interface TaskEditModalProps {
  task: TaskData;
  columns: ColumnData[];
  currentColumnId: number;
  onSubmit: (values: TaskEditValues) => void;
  onDelete: () => void;
  onClose: () => void;
  isPending: boolean;
  isDeleting: boolean;
  error?: string;
}

export interface TaskEditValues {
  title: string;
  description: string;
  priority: Priority;
  tags: string;
}

const priorities: Priority[] = ["low", "medium", "high"];

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Invalid value.";
}

export function TaskEditModal({
  task,
  columns,
  currentColumnId,
  onSubmit,
  onDelete,
  onClose,
  isPending,
  isDeleting,
  error,
}: TaskEditModalProps) {
  const currentColumn = columns.find((c) => c.id === currentColumnId);

  useHotkey("Escape", () => onClose());

  const form = useForm({
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      tags: task.tags.join(", "),
    },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-4 shadow-2xl shadow-black/40"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Edit Task
            </h2>
            {currentColumn ? (
              <span className="rounded-md border border-border bg-surface-hover px-2 py-0.5 text-[10px] font-mono text-muted">
                {currentColumn.title}
              </span>
            ) : null}
          </div>
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
          <form.Field name="title">
            {(field) => (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Title
                </span>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                  placeholder="Task title"
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="mt-1 text-xs text-danger">
                    {getErrorMessage(field.state.meta.errors[0])}
                  </p>
                ) : null}
              </label>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Description
                </span>
                <textarea
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                  placeholder="Optional details"
                />
              </label>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="priority">
              {(field) => (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Priority
                  </span>
                  <select
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.value as Priority)
                    }
                    className="w-full rounded-t-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Tags
                  </span>
                  <input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                    placeholder="ui, backend"
                  />
                </label>
              )}
            </form.Field>
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-md border border-danger/30 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdDelete className="text-sm" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>

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
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
