import { Database } from "bun:sqlite";
import path from "path";
import { createTablesSQL } from "./schema";

let db: Database | null = null;

export function getDatabase(): Database {
  if (db) return db;

  // Database file location
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gakushu.db");

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!Bun.file(dataDir).exists) {
    Bun.spawn(["mkdir", "-p", dataDir]);
  }

  // Initialize database
  db = new Database(dbPath, { create: true });

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  // Create tables
  db.run(createTablesSQL);

  // Insert demo user if not exists
  const demoUserExists = db
    .query("SELECT COUNT(*) as count FROM users WHERE id = ?")
    .get("demo-user") as { count: number };

  if (demoUserExists.count === 0) {
    const timestamp = Date.now();
    db.query(
      "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run("demo-user", "demo@gakushu.app", "Demo User", timestamp, timestamp);
    console.log("✅ Demo user created");
  }

  console.log(`✅ Database initialized at: ${dbPath}`);

  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Utility functions for common operations
export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

// Initialize database on import
export const database = getDatabase();
