import { Router } from "express";
import {
  getConversationById,
  getConversations,
  getMessagingStatus,
} from "../controllers/messagingControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();

router.get("/status", getMessagingStatus);
router.get("/conversations", authenticateRequest, getConversations);
router.get("/conversations/:id", authenticateRequest, getConversationById);

export default router;
