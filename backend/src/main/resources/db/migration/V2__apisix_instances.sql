CREATE TABLE IF NOT EXISTS apisix_instances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  admin_url   TEXT NOT NULL,
  api_key     TEXT NOT NULL,
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
