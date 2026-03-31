import express from "express";
import "dotenv/config";
import cors from "cors";
import documentRouter from "./routes/document.routes.js";
import chatRouter from "./routes/chat.routes.js";
import { connectDB } from "./config/db.config.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  }),
);
app.use(express.json());

app.use("/api/documents", documentRouter);
app.use("/api/chat", chatRouter);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Conenction Failed : ", error);
  });
