import { invoke } from "@tauri-apps/api/core";
import { FALLBACK_COLUMNS } from "./mock-data";
import type { ColumnData, MoveTaskInput } from "./types";

function isRunningInTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getBoardData(): Promise<ColumnData[]> {
  if (!isRunningInTauri()) {
    return FALLBACK_COLUMNS;
  }

  try {
    return await invoke<ColumnData[]>("get_board_data");
  } catch {
    return FALLBACK_COLUMNS;
  }
}

export async function moveTask(input: MoveTaskInput): Promise<void> {
  if (!isRunningInTauri()) {
    return;
  }

  try {
    await invoke("move_task", {
      task_id: input.taskId,
      to_column_id: input.toColumnId,
      to_position: input.toPosition,
    });
  } catch {
    // Keep optimistic UI responsive even if persistence fails.
  }
}
