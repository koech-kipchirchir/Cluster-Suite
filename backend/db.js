const sqlite3 = require("sqlite3").verbose();

// Creates or opens your database file
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// =======================
// USERS TABLE
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

// =======================
// TASKS TABLE (ENHANCED)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    notes TEXT,
    category TEXT,
    board TEXT,
    priority TEXT,
    due_date TEXT,
    recurrence TEXT,
    reminder_date TEXT,
    reminder_time TEXT,
    reminder_channel TEXT,
    completed INTEGER DEFAULT 0,
    user_id INTEGER,
    time_spent_minutes INTEGER DEFAULT 0,
    estimated_minutes INTEGER,
    is_tracking INTEGER DEFAULT 0,
    ai_insights TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// =======================
// SUBTASKS TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )
`);

// =======================
// TAGS TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    UNIQUE(name, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// =======================
// TASK_TAGS JUNCTION TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )
`);

// =======================
// EVENTS TABLE (PLANNER)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT,
    budget_goal REAL DEFAULT 0,
    current_savings REAL DEFAULT 0,
    notes TEXT,
    ai_plan TEXT,
    user_id INTEGER,
    type TEXT DEFAULT 'General', -- New column for event type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// =======================
// WALLETS TABLE
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    target_amount REAL DEFAULT 0,
    notes TEXT,
    user_id INTEGER,
    type TEXT DEFAULT 'Savings',
    event_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
  )
`);

// =======================
// EVENT TEMPLATES TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS event_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    budget_goal REAL DEFAULT 0,
    preset_wallets TEXT,
    ai_tips TEXT,
    user_id INTEGER,
    is_system INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// =======================
// TASK TEMPLATES TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    priority TEXT,
    estimated_minutes INTEGER,
    tags TEXT,
    subtasks TEXT,
    user_id INTEGER,
    is_system INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// =======================
// TASK DEPENDENCIES TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    depends_on_task_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )
`);

// =======================
// AI CACHE TABLE (NEW)
// =======================
db.run(`
  CREATE TABLE IF NOT EXISTS ai_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prompt_hash TEXT NOT NULL,
    prompt TEXT,
    response TEXT,
    cache_type TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, prompt_hash, cache_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Add new columns for existing databases if they are missing
const migrations = [
  "ALTER TABLE tasks ADD COLUMN notes TEXT",
  "ALTER TABLE tasks ADD COLUMN board TEXT",
  "ALTER TABLE tasks ADD COLUMN recurrence TEXT",
  "ALTER TABLE tasks ADD COLUMN reminder_date TEXT",
  "ALTER TABLE tasks ADD COLUMN reminder_time TEXT",
  "ALTER TABLE tasks ADD COLUMN reminder_channel TEXT",
  "ALTER TABLE tasks ADD COLUMN time_spent_minutes INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER",
  "ALTER TABLE tasks ADD COLUMN is_tracking INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN ai_insights TEXT",
  "ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP",
  "ALTER TABLE tasks ADD COLUMN created_at TIMESTAMP",
  "ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP",
  "ALTER TABLE events ADD COLUMN type TEXT DEFAULT 'General'", // Migration for new event type column
  "ALTER TABLE events ADD COLUMN notes TEXT",
  "ALTER TABLE events ADD COLUMN ai_plan TEXT",
  "ALTER TABLE wallets ADD COLUMN event_id INTEGER",
  "ALTER TABLE users ADD COLUMN country TEXT",
  "ALTER TABLE users ADD COLUMN currency TEXT",
  // Backfill defaults
  "UPDATE users SET country = 'Kenya' WHERE country IS NULL",
  "UPDATE users SET currency = 'KES' WHERE currency IS NULL",
];

db.serialize(() => {
  migrations.forEach((statement) => {
    db.run(statement, (err) => {
      if (err) {
        if (err.message.includes("duplicate column name")) {
          console.log(`Migration skipped (column exists): ${statement}`);
        } else {
          console.error(`Migration error for statement "${statement}":`, err.message);
        }
      }
    });
  });

  // =======================
  // CREATE INDEXES FOR PERFORMANCE
  // =======================
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_wallets_event_id ON wallets(event_id)",
    "CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)",
    "CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id)",
    "CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)",
    "CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_ai_cache_user_prompt ON ai_cache(user_id, prompt_hash)",
    "CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at)",
  ];

  indexes.forEach((statement) => {
    db.run(statement, (err) => {
      if (err && !err.message.includes("already exists")) {
        console.error(`Index creation error: ${statement}`, err.message);
      }
    });
  });
});

module.exports = db;