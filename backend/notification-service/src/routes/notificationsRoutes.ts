import { Router } from "express";

import { authenticateRequest } from "../middleware/authenticate";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
} from "../controllers/notificationControllers";

const router = Router();

router.get("/notifications", authenticateRequest, getNotifications);
router.patch("/notifications/:id/read", authenticateRequest, markNotificationRead);
router.patch("/notifications/read-all", authenticateRequest, markAllRead);

export default router;
