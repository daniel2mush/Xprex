import("dotenv/config");
import cors from "cors";

// const allowedOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGINS_TEST|| "http://localhost:4001";
const allowedOrigins2 = [
  `${process.env.CORS_ORIGINS}, ${process.env.CORS_ORIGINS_TEST}, ${"http://localhost:4001"}`,
];
export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins2.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Policy: Origins not allowed"));
    }
  },
  methods: "GET, POST, PUT, DELETE",
  allowedHeaders: ["Content-Type", "Authorization", "Accept-Version"],
  exposedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 24 * 60 * 60,
  optionsSuccessStatus: 204,
  preflightContinue: false,
});
