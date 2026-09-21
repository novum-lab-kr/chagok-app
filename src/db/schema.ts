export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS goals (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     board_type TEXT NOT NULL CHECK (board_type IN ('calendar','tally')),
     total_slots INTEGER,
     created_at INTEGER NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS stickers (
     id TEXT PRIMARY KEY NOT NULL,
     goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
     placed_at INTEGER NOT NULL,
     slot_index INTEGER NOT NULL,
     sticker_type TEXT NOT NULL DEFAULT 'stamp'
   );`,
  `CREATE INDEX IF NOT EXISTS idx_stickers_goal ON stickers(goal_id);`,
  `CREATE TABLE IF NOT EXISTS records (
     id TEXT PRIMARY KEY NOT NULL,
     sticker_id TEXT NOT NULL UNIQUE REFERENCES stickers(id) ON DELETE CASCADE,
     photo_uri TEXT,
     memo TEXT,
     created_at INTEGER NOT NULL
   );`,
];
