import { useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { MdClose, MdFilterList, MdSearch } from "react-icons/md";
import type { FilterState, Priority } from "./types";

interface FilterPanelProps {
  filter: FilterState;
  availableTags: string[];
  onChange: (filter: FilterState) => void;
}

const priorities: Priority[] = ["high", "medium", "low"];

const priorityLabels: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityDotStyles: Record<Priority, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-muted",
};

export function FilterPanel({
  filter,
  availableTags,
  onChange,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(filter);

  const activeCount =
    filter.priorities.length + filter.tags.length + (filter.search ? 1 : 0);

  function togglePriority(priority: Priority) {
    const next = draft.priorities.includes(priority)
      ? draft.priorities.filter((p) => p !== priority)
      : [...draft.priorities, priority];
    setDraft({ ...draft, priorities: next });
  }

  function toggleTag(tag: string) {
    const next = draft.tags.includes(tag)
      ? draft.tags.filter((t) => t !== tag)
      : [...draft.tags, tag];
    setDraft({ ...draft, tags: next });
  }

  function applyAndClose() {
    onChange(draft);
    setIsOpen(false);
  }

  function clearAll() {
    const empty: FilterState = { search: "", priorities: [], tags: [] };
    setDraft(empty);
    onChange(empty);
    setIsOpen(false);
  }

  function handleOpen() {
    setDraft(filter);
    setIsOpen(true);
  }

  useHotkey("Enter", () => applyAndClose(), { enabled: isOpen });
  useHotkey("Escape", () => setIsOpen(false), { enabled: isOpen });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? applyAndClose() : handleOpen())}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
          activeCount > 0
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-surface text-muted hover:border-border-hover hover:text-foreground"
        }`}
      >
        <MdFilterList className="text-base" />
        Filters
        {activeCount > 0 ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-border bg-surface p-4 shadow-2xl shadow-black/40"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            <div className="flex items-center gap-1">
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded px-2 py-0.5 text-xs text-muted transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Apply and close filters"
                onClick={applyAndClose}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <MdClose className="text-sm" />
              </button>
            </div>
          </div>

          <div className="mb-3">
            <div className="relative">
              <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted" />
              <input
                type="text"
                value={draft.search}
                onChange={(e) =>
                  setDraft({ ...draft, search: e.target.value })
                }
                autoFocus
                placeholder="Search tasks..."
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-subtle focus:border-accent"
              />
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted">Priority</p>
            <div className="flex flex-wrap gap-1.5">
              {priorities.map((priority) => {
                const isActive = draft.priorities.includes(priority);
                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => togglePriority(priority)}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-background text-muted hover:border-border-hover hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${priorityDotStyles[priority]}`}
                    />
                    {priorityLabels[priority]}
                  </button>
                );
              })}
            </div>
          </div>

          {availableTags.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Tags</p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {availableTags.map((tag) => {
                  const isActive = draft.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all ${
                        isActive
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-background text-muted hover:border-border-hover hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={applyAndClose}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
