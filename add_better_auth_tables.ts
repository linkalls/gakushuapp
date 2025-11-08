// Better Auth requires these tables:
// - session
// - account
// - verification

// Add them to our Drizzle schema
const betterAuthTables = `
// Better Auth tables
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires_at: integer("expires_at", { mode: "number" }).notNull(),
  created_at: integer("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  userIdIdx: index("idx_session_user_id").on(table.user_id),
}));

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  account_id: text("account_id").notNull(),
  provider_id: text("provider_id").notNull(),
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  expires_at: integer("expires_at", { mode: "number" }),
  created_at: integer("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  userIdIdx: index("idx_account_user_id").on(table.user_id),
}));

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expires_at: integer("expires_at", { mode: "number" }).notNull(),
  created_at: integer("created_at", { mode: "number" }).notNull(),
});

// Export types
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
`;

console.log(betterAuthTables);
