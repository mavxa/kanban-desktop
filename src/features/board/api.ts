import { invoke } from "@tauri-apps/api/core";
import { FALLBACK_COLUMNS } from "./mock-data";
import type { ColumnData, MoveTaskInput } from "./types";

export async function getBoardData(): Promise<ColumnData[]> {
  try {
    return await invoke<ColumnData[]>("get_board_data");
  } catch {
    return FALLBACK_COLUMNS;
  }
}

export async function moveTask(input: MoveTaskInput): Promise<void> {
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
