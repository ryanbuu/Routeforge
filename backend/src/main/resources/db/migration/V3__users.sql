CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'USER',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_instances (
  user_id     INTEGER NOT NULL,
  instance_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, instance_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES apisix_instances(id) ON DELETE CASCADE
);
