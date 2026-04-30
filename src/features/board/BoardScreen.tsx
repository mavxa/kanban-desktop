import { useEffect, useState } from "react";
import { MdBrightnessAuto, MdDarkMode, MdLightMode } from "react-icons/md";
import { getBoardData } from "./api";
import { KanbanBoard } from "./KanbanBoard";
import { FALLBACK_COLUMNS } from "./mock-data";
import type { ColumnData } from "./types";

type ThemeMode = "dark" | "light" | "auto";
type ResolvedTheme = Exclude<ThemeMode, "auto">;

const THEME_STORAGE_KEY = "kanban-desktop-theme";

const themeOptions: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof MdDarkMode;
}> = [
  { mode: "dark", label: "Dark", icon: MdDarkMode },
  { mode: "light", label: "Light", icon: MdLightMode },
  { mode: "auto", label: "Auto", icon: MdBrightnessAuto },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light" || value === "auto";
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(storedTheme) ? storedTheme : "auto";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "auto") {
    return mode;
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function BoardScreen() {
  const [columns, setColumns] = useState<ColumnData[]>(FALLBACK_COLUMNS);
  const [isLoading, setIsLoading] = useState(true);
  const [boardRevision, setBoardRevision] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getInitialThemeMode()),
  );

  useEffect(() => {
    let isDisposed = false;

    async function load() {
      try {
        const boardColumns = await getBoardData();
        if (!isDisposed) {
          setColumns(boardColumns.length > 0 ? boardColumns : FALLBACK_COLUMNS);
          setBoardRevision((value) => value + 1);
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

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme() {
      const nextTheme = resolveTheme(themeMode);
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      setResolvedTheme(nextTheme);
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyTheme();

    if (themeMode !== "auto") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [themeMode]);

  return (
    <section className="flex h-screen flex-col overflow-hidden bg-background text-foreground antialiased">
      <header className="flex items-center justify-between border-b border-border bg-surface/50 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Kanban Board
          </h1>
          <span className="rounded-md border border-border bg-surface-hover px-2 py-0.5 text-xs font-mono text-muted">
            MVP
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-all duration-200 hover:border-border-hover hover:text-foreground"
          >
            Filters
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-accent-hover"
          >
            New Task
          </button>
          <div
            aria-label={`Theme: ${themeMode}, resolved ${resolvedTheme}`}
            className="flex rounded-full border border-border bg-surface p-1"
            role="group"
          >
            {themeOptions.map(({ mode, label, icon: Icon }) => {
              const isActive = themeMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  aria-label={`${label} theme`}
                  aria-pressed={isActive}
                  title={label}
                  onClick={() => setThemeMode(mode)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading board...
          </div>
        ) : (
          <KanbanBoard key={boardRevision} initialColumns={columns} />
        )}
      </main>
    </section>
  );
}
