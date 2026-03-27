import { Router } from "express";
import {
  createComment,
  deleteComment,
  getComments,
  getReplies,
} from "../controllers/commentControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();

router.post("/comments/posts/:id/comments", authenticateRequest, createComment);
router.get("/comments/posts/:id/comments", authenticateRequest, getComments);
router.get("/comments/:id/replies", authenticateRequest, getReplies);
router.delete("/comments/:id", authenticateRequest, deleteComment);

export default router;
