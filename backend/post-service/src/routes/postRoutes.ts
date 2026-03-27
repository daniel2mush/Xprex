import { Router } from "express";
import { sensitiveRateLimiter } from "../middleware/rateLimiter";
import {
  CreatePost,
  DeletePost,
  GetAllPosts,
  GetSinglePost,
  UpdatePost,
} from "../controllers/postControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();
router.use(sensitiveRateLimiter);

router.post("/create", authenticateRequest, CreatePost);
router.get("/all", authenticateRequest, GetAllPosts);
router.get("/:id", authenticateRequest, GetSinglePost);
router.put("/update/:id", authenticateRequest, UpdatePost);
router.delete("/delete/:id", authenticateRequest, DeletePost);

export default router;
