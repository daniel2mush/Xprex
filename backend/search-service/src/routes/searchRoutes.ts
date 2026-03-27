import { Router } from "express";
import { searchPosts } from "../controllers/searchControllers";

const router = Router();

router.get("/posts", searchPosts);

export default router;
