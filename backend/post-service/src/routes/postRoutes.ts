import { Router } from "express";
import { sensitiveRateLimiter } from "../middleware/rateLimiter";
import {
  CreatePost,
  DeletePost,
  GetAllPosts,
  GetUserConnections,
  GetSinglePost,
  GetUserProfile,
  ToggleFollowUser,
  TogglePostLike,
  UpdatePost,
} from "../controllers/postControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();
router.use(sensitiveRateLimiter);

router.post("/create", authenticateRequest, CreatePost);
router.get("/all", authenticateRequest, GetAllPosts);
router.get("/profile/:userId", authenticateRequest, GetUserProfile);
router.get("/profile/:userId/connections", authenticateRequest, GetUserConnections);
router.post("/follow/:userId", authenticateRequest, ToggleFollowUser);
router.patch("/:id/like", authenticateRequest, TogglePostLike);
router.get("/:id", authenticateRequest, GetSinglePost);
router.put("/update/:id", authenticateRequest, UpdatePost);
router.delete("/delete/:id", authenticateRequest, DeletePost);

export default router;
