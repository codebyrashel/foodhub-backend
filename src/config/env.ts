import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export const env = envSchema.parse(process.env);