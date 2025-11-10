import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users, decks } from "../drizzle-schema";

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

export const rankings = sqliteTable("rankings", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  rank: integer("rank").notNull(),
}, (table) => ({
    pk: primaryKey(table.userId)
}));
