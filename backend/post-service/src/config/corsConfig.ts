import("dotenv/config");
import cors from "cors";
import { Env } from "../env";

// const allowedOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGINS_TEST|| "http://localhost:4001";
const allowedOrigins2 = [`${Env.CORS_ORIGINS}}`];
export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins2.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Policy: Origins not allowed"));
    }
  },
  methods: "GET, POST, PUT, DELETE",
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept-Version",
    "x-user-id",
  ],
  exposedHeaders: ["Content-Type", "Authorization", "x-user-id"],
  credentials: true,
  maxAge: 24 * 60 * 60,
  optionsSuccessStatus: 204,
  preflightContinue: false,
});
