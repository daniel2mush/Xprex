import * as dotenv from "dotenv";
dotenv.config();
import z from "zod";

const _env = z.object({
  PORT: z.string(),
  CORS_ORIGINS: z.url(),
});

const parsed = _env.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1);
}

export const Env = parsed.data;
