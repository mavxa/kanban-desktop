import { useEffect, useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  MdAdd,
  MdBrightnessAuto,
  MdClose,
  MdDarkMode,
  MdLightMode,
} from "react-icons/md";
import { ColumnEditModal } from "./ColumnEditModal";
import { FilterPanel } from "./FilterPanel";
import { KanbanBoard } from "./KanbanBoard";
import { FALLBACK_COLUMNS } from "./mock-data";
import {
  useBoardDataQuery,
  useCreateColumnMutation,
  useCreateTaskMutation,
  useDeleteColumnMutation,
  useDeleteTaskMutation,
  useUpdateBoardColumns,
  useUpdateColumnMutation,
  useUpdateTaskMutation,
} from "./queries";
import { createTaskFormSchema } from "./schemas";
import type { CreateTaskFormValues } from "./schemas";
import { TaskEditModal } from "./TaskEditModal";
import type { TaskEditValues } from "./TaskEditModal";
import type { ColumnData, FilterState, Priority, TaskData } from "./types";
import { version as APP_VERSION } from "../../../package.json";

type ThemeMode = "dark" | "light" | "auto";
type ResolvedTheme = Exclude<ThemeMode, "auto">;

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

function createEmptyTaskFormValues(columnId: number): CreateTaskFormValues {
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

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Invalid value.";
}

export function BoardScreen() {
  const [boardRevision, setBoardRevision] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getInitialThemeMode()),
  );
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    task: TaskData;
    columnId: number;
  } | null>(null);
  const [columnModal, setColumnModal] = useState<{
    mode: "create" | "edit";
    column?: ColumnData;
  } | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    search: "",
    priorities: [],
    tags: [],
  });

  const { isLoading, data: columns = FALLBACK_COLUMNS } = useBoardDataQuery();
  const defaultColumnId = columns[0]?.id ?? FALLBACK_COLUMNS[0]?.id ?? 0;

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const column of columns) {
      for (const task of column.tasks) {
        for (const tag of task.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [columns]);

  const filteredColumns = useMemo((): ColumnData[] => {
    const hasFilter =
      filter.search || filter.priorities.length > 0 || filter.tags.length > 0;
    if (!hasFilter) {
      return columns;
    }

    const searchLower = filter.search.toLowerCase();

    return columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task) => {
        if (searchLower) {
          const matchesSearch =
            task.title.toLowerCase().includes(searchLower) ||
            (task.description?.toLowerCase().includes(searchLower) ?? false) ||
            task.tags.some((tag) => tag.toLowerCase().includes(searchLower));
          if (!matchesSearch) return false;
        }

        if (filter.priorities.length > 0) {
          if (!filter.priorities.includes(task.priority)) return false;
        }

        if (filter.tags.length > 0) {
          if (!filter.tags.some((tag) => task.tags.includes(tag))) return false;
        }

        return true;
      }),
    }));
  }, [columns, filter]);

  const updateBoardColumns = useUpdateBoardColumns();
  const createTaskMutation = useCreateTaskMutation({
    onSuccess: (createdTask, input) => {
      const nextColumns = columns.map((column) => {
        if (column.id !== input.columnId) {
          return column;
        }

        return {
          ...column,
          tasks: [...column.tasks, createdTask],
        };
      });

      updateBoardColumns(nextColumns);
      setBoardRevision((value) => value + 1);
      createTaskForm.reset(createEmptyTaskFormValues(input.columnId));
      setIsCreateTaskOpen(false);
    },
  });

  const updateTaskMutation = useUpdateTaskMutation({
    onSuccess: (updatedTask) => {
      const nextColumns = columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      }));
      updateBoardColumns(nextColumns);
      setBoardRevision((value) => value + 1);
      setEditingTask(null);
    },
  });

  const deleteTaskMutation = useDeleteTaskMutation({
    onSuccess: (_result, input) => {
      const taskId = String(input.taskId);
      const nextColumns = columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      }));
      updateBoardColumns(nextColumns);
      setBoardRevision((value) => value + 1);
      setEditingTask(null);
    },
  });

  const createColumnMutation = useCreateColumnMutation({
    onSuccess: (newColumn) => {
      updateBoardColumns([...columns, newColumn]);
      setBoardRevision((value) => value + 1);
      setColumnModal(null);
    },
  });

  const updateColumnMutation = useUpdateColumnMutation({
    onSuccess: (_result, input) => {
      const nextColumns = columns.map((column) =>
        column.id === input.columnId
          ? { ...column, title: input.title, wipLimit: input.wipLimit }
          : column,
      );
      updateBoardColumns(nextColumns);
      setBoardRevision((value) => value + 1);
      setColumnModal(null);
    },
  });

  const deleteColumnMutation = useDeleteColumnMutation({
    onSuccess: (_result, input) => {
      const nextColumns = columns.filter(
        (column) => column.id !== input.columnId,
      );
      updateBoardColumns(nextColumns);
      setBoardRevision((value) => value + 1);
      setColumnModal(null);
    },
  });

  const createTaskForm = useForm({
    defaultValues: createEmptyTaskFormValues(defaultColumnId),
    validators: {
      onSubmit: createTaskFormSchema,
    },
    onSubmit: ({ value }) => {
      createTaskMutation.mutate({
        columnId: value.columnId,
        title: value.title.trim(),
        description: value.description.trim() || undefined,
        priority: value.priority,
        tags: parseTags(value.tags),
      });
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

  useHotkey("Escape", () => setIsCreateTaskOpen(false), {
    enabled: isCreateTaskOpen,
  });

  function openCreateTaskDialog() {
    createTaskMutation.reset();
    createTaskForm.reset(createEmptyTaskFormValues(defaultColumnId));
    setIsCreateTaskOpen(true);
  }

  function handleTaskClick(taskId: string) {
    for (const column of columns) {
      const task = column.tasks.find((t) => t.id === taskId);
      if (task) {
        updateTaskMutation.reset();
        deleteTaskMutation.reset();
        setEditingTask({ task, columnId: column.id });
        return;
      }
    }
  }

  function handleEditSubmit(values: TaskEditValues) {
    if (!editingTask) return;
    updateTaskMutation.mutate({
      taskId: Number(editingTask.task.id),
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      priority: values.priority,
      tags: parseTags(values.tags),
    });
  }

  function handleDeleteTask() {
    if (!editingTask) return;
    deleteTaskMutation.mutate({ taskId: Number(editingTask.task.id) });
  }

  function handleColumnSubmit(title: string, wipLimit: number) {
    if (columnModal?.mode === "create") {
      createColumnMutation.mutate({ title, wipLimit });
    } else if (columnModal?.mode === "edit" && columnModal.column) {
      updateColumnMutation.mutate({
        columnId: columnModal.column.id,
        title,
        wipLimit,
      });
    }
  }

  function handleColumnDelete() {
    if (columnModal?.mode === "edit" && columnModal.column) {
      deleteColumnMutation.mutate({ columnId: columnModal.column.id });
    }
  }

  function handleColumnClick(columnId: number) {
    const column = columns.find((c) => c.id === columnId);
    if (column) {
      createColumnMutation.reset();
      updateColumnMutation.reset();
      deleteColumnMutation.reset();
      setColumnModal({ mode: "edit", column });
    }
  }

  return (
    <section className="flex h-screen flex-col overflow-hidden bg-background text-foreground antialiased">
      <header className="flex items-center justify-between border-b border-border bg-surface/50 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Kanban Board
          </h1>
          <span className="rounded-md border border-border bg-surface-hover px-2 py-0.5 text-xs font-mono text-muted">
            v{APP_VERSION}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <FilterPanel
            filter={filter}
            availableTags={availableTags}
            onChange={(nextFilter) => {
              setFilter(nextFilter);
              setBoardRevision((v) => v + 1);
            }}
          />
          <button
            type="button"
            onClick={() => {
              createColumnMutation.reset();
              setColumnModal({ mode: "create" });
            }}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-all duration-200 hover:border-border-hover hover:text-foreground"
          >
            + Column
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
            initialColumns={filteredColumns}
            onColumnsChange={updateBoardColumns}
            onTaskClick={handleTaskClick}
            onColumnClick={handleColumnClick}
          />
        )}
      </main>

      {isCreateTaskOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void createTaskForm.handleSubmit();
            }}
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-4 shadow-2xl shadow-black/40"
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
              <createTaskForm.Field name="columnId">
                {(field) => (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Column
                    </span>
                    <select
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(Number(event.target.value))
                      }
                      className="w-full rounded-t-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
                    >
                      {columns.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </createTaskForm.Field>

              <createTaskForm.Field name="title">
                {(field) => (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Title
                    </span>
                    <input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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
              </createTaskForm.Field>

              <createTaskForm.Field name="description">
                {(field) => (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Description
                    </span>
                    <textarea
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                      placeholder="Optional details"
                    />
                  </label>
                )}
              </createTaskForm.Field>

              <div className="grid grid-cols-2 gap-3">
                <createTaskForm.Field name="priority">
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
                            <p className="">{priority}</p>
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </createTaskForm.Field>

                <createTaskForm.Field name="tags">
                  {(field) => (
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-muted">
                        Tags
                      </span>
                      <input
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
                        placeholder="ui, backend"
                      />
                    </label>
                  )}
                </createTaskForm.Field>
              </div>
            </div>

            {createTaskMutation.error ? (
              <p className="mt-3 text-xs text-danger">
                {createTaskMutation.error instanceof Error
                  ? createTaskMutation.error.message
                  : "Failed to create task."}
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

      {editingTask ? (
        <TaskEditModal
          task={editingTask.task}
          columns={columns}
          currentColumnId={editingTask.columnId}
          onSubmit={handleEditSubmit}
          onDelete={handleDeleteTask}
          onClose={() => setEditingTask(null)}
          isPending={updateTaskMutation.isPending}
          isDeleting={deleteTaskMutation.isPending}
          error={
            updateTaskMutation.error
              ? updateTaskMutation.error instanceof Error
                ? updateTaskMutation.error.message
                : "Failed to update task."
              : deleteTaskMutation.error
                ? deleteTaskMutation.error instanceof Error
                  ? deleteTaskMutation.error.message
                  : "Failed to delete task."
                : undefined
          }
        />
      ) : null}

      {columnModal ? (
        <ColumnEditModal
          mode={columnModal.mode}
          initialTitle={columnModal.column?.title}
          initialWipLimit={columnModal.column?.wipLimit}
          onSubmit={handleColumnSubmit}
          onDelete={
            columnModal.mode === "edit" ? handleColumnDelete : undefined
          }
          onClose={() => setColumnModal(null)}
          isPending={
            columnModal.mode === "create"
              ? createColumnMutation.isPending
              : updateColumnMutation.isPending
          }
          isDeleting={deleteColumnMutation.isPending}
          error={
            createColumnMutation.error
              ? createColumnMutation.error instanceof Error
                ? createColumnMutation.error.message
                : "Failed to create column."
              : updateColumnMutation.error
                ? updateColumnMutation.error instanceof Error
                  ? updateColumnMutation.error.message
                  : "Failed to update column."
                : deleteColumnMutation.error
                  ? deleteColumnMutation.error instanceof Error
                    ? deleteColumnMutation.error.message
                    : "Failed to delete column."
                  : undefined
          }
        />
      ) : null}
    </section>
  );
}
