import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/domain/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
});
