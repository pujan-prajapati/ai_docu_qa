import express from "express";
import { Session } from "../models/session.model.js";
import { Document } from "../models/document.model.js";
import { prompts } from "../systemPrompts/prompts.js";
import asyncHandler from "express-async-handler";
import Groq from "groq-sdk";

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
    //    load document for this session
    const doc = await Document.findOne({ sessionId });
    if (!doc) {
      return res
        .status(404)
        .json({ error: "Document not found. Please upload a file first." });
    }

    // load chat history from mongodb
    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = await Session.create({ sessionId, persona, messages: [] });
    }

    // sliding window - last 20 messages only
    const history = session.messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // build system prompt with document injected
    const promptFn = prompts[persona] || prompts["default"];
    const systemPrompt = promptFn(doc.content);

    // set SEE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // stream from open router
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
