import type {
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
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
import { useCallback, useRef, useState } from "react";
import { moveTask } from "./api";
import { BoardColumn } from "./BoardColumn";
import { TaskCardPreview } from "./TaskCard";
import type {
  ColumnData,
  TaskData,
  KanbanBoardProps,
  DragStartMeta,
} from "./types";

export function KanbanBoard({
  initialColumns,
  onColumnsChange,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnData[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const dragStartMetaRef = useRef<DragStartMeta | null>(null);
  const columnsRef = useRef(initialColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 12 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getTaskId = useCallback((id: UniqueIdentifier) => {
    const raw = String(id);
    return raw.startsWith("task-") ? raw.slice("task-".length) : raw;
  }, []);

  const findColumnByTaskId = useCallback(
    (taskId: UniqueIdentifier): ColumnData | undefined => {
      return columnsRef.current.find((column) =>
        column.tasks.some((task) => task.id === String(taskId)),
      );
    },
    [],
  );

  const findColumnById = useCallback(
    (columnId: string): ColumnData | undefined => {
      const normalizedId = columnId.startsWith("column-")
        ? columnId.slice("column-".length)
        : columnId;
      return columnsRef.current.find(
        (column) => String(column.id) === normalizedId,
      );
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const activeTaskId = getTaskId(active.id);
      const column = findColumnByTaskId(activeTaskId);
      const task = column?.tasks.find((item) => item.id === activeTaskId);

      if (column) {
        const fromPosition = column.tasks.findIndex(
          (item) => item.id === activeTaskId,
        );
        dragStartMetaRef.current = {
          fromColumnId: column.id,
          fromPosition,
        };
      }

      if (task) {
        setActiveTask(task);
      }
    },
    [findColumnByTaskId, getTaskId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) {
        return;
      }

      const activeId = getTaskId(active.id);
      const overId = String(over.id);
      const dragStartMeta = dragStartMetaRef.current;
      dragStartMetaRef.current = null;

      if (!dragStartMeta) {
        return;
      }

      const currentColumns = columnsRef.current;
      let toColumn = findColumnById(overId);
      let toPosition = -1;
      let nextColumns: ColumnData[] | null = null;

      if (toColumn) {
        const sourceColumn = currentColumns.find(
          (column) => column.id === dragStartMeta.fromColumnId,
        );
        if (!sourceColumn) {
          return;
        }

        const activeIndex = sourceColumn.tasks.findIndex(
          (task) => task.id === activeId,
        );
        if (activeIndex === -1) {
          return;
        }

        if (sourceColumn.id === toColumn.id) {
          toPosition = sourceColumn.tasks.length - 1;

          if (activeIndex === toPosition) {
            return;
          }

          const reorderedTasks = arrayMove(
            sourceColumn.tasks,
            activeIndex,
            toPosition,
          );
          nextColumns = currentColumns.map((column) => {
            if (column.id === sourceColumn.id) {
              return { ...column, tasks: reorderedTasks };
            }
            return column;
          });
        } else {
          const targetColumnId = toColumn.id;
          const movingTask = sourceColumn.tasks[activeIndex];
          const sourceTasks = sourceColumn.tasks.filter(
            (task) => task.id !== activeId,
          );
          const destinationTasks = [...toColumn.tasks, movingTask];
          toPosition = destinationTasks.length - 1;

          nextColumns = currentColumns.map((column) => {
            if (column.id === sourceColumn.id) {
              return { ...column, tasks: sourceTasks };
            }
            if (column.id === targetColumnId) {
              return { ...column, tasks: destinationTasks };
            }
            return column;
          });
        }
      } else {
        toColumn = findColumnByTaskId(getTaskId(overId));
        if (!toColumn) {
          return;
        }

        const sourceColumn = currentColumns.find(
          (column) => column.id === dragStartMeta.fromColumnId,
        );
        if (!sourceColumn) {
          return;
        }

        const activeIndex = sourceColumn.tasks.findIndex(
          (task) => task.id === activeId,
        );
        if (activeIndex === -1) {
          return;
        }

        toPosition = toColumn.tasks.findIndex(
          (task) => task.id === getTaskId(overId),
        );

        if (toPosition === -1) {
          return;
        }

        if (sourceColumn.id === toColumn.id) {
          if (activeIndex === toPosition) {
            return;
          }

          const reorderedTasks = arrayMove(
            sourceColumn.tasks,
            activeIndex,
            toPosition,
          );
          nextColumns = currentColumns.map((column) => {
            if (column.id === sourceColumn.id) {
              return { ...column, tasks: reorderedTasks };
            }
            return column;
          });
        } else {
          const targetColumnId = toColumn.id;
          const movingTask = sourceColumn.tasks[activeIndex];
          const sourceTasks = sourceColumn.tasks.filter(
            (task) => task.id !== activeId,
          );
          const destinationTasks = [...toColumn.tasks];
          destinationTasks.splice(toPosition, 0, movingTask);

          nextColumns = currentColumns.map((column) => {
            if (column.id === sourceColumn.id) {
              return { ...column, tasks: sourceTasks };
            }
            if (column.id === targetColumnId) {
              return { ...column, tasks: destinationTasks };
            }
            return column;
          });
        }
      }

      if (toPosition === -1) {
        return;
      }

      if (!toColumn) {
        return;
      }

      if (
        dragStartMeta.fromColumnId === toColumn.id &&
        dragStartMeta.fromPosition === toPosition
      ) {
        return;
      }

      if (nextColumns) {
        columnsRef.current = nextColumns;
        setColumns(nextColumns);
        onColumnsChange?.(nextColumns);
      }

      void moveTask({
        taskId: Number(activeId),
        toColumnId: toColumn.id,
        toPosition,
      });
    },
    [findColumnById, findColumnByTaskId, getTaskId, onColumnsChange],
  );

  return (
    <DndContext
      id="kanban-dnd"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
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
