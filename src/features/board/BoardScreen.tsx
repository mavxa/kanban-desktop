import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MdAdd,
  MdBrightnessAuto,
  MdClose,
  MdDarkMode,
  MdLightMode,
} from "react-icons/md";
import { createTask, getBoardData } from "./api";
import { KanbanBoard } from "./KanbanBoard";
import { FALLBACK_COLUMNS } from "./mock-data";
import type { ColumnData, Priority, NewTaskDraft } from "./types";

type ThemeMode = "dark" | "light" | "auto";
type ResolvedTheme = Exclude<ThemeMode, "auto">;

const boardQueryKey = ["board"] as const;
const THEME_STORAGE_KEY = "kanban-desktop-theme";
const priorities: Priority[] = ["low", "medium", "high"];

const themeOptions: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof MdDarkMode;
}> = [
  { mode: "dark", label: "Dark", icon: MdDarkMode },
  { mode: "light", label: "Light", icon: MdLightMode },
  { mode: "auto", label: "Auto", icon: MdBrightnessAuto },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light" || value === "auto";
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(storedTheme) ? storedTheme : "auto";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "auto") {
    return mode;
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function createEmptyTaskDraft(columnId: number): NewTaskDraft {
  return {
    columnId,
    title: "",
    description: "",
    priority: "medium",
    tags: "",
  };
}

function parseTags(value: string) {
  const tags = new Set<string>();

  for (const tag of value.split(",")) {
    const normalizedTag = tag.trim().replace(/^#/, "").toLowerCase();
    if (normalizedTag) {
      tags.add(normalizedTag);
    }
  }

  return Array.from(tags);
}

export function BoardScreen() {
  const queryClient = useQueryClient();
  const [boardRevision, setBoardRevision] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getInitialThemeMode()),
  );
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskValidationError, setCreateTaskValidationError] = useState<
    string | null
  >(null);
  const [newTaskDraft, setNewTaskDraft] = useState<NewTaskDraft>(() =>
    createEmptyTaskDraft(FALLBACK_COLUMNS[0]?.id ?? 0),
  );

  const { isLoading, data: columns = FALLBACK_COLUMNS } = useQuery({
    queryKey: boardQueryKey,
    queryFn: getBoardData,
    select: (boardColumns) =>
      boardColumns.length > 0 ? boardColumns : FALLBACK_COLUMNS,
  });
  const selectedColumnId = columns.some(
    (column) => column.id === newTaskDraft.columnId,
  )
    ? newTaskDraft.columnId
    : (columns[0]?.id ?? 0);

  function updateBoardColumns(nextColumns: ColumnData[]) {
    queryClient.setQueryData(boardQueryKey, nextColumns);
  }

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (createdTask) => {
      const nextColumns = columns.map((column) => {
        if (column.id !== selectedColumnId) {
          return column;
        }

        return {
          ...column,
          tasks: [...column.tasks, createdTask],
        };
      });

      updateBoardColumns(nextColumns);
      setBoardRevision((value) => value + 1);
      setNewTaskDraft(createEmptyTaskDraft(selectedColumnId));
      setIsCreateTaskOpen(false);
    },
  });

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme() {
      const nextTheme = resolveTheme(themeMode);
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      setResolvedTheme(nextTheme);
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyTheme();

    if (themeMode !== "auto") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [themeMode]);

  function openCreateTaskDialog() {
    createTaskMutation.reset();
    setCreateTaskValidationError(null);
    setNewTaskDraft((draft) => ({
      ...draft,
      columnId: selectedColumnId,
    }));
    setIsCreateTaskOpen(true);
  }

  async function handleCreateTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTaskDraft.title.trim();
    if (!title) {
      setCreateTaskValidationError("Title is required.");
      return;
    }
    setCreateTaskValidationError(null);

    createTaskMutation.mutate({
      columnId: selectedColumnId,
      title,
      description: newTaskDraft.description.trim() || undefined,
      priority: newTaskDraft.priority,
      tags: parseTags(newTaskDraft.tags),
    });
  }

  return (
    <section className="flex h-screen flex-col overflow-hidden bg-background text-foreground antialiased">
      <header className="flex items-center justify-between border-b border-border bg-surface/50 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Kanban Board
          </h1>
          <span className="rounded-md border border-border bg-surface-hover px-2 py-0.5 text-xs font-mono text-muted">
            MVP
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-all duration-200 hover:border-border-hover hover:text-foreground"
          >
            Filters
          </button>
          <button
            type="button"
            onClick={openCreateTaskDialog}
            disabled={columns.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdAdd className="text-base" />
            New Task
          </button>
          <div
            aria-label={`Theme: ${themeMode}, resolved ${resolvedTheme}`}
            className="flex rounded-full border border-border bg-surface p-1"
            role="group"
          >
            {themeOptions.map(({ mode, label, icon: Icon }) => {
              const isActive = themeMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  aria-label={`${label} theme`}
                  aria-pressed={isActive}
                  title={label}
                  onClick={() => setThemeMode(mode)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading board...
          </div>
        ) : (
          <KanbanBoard
            key={boardRevision}
            initialColumns={columns}
            onColumnsChange={updateBoardColumns}
          />
        )}
      </main>

      {isCreateTaskOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateTaskSubmit}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 shadow-2xl shadow-black/40"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                New Task
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsCreateTaskOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <MdClose />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Column
                </span>
                <select
                  value={selectedColumnId}
                  onChange={(event) =>
                    setNewTaskDraft((draft) => ({
                      ...draft,
                      columnId: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Title
                </span>
                <input
                  value={newTaskDraft.title}
                  onChange={(event) =>
                    setNewTaskDraft((draft) => ({
                      ...draft,
                      title: event.target.value,
                    }))
                  }
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                  placeholder="Task title"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Description
                </span>
                <textarea
                  value={newTaskDraft.description}
                  onChange={(event) =>
                    setNewTaskDraft((draft) => ({
                      ...draft,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                  placeholder="Optional details"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Priority
                  </span>
                  <select
                    value={newTaskDraft.priority}
                    onChange={(event) =>
                      setNewTaskDraft((draft) => ({
                        ...draft,
                        priority: event.target.value as Priority,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Tags
                  </span>
                  <input
                    value={newTaskDraft.tags}
                    onChange={(event) =>
                      setNewTaskDraft((draft) => ({
                        ...draft,
                        tags: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                    placeholder="ui, backend"
                  />
                </label>
              </div>
            </div>

            {createTaskValidationError || createTaskMutation.error ? (
              <p className="mt-3 text-xs text-danger">
                {createTaskValidationError ??
                (createTaskMutation.error instanceof Error
                  ? createTaskMutation.error.message
                  : "Failed to create task.")}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(false)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdAdd className="text-base" />
                {createTaskMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
