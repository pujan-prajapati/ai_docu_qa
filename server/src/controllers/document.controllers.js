import express from "express";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import asyncHandler from "express-async-handler";
import { Document } from "../models/document.model.js";

// upload document
export const uploadDocument = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  let content = "";
  const filePath = req.file.path;

  // parse file content based on type
  if (req.file.mimetype === "application/pdf") {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      content = parsed.text;
    } finally {
      await parser.destroy();
    }
  } else {
    content = fs.readFileSync(filePath, "utf-8");
  }

  // clean up the text - remove excessive whitespace
  content = content.replace(/\s+/g, " ").trim();

  if (!content) {
    return res
      .status(400)
      .json({ error: "Failed to extract content from the document" });
  }

  //   Delete old document for this sesion if exists
  //  so user can re-upload without duplicates
  await Document.findOneAndDelete({ sessionId });

  //   save to database
  const doc = await Document.create({
    sessionId,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    content,
    characters: content.length,
    size: req.file.size,
  });

  //   clean up uploaded file from disk - we have it in DB now
  fs.unlinkSync(filePath);

  res.json({
    message: "Document uploaded and processed successfully",
    documentId: doc._id,
    originalName: doc.originalName,
    characters: doc.characters,
  });
});

// get document with session id
export const checkDocument = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const doc = await Document.findOne(
    { sessionId },
    "originalName characters createdAt",
  );

  doc
    ? res.json({ hasDocument: true, document: doc })
    : res.json({ hasDocument: false });
});
