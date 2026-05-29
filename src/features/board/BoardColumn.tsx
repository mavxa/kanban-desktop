import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import type { BoardColumnProps } from "./types";

export function BoardColumn({ id, title, wipLimit, tasks, onTaskClick, onColumnClick }: BoardColumnProps) {
  const isOverLimit = wipLimit > 0 && tasks.length > wipLimit;
  const isAtLimit = wipLimit > 0 && tasks.length === wipLimit;

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
  });

  const taskIds = tasks.map((task) => task.id);
  const sortableTaskIds = taskIds.map((taskId) => `task-${taskId}`);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onColumnClick?.(id)}
            className="text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:text-accent"
          >
            {title}
          </button>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-hover text-xs font-mono text-muted">
            {tasks.length}
          </span>
        </div>

        {wipLimit > 0 ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
              isOverLimit
                ? "bg-red-900/30 text-danger"
                : isAtLimit
                  ? "bg-yellow-900/30 text-warning"
                  : "bg-surface-hover text-muted"
            }`}
          >
            {tasks.length}/{wipLimit}
          </span>
        ) : null}
      </div>

      <SortableContext
        items={sortableTaskIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex min-h-35 flex-col gap-2 rounded-3xl border border-dashed p-2 transition-colors duration-200 ${
            isOver
              ? "border-accent/50 bg-emerald-950/10"
              : isOverLimit
                ? "border-danger/30 bg-red-950/10"
                : "border-border bg-surface/40"
          }`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              id={`task-${task.id}`}
              title={task.title}
              description={task.description}
              priority={task.priority}
              tags={task.tags}
              onClick={() => onTaskClick?.(task.id)}
            />
          ))}

          {tasks.length === 0 ? (
            <div className="flex h-30 items-center justify-center font-mono text-xs text-muted-subtle">
              No tasks
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
