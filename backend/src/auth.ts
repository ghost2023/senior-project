import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import { config } from "./config.js";

export const ROLES = ["student", "teacher", "faculty_admin", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,
  trustedOrigins: [config.FRONTEND_URL],
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 30, updateAge: 60 * 5 },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "student", input: false },
      isActive: { type: "boolean", required: true, defaultValue: true, input: false },
    },
  },
});
