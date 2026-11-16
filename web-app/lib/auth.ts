export const ROLES = ["student", "teacher", "faculty_admin", "admin"] as const;
export type Role = (typeof ROLES)[number];
