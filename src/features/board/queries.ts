import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import {
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  getBoardData,
  updateColumn,
  updateTask,
} from "./api";
import { FALLBACK_COLUMNS } from "./mock-data";
import { boardQueryKey } from "./query-keys";
import type {
  ColumnData,
  CreateColumnInput,
  CreateTaskInput,
  DeleteColumnInput,
  DeleteTaskInput,
  TaskData,
  UpdateColumnInput,
  UpdateTaskInput,
} from "./types";

export function useBoardDataQuery() {
  return useQuery({
    queryKey: boardQueryKey,
    queryFn: getBoardData,
    select: (boardColumns) =>
      boardColumns.length > 0 ? boardColumns : FALLBACK_COLUMNS,
  });
}

export function useUpdateBoardColumns() {
  const queryClient = useQueryClient();

  return (nextColumns: ColumnData[]) => {
    queryClient.setQueryData(boardQueryKey, nextColumns);
  };
}

export function useCreateTaskMutation(
  options?: UseMutationOptions<TaskData, Error, CreateTaskInput>,
) {
  return useMutation({
    mutationFn: createTask,
    ...options,
  });
}

export function useUpdateTaskMutation(
  options?: UseMutationOptions<TaskData, Error, UpdateTaskInput>,
) {
  return useMutation({
    mutationFn: updateTask,
    ...options,
  });
}

export function useDeleteTaskMutation(
  options?: UseMutationOptions<void, Error, DeleteTaskInput>,
) {
  return useMutation({
    mutationFn: deleteTask,
    ...options,
  });
}

export function useCreateColumnMutation(
  options?: UseMutationOptions<ColumnData, Error, CreateColumnInput>,
) {
  return useMutation({
    mutationFn: createColumn,
    ...options,
  });
}

export function useUpdateColumnMutation(
  options?: UseMutationOptions<void, Error, UpdateColumnInput>,
) {
  return useMutation({
    mutationFn: updateColumn,
    ...options,
  });
}

export function useDeleteColumnMutation(
  options?: UseMutationOptions<void, Error, DeleteColumnInput>,
) {
  return useMutation({
    mutationFn: deleteColumn,
    ...options,
  });
}
