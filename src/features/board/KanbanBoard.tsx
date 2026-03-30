import type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useRef, useState, useTransition } from "react";
import { moveTask } from "./api";
import { BoardColumn } from "./BoardColumn";
import { TaskCardPreview } from "./TaskCard";
import type { ColumnData, TaskData } from "./types";

interface KanbanBoardProps {
  initialColumns: ColumnData[];
}

interface DragStartMeta {
  fromColumnId: number;
  fromPosition: number;
}

export function KanbanBoard({ initialColumns }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnData[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const [, startTransition] = useTransition();
  const dragStartMetaRef = useRef<DragStartMeta | null>(null);
  const columnsRef = useRef(initialColumns);

  const setColumnsAndSync = useCallback((updater: (prev: ColumnData[]) => ColumnData[]) => {
    setColumns((prev) => {
      const next = updater(prev);
      columnsRef.current = next;
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findColumnByTaskId = useCallback((taskId: UniqueIdentifier): ColumnData | undefined => {
    return columnsRef.current.find((column) => column.tasks.some((task) => task.id === String(taskId)));
  }, []);

  const findColumnById = useCallback((columnId: string): ColumnData | undefined => {
    const normalizedId = columnId.startsWith("column-") ? columnId.slice("column-".length) : columnId;
    return columnsRef.current.find((column) => String(column.id) === normalizedId);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const column = findColumnByTaskId(active.id);
      const task = column?.tasks.find((item) => item.id === String(active.id));

      if (column) {
        const fromPosition = column.tasks.findIndex((item) => item.id === String(active.id));
        dragStartMetaRef.current = {
          fromColumnId: column.id,
          fromPosition,
        };
      }

      if (task) {
        setActiveTask(task);
      }
    },
    [findColumnByTaskId],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeColumn = findColumnByTaskId(activeId);
      let overColumn = findColumnByTaskId(overId);

      if (!overColumn) {
        overColumn = findColumnById(overId);
      }

      if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) {
        return;
      }

      setColumnsAndSync((prev) => {
        const activeCol = prev.find((column) => column.id === activeColumn.id);
        const overCol = prev.find((column) => column.id === overColumn.id);

        if (!activeCol || !overCol) {
          return prev;
        }

        const task = activeCol.tasks.find((item) => item.id === activeId);
        if (!task) {
          return prev;
        }

        const overTaskIndex = overCol.tasks.findIndex((item) => item.id === overId);
        const insertIndex = overTaskIndex >= 0 ? overTaskIndex : overCol.tasks.length;

        return prev.map((column) => {
          if (column.id === activeColumn.id) {
            return {
              ...column,
              tasks: column.tasks.filter((item) => item.id !== activeId),
            };
          }

          if (column.id === overColumn.id) {
            const nextTasks = [...column.tasks];
            nextTasks.splice(insertIndex, 0, task);
            return {
              ...column,
              tasks: nextTasks,
            };
          }

          return column;
        });
      });
    },
    [findColumnByTaskId, findColumnById, setColumnsAndSync],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);
      const dragStartMeta = dragStartMetaRef.current;
      dragStartMetaRef.current = null;

      if (!dragStartMeta) {
        return;
      }

      const currentColumns = columnsRef.current;
      let toColumn = findColumnById(overId);
      let toPosition = -1;

      if (toColumn) {
        const existingPosition = toColumn.tasks.findIndex((task) => task.id === activeId);
        toPosition = existingPosition === -1 ? toColumn.tasks.length : existingPosition;
      } else {
        toColumn = findColumnByTaskId(overId);
        if (!toColumn) {
          return;
        }
        toPosition = toColumn.tasks.findIndex((task) => task.id === overId);
      }

      if (toPosition === -1) {
        return;
      }

      if (dragStartMeta.fromColumnId === toColumn.id && activeId !== overId) {
        const activeColumn = currentColumns.find((column) => column.id === toColumn.id);
        if (activeColumn) {
          const activeIndex = activeColumn.tasks.findIndex((task) => task.id === activeId);
          const overIndex = activeColumn.tasks.findIndex((task) => task.id === overId);

          if (activeIndex !== -1 && overIndex !== -1) {
            const reorderedTasks = arrayMove(activeColumn.tasks, activeIndex, overIndex);
            setColumnsAndSync((prev) =>
              prev.map((column) => {
                if (column.id === activeColumn.id) {
                  return {
                    ...column,
                    tasks: reorderedTasks,
                  };
                }
                return column;
              }),
            );
            toPosition = overIndex;
          }
        }
      }

      if (dragStartMeta.fromColumnId === toColumn.id && dragStartMeta.fromPosition === toPosition) {
        return;
      }

      startTransition(() => {
        void moveTask({
          taskId: Number(activeId),
          toColumnId: toColumn.id,
          toPosition,
        });
      });
    },
    [findColumnById, findColumnByTaskId, setColumnsAndSync],
  );

  return (
    <DndContext
      id="kanban-dnd"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-w-max gap-4 p-6">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            id={column.id}
            title={column.title}
            wipLimit={column.wipLimit}
            tasks={column.tasks}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 rotate-2 opacity-90">
            <TaskCardPreview
              title={activeTask.title}
              description={activeTask.description}
              priority={activeTask.priority}
              tags={activeTask.tags}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
