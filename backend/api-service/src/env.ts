import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  AUTH_SERVICE: z.string().url("AUTH_SERVICE must be a valid URL"),
  POST_SERVICE: z.string().url("POST_SERVICE must be a valid URL"),
  SEARCH_SERVICE: z.string().url("SEARCH_SERVICE must be a valid URL"),
  MEDIA_SERVICE: z.string().url("MEDIA_SERVICE must be a valid URL"),
  COMMENT_SERVICE: z.string().url("MEDIA_SERVICE must be a valid URL"),
  NOTIFICATION_SERVICE: z.string().url("MEDIA_SERVICE must be a valid URL"),
  MESSAGING_SERVICE: z.string().url("MESSAGING_SERVICE must be a valid URL"),
  CORS_ORIGINS: z.string().min(1, "CORS_ORIGINS is required"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
