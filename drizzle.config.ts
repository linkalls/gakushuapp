import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/drizzle-schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/gakushukun.db",
  },
} satisfies Config;
