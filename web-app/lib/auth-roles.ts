import { adminAc, userAc } from "better-auth/plugins/admin/access";

/**
 * Better Auth's admin plugin requires every role name to map to a Role
 * object. We're not defining granular per-resource permissions yet — just
 * reusing the plugin's built-in "full admin-plugin access" (adminAc) vs
 * "none" (userAc) sets under our own role names.
 */
export const roles = {
  "faculty-admin": adminAc,
  teacher: userAc,
  student: userAc,
};
