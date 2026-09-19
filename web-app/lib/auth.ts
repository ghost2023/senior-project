import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

// Roles line up with req.md's three human actors. The fourth actor (the
// Risk Identifier / Predictive Component) is the ML service, not a login
// role — it authenticates via ML_SERVICE_TOKEN, not better-auth.
//
// We deliberately skip the built-in `admin` plugin: its "role" concept is
// about site-admin/ban/impersonation permissions, not our 3-way domain RBAC
// (Student/Teacher/Faculty Administrator). A plain additional field plus our
// own lib/permissions.ts guard is a better fit for "minimal" scope.
export const ROLES = ["student", "teacher", "faculty_admin", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  // Business rule #7 (SEC-07): 30-minute inactivity timeout.
  session: {
    expiresIn: 60 * 30,
    updateAge: 60 * 5,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: false, // never client-settable — role is assigned server-side only (rule #2/#3)
      },
      // rule #4: inactive accounts are disabled, not deleted (A-04).
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
    },
  },
  // Must be last per better-auth's convention — lets server actions set
  // auth cookies via next/headers.
  plugins: [nextCookies()],
});
