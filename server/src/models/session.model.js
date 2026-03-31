import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: [true, "Role is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
  },
  {
    timestamps: true,
  },
);

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
    },
    persona: {
      type: String,
      default: "default",
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  },
);

//Export the model
export const Session = mongoose.model("Session", sessionSchema);
