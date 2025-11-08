import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/drizzle-schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/gakushu.db",
  },
});
