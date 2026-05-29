import { invoke } from "@tauri-apps/api/core";
import { FALLBACK_COLUMNS } from "./mock-data";
import type {
  ColumnData,
  CreateColumnInput,
  CreateTaskInput,
  DeleteColumnInput,
  DeleteTaskInput,
  MoveTaskInput,
  TaskData,
  UpdateColumnInput,
  UpdateTaskInput,
} from "./types";

function hasTauriBridge() {
  if (typeof window === "undefined") {
    return false;
  }

  const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
  return Boolean(tauriWindow.__TAURI_INTERNALS__);
}

export async function getBoardData(): Promise<ColumnData[]> {
  if (!hasTauriBridge()) {
    return FALLBACK_COLUMNS;
  }

  try {
    return await invoke<ColumnData[]>("get_board_data");
  } catch {
    return FALLBACK_COLUMNS;
  }
}

export async function moveTask(input: MoveTaskInput): Promise<void> {
  if (!hasTauriBridge()) {
    return;
  }

  try {
    await invoke("move_task", {
      taskId: input.taskId,
      toColumnId: input.toColumnId,
      toPosition: input.toPosition,
    });
  } catch (error) {
    console.error("Failed to persist task move", error);
  }
}

export async function createTask(input: CreateTaskInput): Promise<TaskData> {
  if (!hasTauriBridge()) {
    return {
      id: `local-${Date.now()}`,
      title: input.title,
      description: input.description,
      priority: input.priority,
      tags: input.tags,
    };
  }

  return await invoke<TaskData>("create_task", {
    columnId: input.columnId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    tags: input.tags,
  });
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskData> {
  if (!hasTauriBridge()) {
    return {
      id: String(input.taskId),
      title: input.title,
      description: input.description,
      priority: input.priority,
      tags: input.tags,
    };
  }

  return await invoke<TaskData>("update_task", {
    taskId: input.taskId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    tags: input.tags,
  });
}

export async function deleteTask(input: DeleteTaskInput): Promise<void> {
  if (!hasTauriBridge()) {
    return;
  }

  try {
    await invoke("delete_task", { taskId: input.taskId });
  } catch (error) {
    console.error("Failed to delete task", error);
    throw error;
  }
}

export async function createColumn(
  input: CreateColumnInput,
): Promise<ColumnData> {
  if (!hasTauriBridge()) {
    return {
      id: Date.now(),
      title: input.title,
      wipLimit: input.wipLimit,
      tasks: [],
    };
  }

  return await invoke<ColumnData>("create_column", {
    title: input.title,
    wipLimit: input.wipLimit,
  });
}

export async function updateColumn(input: UpdateColumnInput): Promise<void> {
  if (!hasTauriBridge()) {
    return;
  }

  await invoke("update_column", {
    columnId: input.columnId,
    title: input.title,
    wipLimit: input.wipLimit,
  });
}

export async function deleteColumn(input: DeleteColumnInput): Promise<void> {
  if (!hasTauriBridge()) {
    return;
  }

  await invoke("delete_column", { columnId: input.columnId });
}
