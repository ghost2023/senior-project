import express from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { config } from "./config.js";
import { auth } from "./auth.js";
import { apiRouter } from "./routes.js";
import { dataRouter } from "./routes/data.js";
import { mutationRouter } from "./routes/mutations.js";
import { predictionsRouter } from "./routes/predictions.js";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use("/api/v1", apiRouter);
app.use("/api/v1", dataRouter);
app.use("/api/v1", mutationRouter);
app.use("/api/v1", predictionsRouter);
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});
