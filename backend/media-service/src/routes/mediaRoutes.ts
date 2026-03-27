import { Router } from "express";
import { upload } from "../middleware/upload";
import {
  uploadMedia,
  deleteMedia,
  getUserMedia,
} from "../controllers/mediaControllers";
import { authenticateRequest } from "../middleware/authenticate";

const router = Router();

router.post(
  "/upload",
  authenticateRequest,
  upload.array("media", 4),
  uploadMedia,
);
router.delete("/:id", authenticateRequest, deleteMedia);
router.get("/user", authenticateRequest, getUserMedia);

export default router;
