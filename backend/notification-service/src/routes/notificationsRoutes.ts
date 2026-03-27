import { Router } from "express";

import { authenticateRequest } from "../middleware/authenticate";
import { getNotifications } from "../controllers/notificationControllers";

const router = Router();

router.get("/notifications", authenticateRequest, getNotifications);

export default router;
