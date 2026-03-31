CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  wip_limit INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  column_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  position INTEGER NOT NULL,
  FOREIGN KEY (column_id) REFERENCES columns (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3f3f46',
  FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_tags (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_history (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  from_column_id INTEGER,
  to_column_id INTEGER NOT NULL,
  moved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  FOREIGN KEY (from_column_id) REFERENCES columns (id),
  FOREIGN KEY (to_column_id) REFERENCES columns (id)
);

CREATE INDEX IF NOT EXISTS idx_columns_board_position ON columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_column_position ON tasks(column_id, position);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);
