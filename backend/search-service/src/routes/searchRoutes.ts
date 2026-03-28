import { Router } from "express";
import {
  clearSearchHistory,
  getTrendingDiscovery,
  getSearchHistory,
  searchPosts,
  searchUsers,
} from "../controllers/searchControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();

router.get("/posts", authenticateRequest, searchPosts);
router.get("/users", authenticateRequest, searchUsers);
router.get("/history", authenticateRequest, getSearchHistory);
router.get("/trending", authenticateRequest, getTrendingDiscovery);
router.delete("/history", authenticateRequest, clearSearchHistory);

export default router;
