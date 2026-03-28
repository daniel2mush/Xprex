import express from "express";
import { authenticateRequest } from "../middleware/authenticate";
import { sensitiveRateLimiter } from "../middleware/rateLimiter";
import {
  deleteAccount,
  login,
  logout,
  refreshToken,
  registration,
  updateAccountSecurity,
  updateProfile,
} from "../controllers/auth-controllers";

const router = express.Router();

router.use(sensitiveRateLimiter);

router.post("/register", registration);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.patch("/profile/edit", authenticateRequest, updateProfile);
router.patch("/profile/security", authenticateRequest, updateAccountSecurity);
router.delete("/profile/delete", authenticateRequest, deleteAccount);

export default router;
