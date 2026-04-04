CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  payload     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
