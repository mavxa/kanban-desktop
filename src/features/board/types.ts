export type Priority = "low" | "medium" | "high";

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
}

export interface ColumnData {
  id: number;
  title: string;
  wipLimit: number;
  tasks: TaskData[];
}

export interface MoveTaskInput {
  taskId: number;
  toColumnId: number;
  toPosition: number;
}

export interface CreateTaskInput {
  columnId: number;
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
}

export interface NewTaskDraft {
  columnId: number;
  title: string;
  description: string;
  priority: Priority;
  tags: string;
}
