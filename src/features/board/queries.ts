import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { createTask, getBoardData } from "./api";
import { FALLBACK_COLUMNS } from "./mock-data";
import { boardQueryKey } from "./query-keys";
import type { ColumnData, CreateTaskInput, TaskData } from "./types";

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
