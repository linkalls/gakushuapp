import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";
import * as schema from "./drizzle-schema";

// Initialize SQLite database with absolute path
const dbPath = path.join(process.cwd(), "data", "gakushu.db");
const sqlite = new Database(dbPath, { create: true });

// Enable foreign keys
sqlite.exec("PRAGMA foreign_keys = ON");

// Initialize Drizzle
export const db = drizzle(sqlite, { schema });

// Helper functions
export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

// Export schema for use in queries
export { schema };
