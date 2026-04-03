import express from "express";
import { upload } from "../middleware/upload.middleware.js";
import {
  checkDocument,
  uploadDocument,
} from "../controllers/document.controllers.js";

const router = express.Router();

router.post("/document/upload", upload.single("file"), uploadDocument);
router.get("/document/:sessionId", checkDocument);

export default router;
