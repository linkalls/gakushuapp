import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";
import * as schema from "./drizzle-schema";

let sqliteDb: Database | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function getDatabase(): Database {
  if (sqliteDb) return sqliteDb;

  // Database file location
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gakushu.db");

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!Bun.file(dataDir).exists) {
    Bun.spawn(["mkdir", "-p", dataDir]);
  }

  // Initialize database
  sqliteDb = new Database(dbPath, { create: true });

  // Enable foreign keys
  sqliteDb.run("PRAGMA foreign_keys = ON");

  // Initialize Drizzle
  drizzleDb = drizzle(sqliteDb, { schema });

  // Insert demo user if not exists (using raw SQL for initial setup)
  const demoUserExists = sqliteDb
    .query("SELECT COUNT(*) as count FROM users WHERE id = ?")
    .get("demo-user") as { count: number } | undefined;

  if (!demoUserExists || demoUserExists.count === 0) {
    const timestamp = Date.now();
    try {
      sqliteDb
        .query(
          "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run(
          "demo-user",
          "demo@gakushu.app",
          "Demo User",
          timestamp,
          timestamp
        );
      console.log("✅ Demo user created");
    } catch (e) {
      // User might already exist, ignore
    }
  }

  console.log(`✅ Database initialized at: ${dbPath}`);

  return sqliteDb;
}

export function getDrizzle() {
  if (!drizzleDb) {
    getDatabase(); // Initialize if not already done
  }
  return drizzleDb!;
}

export function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    drizzleDb = null;
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
export const drizzleDatabase = getDrizzle();
