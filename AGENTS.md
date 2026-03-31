# AGENTS.md

Guidance for AI coding agents operating in this repository.

## Project Overview

Desktop Kanban application (coursework/product project) with local-first architecture.

- **Core/Backend:** Tauri (Rust)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS 4.1
- **Local DB:** SQLite
- **Package manager:** Bun (lockfile: `bun.lock`)

This file defines the working conventions for all future coding sessions.

## Commands

```sh
bun install              # Install dependencies
bun run dev              # Frontend dev server (Vite)
bun run build            # Type-check + production frontend build
bun run lint             # ESLint
bun run preview          # Preview production build
```

### Tauri Commands (when `src-tauri` is configured)

```sh
bunx tauri dev           # Run desktop app in development
bunx tauri build         # Build desktop binaries
```

## Project Structure (target)

```text
mavxa-kanban-desktop/
  src/                     # React frontend
    components/            # Reusable UI components
    features/              # Feature modules (board, tasks, filters, etc.)
    lib/                   # Shared utilities/helpers
    App.tsx                # Root app component
    main.tsx               # Frontend entry point
    index.css              # Tailwind imports + global styles
  src-tauri/               # Tauri backend (Rust)
    src/
      main.rs              # Tauri app entry
      db/                  # SQLite access layer (if split by modules)
    tauri.conf.json        # Tauri config
  public/                  # Static assets
```

## Code Style

### TypeScript / React

- Strict TypeScript only (`tsconfig` strict mode expected).
- Use `import type { ... }` for type-only imports.
- Prefer named exports for reusable components/hooks.
- Avoid `any`; use precise domain types (`Task`, `Column`, `Board`, etc.).
- Keep components focused; move non-UI logic into hooks/services.

### Rust (Tauri)

- Prefer small Tauri commands with explicit input/output structs.
- Use `Result<T, E>` and convert errors into user-safe messages.
- Keep DB logic isolated from window/command wiring.
- Use `rustfmt` defaults and idiomatic ownership/borrowing patterns.

### Styling

- Tailwind CSS 4.1 utilities in JSX.
- Keep design tokens in CSS variables (colors, spacing, radius, shadows).
- Mobile-first responsive layout.
- Maintain clear visual hierarchy for board columns/cards and states.

### Naming

| Element             | Convention  | Example                     |
|---------------------|-------------|-----------------------------|
| React components    | PascalCase  | `TaskCard.tsx`              |
| Hooks               | camelCase   | `useBoardStore.ts`          |
| Utilities/services  | kebab-case  | `task-filters.ts`           |
| Rust modules/files  | snake_case  | `task_repo.rs`              |
| Types/interfaces    | PascalCase  | `Task`, `BoardColumn`       |
| CSS variables       | kebab-case  | `--color-board-surface`     |

### Formatting

- 2-space indentation (TS/TSX/CSS).
- Semicolons in TS/TSX.
- Double quotes in TS/TSX.
- Keep imports grouped logically: types, external, internal.

## Architecture Notes

- Frontend communicates with Tauri via `invoke` commands.
- SQLite is the source of truth for board/task data.
- Prefer local-first flows: optimistic UI + reliable persistence.
- Keep domain logic (task moves, WIP rules, sorting) deterministic.

## Safety Rules for Agents

- Do not introduce secrets/keys into tracked files.
- Do not change stack choices without explicit user request.
- Before large refactors, preserve feature parity and run lint/build checks.
- When uncertain, follow existing code patterns in this repo.

---

## Current State & TODO

**Обновляй этот раздел в конце каждой сессии.**

### Done

- [x] AGENTS.md migrated from old project and adapted to desktop stack
- [x] Stack baseline fixed: Tauri (Rust) + React/TS/Vite/Tailwind 4.1 + SQLite
- [x] `src-tauri` initialized and connected to Vite frontend
- [x] Web kanban design ported to desktop React app (board header, columns, cards, DnD)
- [x] SQLite local schema + seed bootstrap implemented in Tauri backend
- [x] Tauri commands wired: `get_board_data`, `move_task`
- [x] Frontend switched to Tauri `invoke` with fallback mock data
- [x] Added desktop scripts: `tauri:dev`, `tauri:build`
- [x] Frontend checks passing (`bun run lint`, `bun run build`)
- [x] SQLite layer split into `src-tauri/src/db` modules (`connection`, `migrations`, `seed`, `repo`)
- [x] Added first SQL migration (`src-tauri/migrations/001_init.sql`) with indexes/constraints
- [x] Refactored Tauri commands to use DB module API
- [x] ESLint ignores updated for generated Tauri build artifacts

### Next Up

- [ ] Implement full CRUD commands (create/update/delete task, columns)
- [ ] Add WIP-limit enforcement in backend move/create commands
- [ ] Add basic integration tests for Tauri commands
- [ ] Produce first successful release bundle test (exe/msi on Windows)

### Session Log

**Session 1 (2026-03-30):** Migrated AGENTS.md from `~/zed/old-mavxa-kanban` to `~/zed/mavxa-kanban-desktop`, replacing old web stack assumptions with target desktop stack (Tauri + React/TS/Vite/Tailwind 4.1 + SQLite).

**Session 2 (2026-03-30):** Began full desktop migration from old web project. Ported kanban UI design and drag-and-drop flow into React/Vite app, initialized Tauri (`src-tauri`), added local SQLite schema+seed bootstrap via `rusqlite`, and wired Tauri commands for board load and task move with optimistic frontend updates through `@tauri-apps/api`. Added `tauri:dev`/`tauri:build` scripts. Frontend lint/build pass; first bundle attempt blocked by crates.io network timeout during Rust dependency download.

**Session 3 (2026-03-31):** Refactored SQLite integration into dedicated Tauri DB modules: connection/path handling, SQL migrations via `PRAGMA user_version`, seed bootstrap, and repository functions for board read + task move transaction. Added migration file `001_init.sql` (tables, constraints, indexes), kept command behavior stable (`get_board_data`, `move_task`), and updated ESLint ignores to skip `src-tauri/target` generated files. Frontend lint/build pass.
