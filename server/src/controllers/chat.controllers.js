import { Session } from "../models/session.model.js";
import { Document } from "../models/document.model.js";
import { prompts } from "../systemPrompts/prompts.js";
import asyncHandler from "express-async-handler";
import Groq from "groq-sdk";
import { retriever } from "../services/retriever.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// chat
export const chat = asyncHandler(async (req, res) => {
  const { message, sessionId, persona = "default" } = req.body;

  if (!message || !sessionId) {
    return res
      .status(400)
      .json({ error: "Message and sessionId are required" });
  }

  try {
    // 1. Check document exists
    const doc = await Document.findOne({ sessionId });
    if (!doc) {
      return res
        .status(404)
        .json({ error: "Document not found. Please upload a file first." });
    }

    // 2. RAG - find relevant chunks instead of sending full document
    const relevantChunks = await retriever.findRelevantChunks(
      message,
      sessionId,
      4,
    );

    // 3. Build context string from top chunks
    const context = relevantChunks
      .map((chunk, i) => `[Excerpt ${i + 1}]:\n${chunk.text}`)
      .join("\n\n");

    // 4. Build system prompt with ONLY relevant context (not full doc)
    const promptFn = prompts[persona] || prompts.default;
    const systemPrompt = promptFn(context);

    // 5. Load chat history
    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = await Session.create({ sessionId, persona, messages: [] });
    }

    // sliding window - last 20 messages only
    const history = session.messages.slice(-5).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 6. stream response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // stream from groq
    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      stream: true,
    });

    let fullReply = "";

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullReply += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    // 7. Persist to mongoDB
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: message },
              { role: "assistant", content: fullReply },
            ],
          },
        },
        updatedAt: new Date(),
        persona,
      },
      {
        upsert: true,
      },
    );

    res.write(`data: ${JSON.stringify({ token: "[DONE]" })}\n\n`);
    res.end();
  } catch (error) {
    console.error(error);
    res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
    res.end();
  }
});

// get chat history for a session
export const getChat = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findOne({ sessionId });
  session
    ? res.json({ messages: session.messages, persona: session.persona })
    : res.json({ messages: [] });
});

// delete chat history for a session
export const deleteChat = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  await Session.findOneAndDelete({ sessionId });
  res.json({ message: "Session Cleared" });
});
