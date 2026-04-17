import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    chunkIndex: {
      type: Number,
    },
    wordCount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

export const Chunk = mongoose.model("Chunk", chunkSchema);
