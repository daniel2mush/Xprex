import { Router } from "express";
import {
  clearSearchHistory,
  getSearchHistory,
  searchPosts,
  searchUsers,
} from "../controllers/searchControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();

router.get("/posts", authenticateRequest, searchPosts);
router.get("/users", authenticateRequest, searchUsers);
router.get("/history", authenticateRequest, getSearchHistory);
router.delete("/history", authenticateRequest, clearSearchHistory);

export default router;
