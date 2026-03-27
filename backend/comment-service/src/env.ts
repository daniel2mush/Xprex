import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4005),
  JWT_SECRET: z.string().min(32),
  RABBITMQ_URL: z.string().url(),
  CORS_ORIGINS: z.url(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid env:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
