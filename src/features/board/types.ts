export type Priority = "low" | "medium" | "high";

export interface BoardColumnProps {
  id: number;
  title: string;
  wipLimit: number;
  tasks: TaskData[];
  onTaskClick?: (taskId: string) => void;
  onColumnClick?: (columnId: number) => void;
}

export interface KanbanBoardProps {
  initialColumns: ColumnData[];
  onColumnsChange?: (columns: ColumnData[]) => void;
  onTaskClick?: (taskId: string) => void;
  onColumnClick?: (columnId: number) => void;
}

export interface DragStartMeta {
  fromColumnId: number;
  fromPosition: number;
}

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

export interface FilterState {
  search: string;
  priorities: Priority[];
  tags: string[];
}

export interface UpdateTaskInput {
  taskId: number;
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
}

export interface DeleteTaskInput {
  taskId: number;
}

export interface CreateColumnInput {
  title: string;
  wipLimit: number;
}

export interface UpdateColumnInput {
  columnId: number;
  title: string;
  wipLimit: number;
}

export interface DeleteColumnInput {
  columnId: number;
}
