import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";

import { db } from "./db";
import * as schema from "./db/schema";
import { roles } from "./auth-roles";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    username(),
    admin({
      roles,
      // "faculty-admin" is this app's admin role — teacher/student get no
      // special admin-plugin privileges (ban, impersonate, etc).
      adminRoles: ["faculty-admin"],
    }),
  ],
});
