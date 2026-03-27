import cors from "cors";
import { env } from "../env";

const allowedOrigins = env.CORS_ORIGINS.split(",").map((origin) =>
  origin.trim(),
);

export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS policy: origin not allowed"));
  },
  methods: ["GET", "POST"],
  credentials: true,
});
