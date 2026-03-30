import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import type { TaskData } from "./types";

interface BoardColumnProps {
  id: number;
  title: string;
  wipLimit: number;
  tasks: TaskData[];
}

export function BoardColumn({ id, title, wipLimit, tasks }: BoardColumnProps) {
  const isOverLimit = wipLimit > 0 && tasks.length > wipLimit;
  const isAtLimit = wipLimit > 0 && tasks.length === wipLimit;

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">{title}</h2>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-xs font-mono text-zinc-500">
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
                  : "bg-zinc-900 text-zinc-500"
            }`}
          >
            WIP: {wipLimit}
          </span>
        ) : null}
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-32 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors duration-200 ${
            isOver
              ? "border-accent/50 bg-emerald-950/10"
              : isOverLimit
                ? "border-danger/30 bg-red-950/10"
                : "border-border bg-zinc-900/30"
          }`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              priority={task.priority}
              tags={task.tags}
            />
          ))}

          {tasks.length === 0 ? (
            <div className="flex h-20 items-center justify-center font-mono text-xs text-zinc-600">
              No tasks
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
