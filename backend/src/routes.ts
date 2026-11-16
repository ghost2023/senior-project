import { Router } from "express";
import { requireSession } from "./http.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "satps-backend" });
});

apiRouter.get("/session", requireSession, (req, res) => {
  res.json({ session: req.session });
});

