import type { ColumnData } from "./types";

export const FALLBACK_COLUMNS: ColumnData[] = [
  {
    id: 1,
    title: "Backlog",
    wipLimit: 0,
    tasks: [
      {
        id: "1",
        title: "Research drag-and-drop libraries",
        description: "Compare @dnd-kit vs react-beautiful-dnd for kanban",
        priority: "low",
        tags: ["research"],
      },
      {
        id: "2",
        title: "Design SQLite schema",
        description: "Boards, columns, tasks, tags, history",
        priority: "high",
        tags: ["backend", "database"],
      },
    ],
  },
  {
    id: 2,
    title: "To Do",
    wipLimit: 5,
    tasks: [
      {
        id: "3",
        title: "Setup Tauri commands",
        description: "Expose board loading and task movement via invoke",
        priority: "medium",
        tags: ["desktop", "tauri"],
      },
    ],
  },
  {
    id: 3,
    title: "In Progress",
    wipLimit: 3,
    tasks: [
      {
        id: "4",
        title: "Port web kanban design",
        description: "Bring board layout/cards/columns from old web app",
        priority: "high",
        tags: ["frontend", "ui"],
      },
    ],
  },
  {
    id: 4,
    title: "Review",
    wipLimit: 2,
    tasks: [],
  },
  {
    id: 5,
    title: "Done",
    wipLimit: 0,
    tasks: [
      {
        id: "5",
        title: "Initialize Tauri + React app",
        description: "Create desktop shell and Vite frontend",
        priority: "medium",
        tags: ["setup"],
      },
    ],
  },
];
