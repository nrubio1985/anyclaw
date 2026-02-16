import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.ANYCLAW_DB_PATH || path.join(process.cwd(), "data", "anyclaw.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      template_id TEXT NOT NULL,
      personality TEXT DEFAULT '',
      rules TEXT DEFAULT '',
      status TEXT DEFAULT 'created' CHECK(status IN ('created','linking','active','paused','error')),
      whatsapp_session TEXT,
      config_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      date TEXT NOT NULL,
      messages_in INTEGER DEFAULT 0,
      messages_out INTEGER DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      UNIQUE(agent_id, date)
    );

    CREATE TABLE IF NOT EXISTS gateways (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      profile TEXT UNIQUE NOT NULL,
      port INTEGER UNIQUE NOT NULL,
      status TEXT DEFAULT 'created' CHECK(status IN ('created','starting','pairing','connected','stopped','error')),
      phone TEXT,
      pid INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_usage_agent_date ON agent_usage(agent_id, date);
    CREATE INDEX IF NOT EXISTS idx_gateways_user ON gateways(user_id);
    CREATE INDEX IF NOT EXISTS idx_gateways_status ON gateways(status);
  `);
}

// --- Types ---

export interface User {
  id: string;
  phone: string;
  name: string;
  created_at: string;
  last_seen: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  template_id: string;
  personality: string;
  rules: string;
  status: "created" | "linking" | "active" | "paused" | "error";
  whatsapp_session: string | null;
  config_json: string;
  created_at: string;
  updated_at: string;
}

export interface AgentUsage {
  id: number;
  agent_id: string;
  date: string;
  messages_in: number;
  messages_out: number;
  tokens_used: number;
}
