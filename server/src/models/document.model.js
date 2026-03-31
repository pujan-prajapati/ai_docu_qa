import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
    },
    originalName: {
      type: String,
      required: [true, "Original name is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    characters: {
      type: Number,
    },
    size: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

//Export the model
export const Document = mongoose.model("Document", documentSchema);
