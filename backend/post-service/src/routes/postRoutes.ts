import { Router } from "express";
import { sensitiveRateLimiter } from "../middleware/rateLimiter";
import {
  CreatePost,
  DeletePost,
  GetAllPosts,
  GetBookmarkedPosts,
  GetUserConnections,
  GetSinglePost,
  GetUserProfile,
  ToggleFollowUser,
  TogglePostBookmark,
  TogglePostLike,
  TogglePostRepost,
  UpdatePost,
} from "../controllers/postControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();
router.use(sensitiveRateLimiter);

router.post("/create", authenticateRequest, CreatePost);
router.get("/all", authenticateRequest, GetAllPosts);
router.get("/bookmarks", authenticateRequest, GetBookmarkedPosts);
router.get("/profile/:userId", authenticateRequest, GetUserProfile);
router.get("/profile/:userId/connections", authenticateRequest, GetUserConnections);
router.post("/follow/:userId", authenticateRequest, ToggleFollowUser);
router.patch("/:id/like", authenticateRequest, TogglePostLike);
router.patch("/:id/bookmark", authenticateRequest, TogglePostBookmark);
router.patch("/:id/repost", authenticateRequest, TogglePostRepost);
router.get("/:id", authenticateRequest, GetSinglePost);
router.put("/update/:id", authenticateRequest, UpdatePost);
router.delete("/delete/:id", authenticateRequest, DeletePost);

export default router;
