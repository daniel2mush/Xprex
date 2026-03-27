import express from "express";
import { sensitiveRateLimiter } from "../middleware/rateLimiter";
import {
  login,
  logout,
  refreshToken,
  registration,
} from "../controllers/auth-controllers";

const router = express.Router();

router.use(sensitiveRateLimiter);

router.post("/register", registration);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
