import express from "express";
import { chat, deleteChat, getChat } from "../controllers/chat.controllers.js";

const router = express.Router();

router.post("/chat", chat);
router.get("/chat/history/:sessionId", getChat);
router.delete("/chat/history/:sessionId", deleteChat);

export default router;
