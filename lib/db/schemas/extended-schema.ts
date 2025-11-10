import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { decks, users } from "../drizzle-schema";

export const sharedDecks = sqliteTable("shared_decks", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  sharedBy: text("shared_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sharedWith: text("shared_with").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const rankings = sqliteTable(
  "rankings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId),
  })
);

// AI機能用のテーブル
export const aiGenerations = sqliteTable("ai_generations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deckId: text("deck_id").references(() => decks.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["text", "pdf", "image"] }).notNull(),
  inputContent: text("input_content"),
  inputFileName: text("input_file_name"),
  cardsGenerated: integer("cards_generated").notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] })
    .default("pending")
    .notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => sql`(unixepoch() * 1000)`)
    .notNull(),
});
