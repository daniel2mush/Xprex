import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Validates that it's a properly formatted URL
  DATABASE_URL: z.string().url(),

  // Ensures a minimum length for security
  JWT_SECRET: z.string().min(32),

  // process.env values are strings; .coerce converts "3000" -> 3000
  PORT: z.coerce.number().default(4001),

  CORS_ORIGINS: z.string(),
  CORS_ORIGINS_TEST: z.string().optional(),

  REDIS_URL: z.string().url(),

  // Bonus: Add a check for the environment
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

// .safeParse won't throw an error immediately, allowing for custom logging
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1); // Stop the app if config is broken
}

// Export the validated data with automatic type inference
export const env = parsed.data;

// // Export the Type itself for use elsewhere in your app
// export type Env = z.infer<typeof envSchema>;
