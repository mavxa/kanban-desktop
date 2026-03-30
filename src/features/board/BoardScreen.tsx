import { useEffect, useState } from "react";
import { getBoardData } from "./api";
import { KanbanBoard } from "./KanbanBoard";
import { FALLBACK_COLUMNS } from "./mock-data";
import type { ColumnData } from "./types";

export function BoardScreen() {
  const [columns, setColumns] = useState<ColumnData[]>(FALLBACK_COLUMNS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isDisposed = false;

    async function load() {
      try {
        const boardColumns = await getBoardData();
        if (!isDisposed) {
          setColumns(boardColumns.length > 0 ? boardColumns : FALLBACK_COLUMNS);
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isDisposed = true;
    };
  }, []);

  return (
    <section className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-200 antialiased">
      <header className="flex items-center justify-between border-b border-border bg-surface/50 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">Kanban Board</h1>
          <span className="rounded-md border border-border bg-zinc-900 px-2 py-0.5 text-xs font-mono text-zinc-400">
            Tauri MVP
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-zinc-400 transition-all duration-200 hover:border-border-hover hover:text-zinc-100"
          >
            Filters
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-zinc-950 transition-all duration-200 hover:bg-accent-hover"
          >
            New Task
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading board...</div>
        ) : (
          <KanbanBoard initialColumns={columns} />
        )}
      </main>
    </section>
  );
}
