export const ROLES = ["faculty-admin", "teacher", "student"] as const;

export type Role = (typeof ROLES)[number];
