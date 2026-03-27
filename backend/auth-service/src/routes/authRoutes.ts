import express from "express";
import { authenticateRequest } from "../middleware/authenticate";
import { sensitiveRateLimiter } from "../middleware/rateLimiter";
import {
  login,
  logout,
  refreshToken,
  registration,
  updateProfile,
} from "../controllers/auth-controllers";

const router = express.Router();

router.use(sensitiveRateLimiter);

router.post("/register", registration);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.patch("/profile/edit", authenticateRequest, updateProfile);

export default router;
