import express from "express";
import { chat, deleteChat, getChat } from "../controllers/chat.controllers.js";

const router = express.Router();

router.post("/", chat);
router.get("/:sessionId", getChat);
router.delete("/:sessionId", deleteChat);

export default router;
