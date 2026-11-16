import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Role } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      session?: Awaited<ReturnType<typeof auth.api.getSession>>;
    }
  }
}

export const requireSession: RequestHandler = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if ((session.user as { isActive?: boolean }).isActive === false) {
      res.status(403).json({ error: "This account has been deactivated" });
      return;
    }
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    const role = (req.session?.user as { role?: Role } | undefined)?.role;
    const matches = role && roles.some((expected) => role === expected ||
      ((role === "admin" || role === "faculty_admin") &&
        (expected === "admin" || expected === "faculty_admin")));
    if (!matches) {
      res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}
