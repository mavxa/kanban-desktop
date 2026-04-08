import { invoke } from "@tauri-apps/api/core";
import { FALLBACK_COLUMNS } from "./mock-data";
import type { ColumnData, MoveTaskInput } from "./types";

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
