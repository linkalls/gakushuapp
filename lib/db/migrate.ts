import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = "./data/gakushukun.db";

// データベースファイルのディレクトリが存在しない場合は作成
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch (error) {
  // ディレクトリが既に存在する場合は無視
}

const sqlite = new Database(dbPath, { create: true });
const db = drizzle(sqlite);

async function runMigration() {
  console.log("Running migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  sqlite.close();
}

runMigration();
