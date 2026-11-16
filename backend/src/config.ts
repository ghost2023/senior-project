import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  ML_SERVICE_URL: z.string().url().optional(),
  ML_SERVICE_TOKEN: z.string().optional(),
});

export const config = envSchema.parse(process.env);
